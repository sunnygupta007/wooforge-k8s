import unittest
import yaml
from app import create_app
from models import db, User, Store, SystemLimit
from k8s_client import k8s_orchestrator

class WooForgeTestCase(unittest.TestCase):
    def setUp(self):
        self.app = create_app()
        self.app.config["TESTING"] = True
        self.app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///:memory:"
        self.client = self.app.test_client()
        self.ctx = self.app.app_context()
        self.ctx.push()
        db.create_all()

    def tearDown(self):
        db.session.remove()
        db.drop_all()
        self.ctx.pop()

    def test_health_check(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertIn("healthy", response.get_json()["status"])

    def test_manifest_rendering(self):
        sample = {
            'id': 'test-uuid-456',
            'name': 'Boutique Apparel',
            'slug': 'boutique-apparel',
            'namespace': 'woo-boutique-apparel',
            'domain': 'boutique-apparel.local.dev',
            'admin_username': 'admin',
            'admin_password': 'DemoPassword123!',
            'admin_email': 'owner@boutique.com',
            'db_password': 'dbpassword123',
            'storage_gb': 2,
            'memory_mb': 1024,
            'cpu_cores': 1.0,
            'catalog_preset': 'fashion'
        }
        rendered = k8s_orchestrator.render_manifests(sample)
        docs = list(yaml.safe_load_all(rendered))
        self.assertEqual(len(docs), 11)
        kinds = [d["kind"] for d in docs if d]
        self.assertIn("Namespace", kinds)
        self.assertIn("Deployment", kinds)
        self.assertIn("PersistentVolumeClaim", kinds)
        self.assertIn("Ingress", kinds)

    def test_auth_workflow(self):
        # Register user
        reg_res = self.client.post("/api/auth/register", json={
            "username": "tester",
            "email": "tester@example.com",
            "password": "Password123"
        })
        self.assertEqual(reg_res.status_code, 201)
        token = reg_res.get_json()["token"]

        # Login
        login_res = self.client.post("/api/auth/login", json={
            "username_or_email": "tester",
            "password": "Password123"
        })
        self.assertEqual(login_res.status_code, 200)

        # Create Store
        store_res = self.client.post("/api/stores", json={
            "name": "Cloud Sneakers",
            "storage_gb": 2,
            "catalog_preset": "fashion"
        }, headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(store_res.status_code, 201)
        store_data = store_res.get_json()["store"]
        self.assertEqual(store_data["name"], "Cloud Sneakers")
        self.assertTrue(store_data["slug"].startswith("cloud-sneakers"))

        # List Stores
        list_res = self.client.get("/api/stores", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(list_res.status_code, 200)
        self.assertEqual(len(list_res.get_json()), 1)

if __name__ == "__main__":
    unittest.main()
