# -*- coding: utf-8 -*-
"""
Tests for Admin Server Stats API and Telemetry Engine.
Verifies strict authorization for ananiadevsurashvili@gmail.com
and validates all metrics returned from the OCI Ampere A1 instance.
"""

import unittest
import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from fastapi.testclient import TestClient
from app.main import app
from app.server_stats import (
    get_cpu_metrics, get_memory_metrics, get_disk_metrics,
    get_network_metrics, get_service_metrics, get_full_server_stats
)

class TestServerStats(unittest.TestCase):
    def setUp(self):
        self.client = TestClient(app)
        self.admin_email = "ananiadevsurashvili@gmail.com"

    def test_telemetry_functions(self):
        """Verify individual telemetry collection functions return valid structures."""
        cpu = get_cpu_metrics()
        self.assertIn("cores", cpu)
        self.assertIn("load_avg", cpu)
        self.assertIn("plan_limit", cpu)

        mem = get_memory_metrics()
        self.assertIn("total_bytes", mem)
        self.assertIn("used_percent", mem)
        self.assertIn("plan_limit", mem)
        self.assertGreater(mem["total_bytes"], 0)

        disk = get_disk_metrics()
        self.assertIn("total_bytes", disk)
        self.assertIn("used_percent", disk)
        self.assertIn("plan_limit", disk)

        net = get_network_metrics()
        self.assertIn("rx_bytes", net)
        self.assertIn("tx_bytes", net)
        self.assertIn("plan_limit", net)

        services = get_service_metrics()
        self.assertIn("oudio_api", services)
        self.assertIn("ollama", services)

        full = get_full_server_stats()
        self.assertEqual(full["status"], "online")
        self.assertIn("server", full)
        self.assertIn("oci_plan", full)

    def test_admin_endpoint_forbidden_for_anonymous(self):
        """Anonymous callers must receive 403 Forbidden."""
        res = self.client.get("/api/admin/server-stats")
        self.assertEqual(res.status_code, 403)
        self.assertIn("forbidden", res.json()["detail"].lower())

    def test_admin_endpoint_forbidden_for_non_admin_user(self):
        """Non-admin email addresses must receive 403 Forbidden."""
        res = self.client.get(
            "/api/admin/server-stats",
            headers={"X-Admin-Email": "intruder@domain.com"}
        )
        self.assertEqual(res.status_code, 403)

    def test_admin_endpoint_authorized_for_admin(self):
        """Admin email ananiadevsurashvili@gmail.com receives 200 OK and full telemetry."""
        res = self.client.get(
            "/api/admin/server-stats",
            headers={"X-Admin-Email": self.admin_email}
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertEqual(data["status"], "online")
        self.assertIn("compute", data)
        self.assertIn("memory", data)
        self.assertIn("storage", data)
        self.assertIn("network", data)
        self.assertIn("services", data)
        self.assertIn("oci_plan", data)

if __name__ == "__main__":
    unittest.main()
