import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)

def test_get_demand_analysis():
    """Verify explainable demand analysis discovers bottlenecks and provides staffing recommendations."""
    res = client.get("/api/v1/recruitment/demand-analysis")
    assert res.status_code == 200
    data = res.json()
    assert "total_active_projects" in data
    assert "total_active_work_items" in data
    assert "bottlenecks" in data
    assert "recommendations" in data
    assert data["total_active_projects"] >= 1
    assert data["total_active_work_items"] >= 1

    # Check recommendations structure
    assert len(data["recommendations"]) >= 1
    rec = data["recommendations"][0]
    assert rec["action"] in ["RECRUIT_NEW_AGENT", "REASSIGN_EXISTING", "CAPACITY_SUFFICIENT"]
    assert 0.0 <= rec["confidence_score"] <= 1.0
    assert len(rec["rationale"]) > 5

def test_list_recruitment_requests():
    """Verify listing recruitment requests with status filtering."""
    res = client.get("/api/v1/recruitment/requests")
    assert res.status_code == 200
    requests = res.json()
    assert isinstance(requests, list)
    assert len(requests) >= 1

    # Verify seed request
    seed_req = next((r for r in requests if r["id"] == "req-rec-001"), None)
    assert seed_req is not None
    assert seed_req["proposed_agent_name"] == "Fajar Hidayat"
    assert seed_req["status"] in ["pending_approval", "qualified"]
    assert "Security & Threat Modeling" in seed_req["required_skills"]

    # Filter by status
    res_filtered = client.get("/api/v1/recruitment/requests?status=pending_approval")
    assert res_filtered.status_code == 200
    assert all(r["status"] == "pending_approval" for r in res_filtered.json())

def test_create_recruitment_request_success():
    """Verify submitting a valid recruitment request logs audit provenance."""
    payload = {
        "role_id": "role-be-arch",
        "proposed_agent_name": "Ahmad Fauzi",
        "rationale": "High load on backend APIs and SQLite WAL concurrency requires dedicated database performance tuning.",
        "requested_by": "Engineering Director",
        "required_skills": ["Python / FastAPI", "SQLAlchemy", "Database Reliability"]
    }
    res = client.post("/api/v1/recruitment/requests", json=payload)
    assert res.status_code == 201
    data = res.json()
    assert data["proposed_agent_name"] == "Ahmad Fauzi"
    assert data["status"] == "pending_approval"
    assert data["role_name"] == "Backend Architect & Lead"
    assert data["policy_basis"] == "POL-AGENT-RECRUITMENT-V1"

    created_id = data["id"]

    # Verify audit event logged
    audit_res = client.get(f"/api/v1/audit-events?target_id={created_id}")
    assert audit_res.status_code == 200
    audit_events = audit_res.json()
    assert len(audit_events) >= 1
    event = audit_events[0]
    assert event["action"] == "RECRUITMENT_REQUEST_CREATED"
    assert event["actor"] == "Engineering Director"
    assert event["details"]["proposed_agent_name"] == "Ahmad Fauzi"

def test_create_recruitment_request_invalid_role():
    """Verify rejection when role does not exist in catalog."""
    payload = {
        "role_id": "non-existent-role-999",
        "proposed_agent_name": "GhostAgent",
        "rationale": "Should fail immediately.",
        "required_skills": ["Imaginary Skill"]
    }
    res = client.post("/api/v1/recruitment/requests", json=payload)
    assert res.status_code == 400
    assert "does not exist in organizational catalog" in res.json()["detail"]

def test_update_recruitment_request_status():
    """Verify recruitment request status transitions and rejection reasoning."""
    # First create a request
    payload = {
        "role_id": "role-fe-eng",
        "proposed_agent_name": "Pixel",
        "rationale": "Design system token expansion and micro-animations.",
        "required_skills": ["CSS / Tailwind", "Next.js"]
    }
    res = client.post("/api/v1/recruitment/requests", json=payload)
    assert res.status_code == 201
    req_id = res.json()["id"]

    # Transition to qualifying
    res_qualifying = client.patch(
        f"/api/v1/recruitment/requests/{req_id}/status",
        json={"status": "qualifying", "approver": "Lead Architect"}
    )
    assert res_qualifying.status_code == 200
    assert res_qualifying.json()["status"] == "qualifying"

    # Transition to rejected with reason
    res_rejected = client.patch(
        f"/api/v1/recruitment/requests/{req_id}/status",
        json={"status": "rejected", "rejection_reason": "Existing frontend capacity sufficient for current sprint.", "approver": "Delivery Lead"}
    )
    assert res_rejected.status_code == 200
    assert res_rejected.json()["status"] == "rejected"
    assert res_rejected.json()["rejection_reason"] == "Existing frontend capacity sufficient for current sprint."
