import uuid
import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

def test_approvals_summary_endpoint(client):
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

def test_sequential_sprint_guard(client):
    unique_suffix = uuid.uuid4().hex[:4].upper()
    proj_key = f"SS{unique_suffix}"
    proj_name = f"Sequential Sprint PRJ {unique_suffix}"

    # 1. Create a project
    proj_res = client.post("/api/v1/projects", json={
        "name": proj_name,
        "key": proj_key,
        "goal": "Test sequential sprint enforcement"
    })
    assert proj_res.status_code == 201
    proj_data = proj_res.json()
    project_id = proj_data["id"]

    # Project creation creates Sprint 1 in planning status
    sprints_res = client.get(f"/api/v1/projects/{project_id}/sprints")
    assert sprints_res.status_code == 200
    sprints = sprints_res.json()
    sprint1 = sprints[0]
    assert sprint1["status"] == "planning"

    # 2. Create Sprint 2 with status 'planning'
    sprint2_res = client.post(f"/api/v1/projects/{project_id}/sprints", json={
        "name": "Sprint 2: Features",
        "goal": "Second sprint goal",
        "status": "planning",
        "capacity_points": 20
    })
    assert sprint2_res.status_code == 201
    sprint2 = sprint2_res.json()

    # 3. Attempting to start Sprint 2 while Sprint 1 is NOT completed MUST be rejected with HTTP 400
    patch_res = client.patch(
        f"/api/v1/projects/{project_id}/sprints/{sprint2['id']}/status",
        json={"status": "active"}
    )
    assert patch_res.status_code == 400
    assert "belum selesai" in patch_res.json()["detail"] or "masih berlangsung" in patch_res.json()["detail"]

    # 4. Start Sprint 1 -> success
    start_s1_res = client.patch(
        f"/api/v1/projects/{project_id}/sprints/{sprint1['id']}/status",
        json={"status": "active"}
    )
    assert start_s1_res.status_code == 200
    assert start_s1_res.json()["status"] == "active"

    # 5. Attempting to start Sprint 2 while Sprint 1 is ACTIVE MUST still be rejected
    patch2_res = client.patch(
        f"/api/v1/projects/{project_id}/sprints/{sprint2['id']}/status",
        json={"status": "active"}
    )
    assert patch2_res.status_code == 400
    assert "masih berlangsung" in patch2_res.json()["detail"]

    # 6. Complete Sprint 1
    complete_s1_res = client.patch(
        f"/api/v1/projects/{project_id}/sprints/{sprint1['id']}/status",
        json={"status": "completed"}
    )
    assert complete_s1_res.status_code == 200
    assert complete_s1_res.json()["status"] == "completed"

    # 7. Now Sprint 2 CAN be started!
    start_s2_res = client.patch(
        f"/api/v1/projects/{project_id}/sprints/{sprint2['id']}/status",
        json={"status": "active"}
    )
    assert start_s2_res.status_code == 200
    assert start_s2_res.json()["status"] == "active"
