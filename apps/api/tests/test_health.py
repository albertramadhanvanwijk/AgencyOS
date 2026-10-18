import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)

def test_root():
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["docs"] == "/api/v1/docs"

def test_health_endpoint():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "AgencyOS API"
    assert data["database"]["connected"] is True

def test_system_status():
    response = client.get("/api/v1/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["environment"] == "development"
    assert "workspace_root" in data
    assert data["engine_adapter_default"] == "mock"
