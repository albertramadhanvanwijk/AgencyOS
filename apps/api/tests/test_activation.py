import uuid
import pytest

def test_approve_activation_success(client):
    """Verify supervisor approval activates a qualified candidate and creates AIAgent entity."""
    unique_name = f"Budi Santoso_{uuid.uuid4().hex[:6]}"
    # 1. Create candidate recruitment request
    payload = {
        "role_id": "role-be-arch",
        "proposed_agent_name": unique_name,
        "rationale": "High workload bottleneck on database engine.",
        "requested_by": "Architecture Lead",
        "required_skills": ["SQLAlchemy", "FastAPI", "SQLite WAL"]
    }
    create_res = client.post("/api/v1/recruitment/requests", json=payload)
    assert create_res.status_code == 201
    candidate = create_res.json()
    req_id = candidate["id"]

    # 2. Qualify Candidate
    qual_res = client.post(f"/api/v1/recruitment/requests/{req_id}/qualify")
    assert qual_res.status_code == 200
    assert qual_res.json()["is_passed"] is True

    # 3. Approve Activation (Dual-Key Human Gate)
    approval_payload = {
        "approver": "Technical Director",
        "approval_notes": "Benchmark passed with exceptional domain integrity score.",
        "custom_title": "Database Optimization Specialist",
        "max_concurrency": 3
    }
    approve_res = client.post(f"/api/v1/recruitment/requests/{req_id}/approve-activation", json=approval_payload)
    assert approve_res.status_code == 200
    activation = approve_res.json()

    assert activation["request_id"] == req_id
    assert activation["agent_name"] == unique_name
    assert activation["role_name"] == "Backend Architect & Lead"
    assert activation["status"] == "active"
    assert activation["skills_count"] == 3
    assert activation["policy_basis"] == "POL-AGENT-ACTIVATION-V1"

    new_agent_id = activation["agent_id"]

    # 4. Verify AIAgent Exists in Workforce Directory
    agent_res = client.get(f"/api/v1/workforce/agents/{new_agent_id}")
    assert agent_res.status_code == 200
    agent_data = agent_res.json()
    assert agent_data["name"] == unique_name
    assert agent_data["title"] == "Database Optimization Specialist"
    assert agent_data["lifecycle_state"] == "active"
    assert agent_data["qualification_state"] == "passed"
    assert agent_data["max_concurrency"] == 3
    assert len(agent_data["skills"]) == 3
    assert all(s["is_verified"] for s in agent_data["skills"])

    # 5. Verify Recruitment Request Status is Activated
    req_res = client.get(f"/api/v1/recruitment/requests/{req_id}")
    assert req_res.status_code == 200
    assert req_res.json()["status"] == "activated"

    # 6. Verify Audit Trail Provenance
    audit_res = client.get(f"/api/v1/audit-events?target_id={new_agent_id}")
    assert audit_res.status_code == 200
    events = audit_res.json()
    assert len(events) >= 1
    event = events[0]
    assert event["action"] == "AGENT_IDENTITY_ACTIVATED"
    assert event["actor"] == "Technical Director"
    assert event["policy_basis"] == "POL-AGENT-ACTIVATION-V1"
    assert event["details"]["agent_name"] == unique_name

def test_approve_activation_governance_rejection_unqualified(client):
    """Verify state machine rejects activation if sandbox qualification has not passed."""
    payload = {
        "role_id": "role-fe-eng",
        "proposed_agent_name": f"Gilang Pratama_{uuid.uuid4().hex[:6]}",
        "rationale": "Attempting unauthorized activation without qualification.",
        "required_skills": ["CSS"]
    }
    create_res = client.post("/api/v1/recruitment/requests", json=payload)
    assert create_res.status_code == 201
    req_id = create_res.json()["id"]

    # Attempt activation directly without qualifying
    approve_res = client.post(
        f"/api/v1/recruitment/requests/{req_id}/approve-activation",
        json={"approver": "Rogue Operator"}
    )
    assert approve_res.status_code == 400
    assert "Sandbox qualification benchmark must be passed first" in approve_res.json()["detail"]

def test_approve_activation_double_activation_rejection(client):
    """Verify an already activated agent identity cannot be re-activated."""
    unique_name = f"Siti Rahmawati_{uuid.uuid4().hex[:6]}"
    payload = {
        "role_id": "role-po",
        "proposed_agent_name": unique_name,
        "rationale": "Product owner backlog manager.",
        "required_skills": ["Scrum Refinement"]
    }
    create_res = client.post("/api/v1/recruitment/requests", json=payload)
    req_id = create_res.json()["id"]

    # Qualify
    client.post(f"/api/v1/recruitment/requests/{req_id}/qualify")

    # First activation -> Success
    res1 = client.post(
        f"/api/v1/recruitment/requests/{req_id}/approve-activation",
        json={"approver": "Lead Architect"}
    )
    assert res1.status_code == 200

    # Second activation attempt -> Rejected
    res2 = client.post(
        f"/api/v1/recruitment/requests/{req_id}/approve-activation",
        json={"approver": "Lead Architect"}
    )
    assert res2.status_code == 400
    assert "already been activated" in res2.json()["detail"]
