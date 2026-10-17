import uuid
from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), default="user")  # 'admin' or 'user'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    stores = db.relationship("Store", backref="owner", lazy=True, cascade="all, delete-orphan")
    limits = db.relationship("SystemLimit", backref="user", uselist=False, lazy=True, cascade="all, delete-orphan")

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "role": self.role,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "limits": self.limits.to_dict() if self.limits else None,
            "stores_count": len(self.stores)
        }


class SystemLimit(db.Model):
    __tablename__ = "system_limits"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, unique=True)
    max_stores = db.Column(db.Integer, default=5)
    max_storage_per_store_gb = db.Column(db.Integer, default=5)
    max_memory_per_store_mb = db.Column(db.Integer, default=2048)
    max_cpu_cores_per_store = db.Column(db.Float, default=2.0)

    def to_dict(self):
        return {
            "max_stores": self.max_stores,
            "max_storage_per_store_gb": self.max_storage_per_store_gb,
            "max_memory_per_store_mb": self.max_memory_per_store_mb,
            "max_cpu_cores_per_store": self.max_cpu_cores_per_store
        }


class Store(db.Model):
    __tablename__ = "stores"

    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    name = db.Column(db.String(100), nullable=False)
    slug = db.Column(db.String(60), unique=True, nullable=False, index=True)
    namespace = db.Column(db.String(70), unique=True, nullable=False, index=True)
    domain = db.Column(db.String(150), nullable=False)
    
    # Status: PROVISIONING, RUNNING, DEGRADED, FAILED, DELETING
    status = db.Column(db.String(30), default="PROVISIONING", nullable=False)
    status_message = db.Column(db.Text, default="Store creation queued")
    
    # Resources
    storage_gb = db.Column(db.Integer, default=2)
    memory_mb = db.Column(db.Integer, default=1024)
    cpu_cores = db.Column(db.Float, default=1.0)
    
    # Store credentials
    admin_username = db.Column(db.String(80), default="admin", nullable=False)
    admin_password = db.Column(db.String(100), nullable=False)
    admin_email = db.Column(db.String(120), nullable=False)
    db_password = db.Column(db.String(100), nullable=False)
    
    # Preset catalog
    catalog_preset = db.Column(db.String(50), default="electronics")
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def to_dict(self, include_credentials: bool = False):
        data = {
            "id": self.id,
            "name": self.name,
            "slug": self.slug,
            "namespace": self.namespace,
            "domain": self.domain,
            "status": self.status,
            "status_message": self.status_message,
            "storage_gb": self.storage_gb,
            "memory_mb": self.memory_mb,
            "cpu_cores": self.cpu_cores,
            "catalog_preset": self.catalog_preset,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "store_url": f"http://{self.domain}",
            "admin_url": f"http://{self.domain}/wp-admin",
        }
        if include_credentials:
            data["admin_username"] = self.admin_username
            data["admin_password"] = self.admin_password
            data["admin_email"] = self.admin_email
        return data
