import os
import yaml
import logging
from pathlib import Path
from jinja2 import Environment, FileSystemLoader
from kubernetes import client, config
from kubernetes.client.rest import ApiException
from config import Config
from catalog_presets import generate_wp_catalog_cli_commands

logger = logging.getLogger(__name__)

class K8sOrchestrator:
    def __init__(self):
        self.is_connected = False
        self.api_client = None
        self.core_v1 = None
        self.apps_v1 = None
        self.networking_v1 = None
        
        template_dir = Path(__file__).resolve().parent / "templates"
        self.jinja_env = Environment(loader=FileSystemLoader(str(template_dir)))
        self._initialize_client()

    def _initialize_client(self):
        try:
            if Config.K8S_AUTH_MODE == "incluster":
                config.load_incluster_config()
                logger.info("Loaded in-cluster Kubernetes configuration.")
            else:
                config_path = Config.KUBECONFIG_PATH
                if os.path.exists(config_path):
                    config.load_kube_config(config_file=config_path)
                    logger.info(f"Loaded kubeconfig from {config_path}")
                else:
                    # Fallback to default search
                    config.load_kube_config()
                    logger.info("Loaded default kubeconfig.")
            
            self.api_client = client.ApiClient()
            self.core_v1 = client.CoreV1Api(self.api_client)
            self.apps_v1 = client.AppsV1Api(self.api_client)
            self.networking_v1 = client.NetworkingV1Api(self.api_client)
            self.is_connected = True
        except Exception as e:
            logger.warning(f"Could not initialize Kubernetes client: {e}. Running in standalone/mock mode.")
            self.is_connected = False

    def render_manifests(self, store_data: dict) -> str:
        """Render Jinja2 template with tenant store parameters."""
        template = self.jinja_env.get_template("store_template.yaml.j2")
        
        catalog_preset = store_data.get("catalog_preset", "electronics")
        catalog_script = generate_wp_catalog_cli_commands(catalog_preset)
        
        context = {
            "store_id": store_data["id"],
            "name": store_data["name"],
            "slug": store_data["slug"],
            "namespace": store_data["namespace"],
            "domain": store_data["domain"],
            "storage_gb": store_data.get("storage_gb", Config.DEFAULT_STORAGE_GB),
            "memory_mb": store_data.get("memory_mb", Config.DEFAULT_MEMORY_MB),
            "cpu_cores": store_data.get("cpu_cores", Config.DEFAULT_CPU_CORES),
            "admin_username": store_data.get("admin_username", "admin"),
            "admin_password": store_data["admin_password"],
            "admin_email": store_data["admin_email"],
            "db_password": store_data["db_password"],
            "catalog_preset": catalog_preset,
            "catalog_cli_script": catalog_script,
            "ingress_class": Config.INGRESS_CLASS,
        }
        return template.render(context)

    def provision_store(self, store_data: dict) -> bool:
        """Applies rendered manifests to the Kubernetes cluster."""
        if not self.is_connected:
            logger.info(f"[SIMULATION] Provisioning store {store_data['slug']} (Kubernetes disconnected)")
            return True

        rendered_yaml = self.render_manifests(store_data)
        documents = list(yaml.safe_load_all(rendered_yaml))

        namespace = store_data["namespace"]

        for doc in documents:
            if not doc:
                continue
            kind = doc.get("kind")
            metadata = doc.get("metadata", {})
            name = metadata.get("name")

            try:
                if kind == "Namespace":
                    self.core_v1.create_namespace(body=doc)
                    logger.info(f"Created Namespace: {name}")

                elif kind == "ResourceQuota":
                    self.core_v1.create_namespaced_resource_quota(namespace=namespace, body=doc)
                    logger.info(f"Created ResourceQuota: {name}")

                elif kind == "Secret":
                    self.core_v1.create_namespaced_secret(namespace=namespace, body=doc)
                    logger.info(f"Created Secret: {name}")

                elif kind == "ConfigMap":
                    self.core_v1.create_namespaced_config_map(namespace=namespace, body=doc)
                    logger.info(f"Created ConfigMap: {name}")

                elif kind == "PersistentVolumeClaim":
                    self.core_v1.create_namespaced_persistent_volume_claim(namespace=namespace, body=doc)
                    logger.info(f"Created PVC: {name}")

                elif kind == "Deployment":
                    self.apps_v1.create_namespaced_deployment(namespace=namespace, body=doc)
                    logger.info(f"Created Deployment: {name}")

                elif kind == "Service":
                    self.core_v1.create_namespaced_service(namespace=namespace, body=doc)
                    logger.info(f"Created Service: {name}")

                elif kind == "Ingress":
                    self.networking_v1.create_namespaced_ingress(namespace=namespace, body=doc)
                    logger.info(f"Created Ingress: {name}")

            except ApiException as e:
                if e.status == 409:
                    logger.warning(f"Resource {kind}/{name} already exists in {namespace}, skipping.")
                else:
                    logger.error(f"Failed to create {kind}/{name} in {namespace}: {e}")
                    raise

        return True

    def delete_store(self, namespace: str) -> bool:
        """Deletes the entire store namespace, cascading deletion to all resources."""
        if not self.is_connected:
            logger.info(f"[SIMULATION] Deleting namespace {namespace} (Kubernetes disconnected)")
            return True

        try:
            self.core_v1.delete_namespace(name=namespace)
            logger.info(f"Triggered deletion for namespace: {namespace}")
            return True
        except ApiException as e:
            if e.status == 404:
                logger.info(f"Namespace {namespace} was already deleted.")
                return True
            logger.error(f"Error deleting namespace {namespace}: {e}")
            raise

    def get_store_status(self, namespace: str) -> dict:
        """Inspects Kubernetes Pods & Deployments to compute live store status."""
        if not self.is_connected:
            return {
                "status": "RUNNING",
                "message": "Cluster disconnected - Running in simulated state",
                "pods": []
            }

        try:
            # Check if namespace is active or terminating
            try:
                ns = self.core_v1.read_namespace(name=namespace)
                if ns.status.phase == "Terminating":
                    return {"status": "DELETING", "message": "Namespace terminating", "pods": []}
            except ApiException as e:
                if e.status == 404:
                    return {"status": "DELETED", "message": "Namespace not found", "pods": []}

            # List pods in namespace
            pod_list = self.core_v1.list_namespaced_pod(namespace=namespace)
            pods_info = []
            
            all_running = True
            init_running = False
            has_errors = False
            error_message = ""

            for pod in pod_list.items:
                pod_name = pod.metadata.name
                phase = pod.status.phase
                restarts = sum(cs.restart_count for cs in (pod.status.container_statuses or []))
                
                # Check init containers (wp-cli-init)
                init_statuses = pod.status.init_container_statuses or []
                for ic in init_statuses:
                    if ic.state.running:
                        init_running = True
                    elif ic.state.waiting:
                        init_running = True
                    elif ic.state.terminated and ic.state.terminated.exit_code != 0:
                        has_errors = True
                        error_message = f"Init container {ic.name} failed with code {ic.state.terminated.exit_code}"

                # Check main container statuses
                container_statuses = pod.status.container_statuses or []
                container_ready = all(cs.ready for cs in container_statuses) if container_statuses else False
                
                for cs in container_statuses:
                    if cs.state.waiting:
                        reason = cs.state.waiting.reason
                        if reason in ["CrashLoopBackOff", "ErrImagePull", "ImagePullBackOff"]:
                            has_errors = True
                            error_message = f"Container {cs.name}: {reason}"

                if not container_ready:
                    all_running = False

                pods_info.append({
                    "name": pod_name,
                    "phase": phase,
                    "ready": container_ready,
                    "restarts": restarts,
                    "ip": pod.status.pod_ip
                })

            if has_errors:
                status = "FAILED"
                msg = error_message or "One or more containers failed"
            elif init_running:
                status = "PROVISIONING"
                msg = "WP-CLI is initializing WordPress, WooCommerce and catalogs..."
            elif not pods_info:
                status = "PROVISIONING"
                msg = "Scheduling pods..."
            elif all_running:
                status = "RUNNING"
                msg = "All store components healthy and ready"
            else:
                status = "PROVISIONING"
                msg = "Containers are starting..."

            return {
                "status": status,
                "message": msg,
                "pods": pods_info
            }

        except ApiException as e:
            logger.error(f"Error fetching status for {namespace}: {e}")
            return {"status": "UNKNOWN", "message": str(e), "pods": []}

    def get_cluster_stats(self) -> dict:
        """Fetches high-level cluster metrics."""
        if not self.is_connected:
            return {
                "connected": False,
                "nodes": 0,
                "k8s_version": "Offline/Simulated",
                "total_namespaces": 0
            }

        try:
            nodes = self.core_v1.list_node().items
            namespaces = self.core_v1.list_namespace().items
            version = self.api_client.call_api('/version', 'GET', auth_settings=['BearerToken'], response_type='object')
            git_version = version[0].get('gitVersion', 'v1.28+') if isinstance(version[0], dict) else "Kubernetes"
            
            return {
                "connected": True,
                "nodes": len(nodes),
                "k8s_version": git_version,
                "total_namespaces": len(namespaces)
            }
        except Exception as e:
            return {
                "connected": False,
                "nodes": 0,
                "error": str(e)
            }

# Global singleton
k8s_orchestrator = K8sOrchestrator()
