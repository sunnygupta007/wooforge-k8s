import os
import re
import secrets
import string
import threading
import time
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    jwt_required,
    create_access_token,
    get_jwt_identity
)

from config import Config
from models import db, User, Store, SystemLimit
from auth import jwt, authenticate_user, get_current_user
from catalog_presets import CATALOG_PRESETS
from k8s_client import k8s_orchestrator

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("wooforge")

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for React frontend
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    db.init_app(app)
    jwt.init_app(app)

    # --- Helper Functions ---
    def generate_random_password(length=14):
        chars = string.ascii_letters + string.digits
        return "".join(secrets.choice(chars) for _ in range(length))

    def slugify(text):
        text = text.lower().strip()
        text = re.sub(r"[^\w\s-]", "", text)
        return re.sub(r"[-\s]+", "-", text)[:40]

    # --- Database Initialization & Seeding ---
    with app.app_context():
        db.create_all()
        # Create default demo admin if not present
        if not User.query.filter_by(username="admin").first():
            admin_user = User(username="admin", email="admin@wooforge.local", role="admin")
            admin_user.set_password("admin123")
            db.session.add(admin_user)
            db.session.commit()

            admin_limits = SystemLimit(
                user_id=admin_user.id,
                max_stores=10,
                max_storage_per_store_gb=10,
                max_memory_per_store_mb=4096,
                max_cpu_cores_per_store=4.0
            )
            db.session.add(admin_limits)
            db.session.commit()
            logger.info("Initialized default admin user (admin / admin123)")

    # --- Background Status Poller ---
    def poll_k8s_statuses():
        """Periodically sync active store statuses from Kubernetes into SQLite."""
        while True:
            time.sleep(6)
            try:
                with app.app_context():
                    stores = Store.query.filter(Store.status.in_(["PROVISIONING", "RUNNING", "DEGRADED"])).all()
                    for store in stores:
                        status_info = k8s_orchestrator.get_store_status(store.namespace)
                        new_status = status_info.get("status")
                        new_msg = status_info.get("message", "")
                        
                        if new_status and new_status != "UNKNOWN":
                            if new_status == "DELETED" and store.status == "DELETING":
                                db.session.delete(store)
                            else:
                                store.status = new_status
                                store.status_message = new_msg
                    db.session.commit()
            except Exception as e:
                logger.debug(f"Status poller notice: {e}")

    poller_thread = threading.Thread(target=poll_k8s_statuses, daemon=True)
    poller_thread.start()

    # --- Authentication Routes ---
    @app.route("/api/auth/register", methods=["POST"])
    def register():
        data = request.get_json() or {}
        username = data.get("username", "").strip()
        email = data.get("email", "").strip()
        password = data.get("password", "")

        if not username or not email or not password:
            return jsonify({"error": "Username, email, and password are required"}), 400

        if User.query.filter_by(username=username).first():
            return jsonify({"error": "Username already exists"}), 409

        if User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already exists"}), 409

        user = User(username=username, email=email, role="user")
        user.set_password(password)
        db.session.add(user)
        db.session.commit()

        # Assign default limits
        limits = SystemLimit(
            user_id=user.id,
            max_stores=Config.DEFAULT_MAX_STORES,
            max_storage_per_store_gb=Config.DEFAULT_STORAGE_GB,
            max_memory_per_store_mb=Config.DEFAULT_MEMORY_MB,
            max_cpu_cores_per_store=Config.DEFAULT_CPU_CORES
        )
        db.session.add(limits)
        db.session.commit()

        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "User registered successfully",
            "token": access_token,
            "user": user.to_dict()
        }), 201

    @app.route("/api/auth/login", methods=["POST"])
    def login():
        data = request.get_json() or {}
        login_id = data.get("username_or_email", "").strip()
        password = data.get("password", "")

        if not login_id or not password:
            return jsonify({"error": "Missing login credentials"}), 400

        user = authenticate_user(login_id, password)
        if not user:
            return jsonify({"error": "Invalid username/email or password"}), 401

        access_token = create_access_token(identity=str(user.id))
        return jsonify({
            "message": "Login successful",
            "token": access_token,
            "user": user.to_dict()
        }), 200

    @app.route("/api/auth/me", methods=["GET"])
    @jwt_required()
    def get_profile():
        user = get_current_user()
        if not user:
            return jsonify({"error": "User not found"}), 404
        return jsonify(user.to_dict()), 200

    # --- Store Management Routes ---
    @app.route("/api/stores", methods=["GET"])
    @jwt_required()
    def list_stores():
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        if user.role == "admin":
            stores = Store.query.order_by(Store.created_at.desc()).all()
        else:
            stores = Store.query.filter_by(user_id=user.id).order_by(Store.created_at.desc()).all()

        return jsonify([s.to_dict(include_credentials=False) for s in stores]), 200

    @app.route("/api/stores", methods=["POST"])
    @jwt_required()
    def create_store():
        user = get_current_user()
        if not user:
            return jsonify({"error": "Unauthorized"}), 401

        # Check user store limit
        current_stores_count = Store.query.filter_by(user_id=user.id).count()
        user_max_stores = user.limits.max_stores if user.limits else Config.DEFAULT_MAX_STORES

        if current_stores_count >= user_max_stores:
            return jsonify({
                "error": f"Store limit reached ({current_stores_count}/{user_max_stores}). Upgrade limits to create more."
            }), 403

        data = request.get_json() or {}
        name = data.get("name", "").strip()
        custom_slug = data.get("slug", "").strip()
        storage_gb = int(data.get("storage_gb", Config.DEFAULT_STORAGE_GB))
        catalog_preset = data.get("catalog_preset", "electronics")
        admin_email = data.get("admin_email", user.email).strip()

        if not name:
            return jsonify({"error": "Store name is required"}), 400

        slug = slugify(custom_slug) if custom_slug else slugify(name)
        if not slug:
            slug = f"store-{secrets.token_hex(3)}"

        # Ensure slug uniqueness
        if Store.query.filter_by(slug=slug).first():
            slug = f"{slug}-{secrets.token_hex(2)}"

        namespace = f"woo-{slug}"
        base_domain = Config.BASE_DOMAIN
        domain = f"{slug}.{base_domain}"

        # Generate credentials
        admin_username = data.get("admin_username", "admin").strip() or "admin"
        admin_password = data.get("admin_password") or generate_random_password(16)
        db_password = generate_random_password(20)

        # Enforce storage limits
        max_storage = user.limits.max_storage_per_store_gb if user.limits else 5
        storage_gb = min(max(storage_gb, 1), max_storage)

        new_store = Store(
            user_id=user.id,
            name=name,
            slug=slug,
            namespace=namespace,
            domain=domain,
            status="PROVISIONING",
            status_message="Provisioning Kubernetes Namespace and components...",
            storage_gb=storage_gb,
            memory_mb=user.limits.max_memory_per_store_mb if user.limits else 1024,
            cpu_cores=user.limits.max_cpu_cores_per_store if user.limits else 1.0,
            admin_username=admin_username,
            admin_password=admin_password,
            admin_email=admin_email,
            db_password=db_password,
            catalog_preset=catalog_preset
        )

        db.session.add(new_store)
        db.session.commit()

        # Launch provisioning in background thread to avoid blocking HTTP response
        store_dict = {
            "id": new_store.id,
            "name": new_store.name,
            "slug": new_store.slug,
            "namespace": new_store.namespace,
            "domain": new_store.domain,
            "storage_gb": new_store.storage_gb,
            "memory_mb": new_store.memory_mb,
            "cpu_cores": new_store.cpu_cores,
            "admin_username": new_store.admin_username,
            "admin_password": new_store.admin_password,
            "admin_email": new_store.admin_email,
            "db_password": new_store.db_password,
            "catalog_preset": new_store.catalog_preset,
        }

        def provision_async(s_dict):
            try:
                k8s_orchestrator.provision_store(s_dict)
            except Exception as ex:
                logger.error(f"Async provisioning failed: {ex}")
                with app.app_context():
                    s = Store.query.get(s_dict["id"])
                    if s:
                        s.status = "FAILED"
                        s.status_message = str(ex)
                        db.session.commit()

        thread = threading.Thread(target=provision_async, args=(store_dict,))
        thread.start()

        return jsonify({
            "message": "Store provisioning initiated",
            "store": new_store.to_dict(include_credentials=True)
        }), 201

    @app.route("/api/stores/<store_id>", methods=["GET"])
    @jwt_required()
    def get_store(store_id):
        user = get_current_user()
        store = Store.query.get(store_id)

        if not store:
            return jsonify({"error": "Store not found"}), 404

        if user.role != "admin" and store.user_id != user.id:
            return jsonify({"error": "Access denied"}), 403

        # Fetch live K8s pod information
        k8s_status = k8s_orchestrator.get_store_status(store.namespace)
        
        response_data = store.to_dict(include_credentials=True)
        response_data["k8s_details"] = k8s_status
        return jsonify(response_data), 200

    @app.route("/api/stores/<store_id>/status", methods=["GET"])
    @jwt_required()
    def get_store_status_poll(store_id):
        """Lightweight live endpoint for polling UI."""
        user = get_current_user()
        store = Store.query.get(store_id)

        if not store:
            return jsonify({"error": "Store not found"}), 404

        if user.role != "admin" and store.user_id != user.id:
            return jsonify({"error": "Access denied"}), 403

        k8s_status = k8s_orchestrator.get_store_status(store.namespace)
        if k8s_status.get("status") and k8s_status.get("status") != "UNKNOWN":
            store.status = k8s_status["status"]
            store.status_message = k8s_status.get("message", "")
            db.session.commit()

        return jsonify({
            "id": store.id,
            "status": store.status,
            "status_message": store.status_message,
            "updated_at": store.updated_at.isoformat() if store.updated_at else None,
            "pods": k8s_status.get("pods", [])
        }), 200

    @app.route("/api/stores/<store_id>", methods=["DELETE"])
    @jwt_required()
    def delete_store(store_id):
        user = get_current_user()
        store = Store.query.get(store_id)

        if not store:
            return jsonify({"error": "Store not found"}), 404

        if user.role != "admin" and store.user_id != user.id:
            return jsonify({"error": "Access denied"}), 403

        namespace_to_delete = store.namespace
        store.status = "DELETING"
        store.status_message = "Terminating Kubernetes namespace and storage volumes..."
        db.session.commit()

        def delete_async(ns, s_id):
            try:
                k8s_orchestrator.delete_store(ns)
                # Wait briefly and clean from SQLite
                time.sleep(3)
                with app.app_context():
                    s = Store.query.get(s_id)
                    if s:
                        db.session.delete(s)
                        db.session.commit()
                        logger.info(f"Store {s_id} deleted successfully.")
            except Exception as ex:
                logger.error(f"Deletion error for {ns}: {ex}")

        thread = threading.Thread(target=delete_async, args=(namespace_to_delete, store.id))
        thread.start()

        return jsonify({"message": f"Teardown started for store {store.name}"}), 200

    # --- Presets & System Metadata Routes ---
    @app.route("/api/presets", methods=["GET"])
    def list_presets():
        return jsonify(CATALOG_PRESETS), 200

    @app.route("/api/system/limits", methods=["GET"])
    @jwt_required()
    def get_system_limits():
        user = get_current_user()
        active_stores = Store.query.filter_by(user_id=user.id).all()
        total_storage_allocated = sum(s.storage_gb for s in active_stores)
        total_memory_allocated = sum(s.memory_mb for s in active_stores)

        user_limits = user.limits.to_dict() if user.limits else {
            "max_stores": Config.DEFAULT_MAX_STORES,
            "max_storage_per_store_gb": Config.DEFAULT_STORAGE_GB,
            "max_memory_per_store_mb": Config.DEFAULT_MEMORY_MB,
            "max_cpu_cores_per_store": Config.DEFAULT_CPU_CORES
        }

        return jsonify({
            "limits": user_limits,
            "usage": {
                "active_stores": len(active_stores),
                "total_storage_gb": total_storage_allocated,
                "total_memory_mb": total_memory_allocated
            }
        }), 200

    @app.route("/api/system/cluster", methods=["GET"])
    def get_cluster_status():
        stats = k8s_orchestrator.get_cluster_stats()
        return jsonify(stats), 200

    @app.route("/api/health", methods=["GET"])
    def health_check():
        return jsonify({"status": "healthy", "service": "wooforge-api"}), 200

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.getenv("PORT", 5000))
    app.run(host="0.0.0.0", port=port, debug=False)
