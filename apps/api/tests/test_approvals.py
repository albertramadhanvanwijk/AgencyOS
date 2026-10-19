import pytest
from fastapi.testclient import TestClient
from apps.api.main import app
from apps.api.models import Project, Sprint, WorkItem

client = TestClient(app)

def test_approvals_summary_endpoint():
    res = client.get("/api/v1/approvals/summary")
    assert res.status_code == 200
    data = res.json()
    assert "total_pending_count" in data
    assert "sprint_count" in data
    assert "recruitment_count" in data
    assert "work_item_count" in data
    assert "pending_sprints" in data
    assert isinstance(data["pending_sprints"], list)
    assert isinstance(data["pending_recruitment"], list)
    assert isinstance(data["pending_work_items"], list)

def test_single_active_sprint_guard(db_session):
    # 1. Create a project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Single Sprint Test PRJ",
        "key": "SSTP",
        "goal": "Test single active sprint enforcement"
    })
    assert proj_res.status_code == 201
    proj_data = proj_res.json()
    project_id = proj_data["id"]

    # Project creation automatically created Sprint 1 in active status
    sprints_res = client.get(f"/api/v1/projects/{project_id}/sprints")
    assert sprints_res.status_code == 200
    sprints = sprints_res.json()
    active_sprint = next((s for s in sprints if s["status"] == "active"), None)
    assert active_sprint is not None

    # 2. Create Sprint 2 with status 'planning'
    sprint2_res = client.post(f"/api/v1/projects/{project_id}/sprints", json={
        "name": "Sprint 2: Features",
        "goal": "Second sprint goal",
        "status": "planning",
        "capacity_points": 20
    })
    assert sprint2_res.status_code == 201
    sprint2 = sprint2_res.json()

    # 3. Attempting to start Sprint 2 while Sprint 1 is active MUST be rejected with HTTP 400
    patch_res = client.patch(
        f"/api/v1/projects/{project_id}/sprints/{sprint2['id']}/status",
        json={"status": "active"}
    )
    assert patch_res.status_code == 400
    assert "masih berlangsung" in patch_res.json()["detail"] or "masih aktif" in patch_res.json()["detail"]
