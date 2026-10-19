import pytest
from apps.api.adapters.registry import get_adapter, ADAPTERS, list_adapters_info
from apps.api.adapters.mock_adapter import MockEngineAdapter
from apps.api.adapters.live_adapter import LiveLLMEngineAdapter

def test_adapter_registry_resolution():
    # Exact match
    adapter1 = get_adapter("MockEngineAdapter")
    assert isinstance(adapter1, MockEngineAdapter)
    assert adapter1.is_simulated is True

    adapter2 = get_adapter("LiveLLMEngineAdapter")
    assert isinstance(adapter2, LiveLLMEngineAdapter)
    assert adapter2.is_simulated is False

    # Case-insensitive / prefix match
    adapter3 = get_adapter("live")
    assert isinstance(adapter3, LiveLLMEngineAdapter)

    # Fallback to default
    adapter4 = get_adapter("nonexistent_adapter_xyz")
    assert isinstance(adapter4, MockEngineAdapter)

def test_live_adapter_capabilities():
    live = LiveLLMEngineAdapter()
    caps = live.get_capabilities()
    assert caps["simulated"] is False
    assert caps["diff_emission"] is True
    assert caps["test_runner"] is True
    assert caps["quality_gates"] is True
    assert "supported_models" in caps
    assert "gemini-2.0-flash" in caps["supported_models"]
    assert "gemini-2.5-pro" in caps["supported_models"]
    assert len(caps["supported_models"]) > 0

def test_gemini_api_key_resolution(monkeypatch):
    monkeypatch.setenv("GEMINI_API_KEY", "AIzaSyTestGeminiKey123")
    live = LiveLLMEngineAdapter()
    assert live.api_key == "AIzaSyTestGeminiKey123"
    assert "generativelanguage" in live.base_url
    assert "gemini" in live.model

def test_live_adapter_health_check_honesty_rule(monkeypatch):
    # When no key is provided, MUST report not_configured, never claim verified
    live = LiveLLMEngineAdapter(api_key="")
    health = live.health_check(api_key="")
    assert health["status"] == "not_configured"
    assert health["simulated"] is False

    # When invalid key provided, should report error or auth failure
    # We test with an unreachable or mock-failed response to avoid network flakiness
    health_invalid = live.health_check(api_key="sk-invalid-test-token-12345", base_url="http://127.0.0.1:59999/v1")
    assert health_invalid["status"] == "error"
    assert "tidak dapat terhubung" in health_invalid["message"].lower() or "error" in health_invalid["message"].lower()

def test_adapter_run_execution_via_endpoint(client):
    # Create project and work item
    proj_res = client.post("/api/v1/projects", json={
        "name": "Adapter Test Project",
        "key": "ATP",
        "description": "Testing engine adapters"
    })
    project_id = proj_res.json()["id"]

    item_res = client.post(f"/api/v1/projects/{project_id}/work-items", json={
        "project_id": project_id,
        "title": "Adapter Work Item",
        "type": "task"
    })
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    # Transition item to ready with acceptance criteria
    patch_res = client.patch(f"/api/v1/work-items/{item_id}", json={
        "status": "ready",
        "acceptance_criteria": ["Valid criteria"]
    })
    assert patch_res.status_code == 200

    # Trigger run with explicit MockEngineAdapter
    run_res = client.post(f"/api/v1/projects/{project_id}/work-items/{item_id}/runs?adapter_name=MockEngineAdapter")
    assert run_res.status_code == 201
    run_data = run_res.json()
    assert run_data["adapter_name"] == "MockEngineAdapter"
    assert run_data["is_simulated"] is True
    assert run_data["status"] in ["review", "succeeded"]

    # Verify run logs exist
    logs_res = client.get(f"/api/v1/runs/{run_data['id']}/logs")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) > 0

    # Ensure no secrets leak in logs
    for log in logs:
        assert "sk-" not in log["message"]

def test_extract_models_filtering():
    live = LiveLLMEngineAdapter()
    sample_payload = {
        "data": [
            {"id": "models/gemini-2.0-flash"},
            {"id": "models/gemini-2.5-pro"},
            {"id": "models/text-embedding-004"},
            {"id": "models/whisper-1"},
            {"id": "gpt-4o"},
        ]
    }
    extracted = live._extract_models(sample_payload)
    assert "gemini-2.0-flash" in extracted
    assert "gemini-2.5-pro" in extracted
    assert "gpt-4o" in extracted
    assert "text-embedding-004" not in extracted
    assert "whisper-1" not in extracted

def test_health_check_two_stage_warning_when_model_restricted(monkeypatch):
    import httpx

    live = LiveLLMEngineAdapter()

    # Mock httpx.get to return models list (API key valid)
    def mock_get(url, *args, **kwargs):
        class MockResp:
            status_code = 200
            text = "ok"
            def json(self):
                return {
                    "data": [
                        {"id": "gemini-2.0-flash"},
                        {"id": "gemini-1.5-flash"}
                    ]
                }
        return MockResp()

    # Mock httpx.post to return 403 (Model requires Pro tier)
    def mock_post(url, *args, **kwargs):
        class MockResp:
            status_code = 403
            text = "The model 'gemini-2.5-pro' requires a Pro tier subscription."
            def json(self):
                return {"error": {"message": self.text}}
        return MockResp()

    monkeypatch.setattr(httpx, "get", mock_get)
    monkeypatch.setattr(httpx, "post", mock_post)

    result = live.health_check(
        api_key="AIzaSyValidKeyExample",
        base_url="https://generativelanguage.googleapis.com/v1beta/openai",
        model="gemini-2.5-pro"
    )

    assert result["status"] == "warning"
    assert result["api_key_valid"] is True
    assert result["model_supported"] is False
    assert "API Key VALID, namun model 'gemini-2.5-pro' tidak dapat digunakan" in result["message"]
    assert "gemini-2.0-flash" in result["available_models"]


