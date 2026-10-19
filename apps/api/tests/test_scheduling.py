import pytest
from apps.api.models import Project, Sprint, WorkItem, AIAgent, JobRole, Department

def test_recommend_assignees(client):
    # Fetch existing project
    res_proj = client.get("/api/v1/projects")
    assert res_proj.status_code == 200
    projects = res_proj.json()
    assert len(projects) > 0
    project_id = projects[0]["id"]

    # Create a work item specifically needing Backend / FastAPI
    res_item = client.post(f"/api/v1/projects/{project_id}/work-items", json={
        "project_id": project_id,
        "title": "Implement FastAPI Authentication with SQLite JWT Tokens",
        "description": "Develop secure backend API endpoints with SQLAlchemy ORM and token verification.",
        "type": "task",
        "priority": "high",
        "estimate_points": 3.0,
        "acceptance_criteria": [
            "JWT token generation endpoint works",
            "Sqlalchemy user model encrypted password validation"
        ]
    })
    assert res_item.status_code == 201
    item_data = res_item.json()
    item_id = item_data["id"]

    # Request smart recommendations
    res_rec = client.get(f"/api/v1/work-items/{item_id}/recommend-assignees")
    assert res_rec.status_code == 200
    recommendations = res_rec.json()
    assert isinstance(recommendations, list)
    assert len(recommendations) > 0

    top_rec = recommendations[0]
    assert "agent_id" in top_rec
    assert "name" in top_rec
    assert "match_score" in top_rec
    assert top_rec["match_score"] >= 50
    assert len(top_rec["rationale"]) > 0
    assert top_rec["is_recommended"] is True


def test_assign_agent_to_work_item(client):
    # Fetch project and create item
    res_proj = client.get("/api/v1/projects")
    project_id = res_proj.json()[0]["id"]

    res_item = client.post(f"/api/v1/projects/{project_id}/work-items", json={
        "project_id": project_id,
        "title": "Build Responsive Navigation Bar with Dark Mode",
        "type": "story",
        "estimate_points": 2.0,
        "acceptance_criteria": ["Mobile hamburger menu works", "Dark theme toggle persists"]
    })
    assert res_item.status_code == 201
    item_id = res_item.json()["id"]

    # Get recommended agent
    res_rec = client.get(f"/api/v1/work-items/{item_id}/recommend-assignees")
    assert res_rec.status_code == 200
    target_agent_id = res_rec.json()[0]["agent_id"]

    # Assign agent
    res_assign = client.post(f"/api/v1/work-items/{item_id}/assign", json={
        "agent_id": target_agent_id,
        "actor": "Lead Scrum Master",
        "rationale": "High match on UI components and verified frontend skills"
    })
    assert res_assign.status_code == 200
    assigned_item = res_assign.json()
    assert assigned_item["assignee_agent_id"] == target_agent_id
    assert assigned_item["assignee_name"] is not None

    # Verify audit event recorded
    res_audit = client.get("/api/v1/audit-events")
    assert res_audit.status_code == 200
    audit_events = res_audit.json()
    assign_event = next((e for e in audit_events if e["action"] == "WORK_ITEM_ASSIGNED" and e["target_id"] == item_id), None)
    assert assign_event is not None
    assert assign_event["details"]["assigned_agent_id"] == target_agent_id


def test_sprint_capacity_and_lifecycle(client):
    # Fetch project
    res_proj = client.get("/api/v1/projects")
    project_id = res_proj.json()[0]["id"]

    # Check sprint capacity
    res_cap = client.get(f"/api/v1/projects/{project_id}/sprint-capacity")
    assert res_cap.status_code == 200
    cap_data = res_cap.json()
    assert "total_capacity_points" in cap_data
    assert "allocated_points" in cap_data
    assert "utilization_rate" in cap_data
    assert isinstance(cap_data["agent_allocations"], list)

    # Lifecycle: complete sprint
    sprint_id = cap_data["sprint_id"]
    if sprint_id:
        res_status = client.patch(f"/api/v1/projects/{project_id}/sprints/{sprint_id}/status", json={
            "status": "completed"
        })
        assert res_status.status_code == 200
        assert res_status.json()["status"] == "completed"
