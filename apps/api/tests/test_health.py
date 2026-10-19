def test_root(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "message" in data
    assert data["docs"] == "/api/v1/docs"

def test_health_endpoint(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["service"] == "AgencyOS API"
    assert data["database"]["connected"] is True

def test_system_status(client):
    response = client.get("/api/v1/system/status")
    assert response.status_code == 200
    data = response.json()
    assert data["environment"] == "development"
    assert "workspace_root" in data
    assert "Mock" in data["engine_adapter_default"]

def test_system_adapters(client):
    response = client.get("/api/v1/system/adapters")
    assert response.status_code == 200
    adapters = response.json()
    names = [a["name"] for a in adapters]
    assert "MockEngineAdapter" in names
    assert "LiveLLMEngineAdapter" in names

    mock_info = next(a for a in adapters if a["name"] == "MockEngineAdapter")
    assert mock_info["is_simulated"] is True
    assert mock_info["status"] in ["healthy", "verified"]

    live_info = next(a for a in adapters if a["name"] == "LiveLLMEngineAdapter")
    assert live_info["is_simulated"] is False
    assert live_info["status"] in ["not_configured", "verified"]

def test_test_adapter_connection_not_configured(client):
    response = client.post("/api/v1/system/adapters/test-connection", json={})
    assert response.status_code == 200
    data = response.json()
    assert data["adapter"] == "LiveLLMEngineAdapter"
    assert data["simulated"] is False
    assert data["status"] in ["not_configured", "verified"]

def test_configure_adapter(client):
    response = client.post("/api/v1/system/adapters/configure", json={
        "model": "gpt-4o",
        "default_adapter": "LiveLLMEngineAdapter"
    })
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    
    # Reset back to MockEngineAdapter for other tests
    client.post("/api/v1/system/adapters/configure", json={
        "default_adapter": "MockEngineAdapter"
    })

