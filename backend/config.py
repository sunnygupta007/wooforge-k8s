import os
from datetime import timedelta
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR.parent / ".env")
load_dotenv(BASE_DIR / ".env")

class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "wooforge-dev-secret-key-99887766")
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "wooforge-jwt-secret-99887766")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'wooforge.db'}")
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # Kubernetes config
    K8S_AUTH_MODE = os.getenv("K8S_AUTH_MODE", "kubeconfig")  # 'incluster' or 'kubeconfig'
    KUBECONFIG_PATH = os.path.expanduser(os.getenv("KUBECONFIG_PATH", "~/.kube/config"))
    
    # Ingress / Networking
    BASE_DOMAIN = os.getenv("BASE_DOMAIN", "local.dev")
    INGRESS_CLASS = os.getenv("INGRESS_CLASS", "nginx")
    STORAGE_CLASS = os.getenv("STORAGE_CLASS", "standard")
    
    # Default quotas
    DEFAULT_MAX_STORES = int(os.getenv("DEFAULT_MAX_STORES", "5"))
    DEFAULT_STORAGE_GB = int(os.getenv("DEFAULT_STORAGE_GB", "2"))
    DEFAULT_MEMORY_MB = int(os.getenv("DEFAULT_MEMORY_MB", "1024"))
    DEFAULT_CPU_CORES = float(os.getenv("DEFAULT_CPU_CORES", "1.0"))
