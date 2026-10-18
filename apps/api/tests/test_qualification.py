import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

client = TestClient(app)

def test_sandbox_qualification_benchmark_success():
    """Verify executing sandbox qualification in PRJ-EVAL produces an explainable scorecard and artifacts."""
    # 1. Create a candidate recruitment request
    req_payload = {
        "role_id": "role-qa",
        "proposed_agent_name": "Aegis",
        "rationale": "Specialized automated penetration testing and sandbox boundary enforcement.",
        "requested_by": "Security Lead",
        "required_skills": ["Security & Threat Modeling", "Automated QA", "Path Traversal Defense"]
    }
    create_res = client.post("/api/v1/recruitment/requests", json=req_payload)
    assert create_res.status_code == 201
    candidate_req = create_res.json()
    request_id = candidate_req["id"]
    assert candidate_req["status"] == "pending_approval"

    # 2. Trigger Sandbox Qualification
    qual_res = client.post(f"/api/v1/recruitment/requests/{request_id}/qualify")
    assert qual_res.status_code == 200
    scorecard = qual_res.json()

    assert scorecard["request_id"] == request_id
    assert scorecard["candidate_name"] == "Aegis"
    assert scorecard["overall_score"] >= 80.0
    assert scorecard["is_passed"] is True
    assert scorecard["passing_threshold"] == 80.0
    assert "prj-eval/runs/qual-" in scorecard["workspace_path"]
    assert scorecard["policy_basis"] == "POL-AGENT-QUALIFICATION-V1"

    # Verify 4 benchmark stages
    assert len(scorecard["stages"]) == 4
    stage_names = [s["stage_name"] for s in scorecard["stages"]]
    assert "CODE_STANDARDS_&_LINT" in stage_names
    assert "DOMAIN_BOUNDARY_&_PATH_TRAVERSAL" in stage_names
    assert "ISOLATED_BENCHMARK_TEST_SUITE" in stage_names
    assert "SECURITY_POLICY_&_SECRET_PROTECTION" in stage_names

    run_id = scorecard["qualification_run_id"]

    # 3. Verify Execution Run in PRJ-EVAL
    run_res = client.get(f"/api/v1/runs/{run_id}")
    assert run_res.status_code == 200
    run_data = run_res.json()
    assert run_data["project_id"] == "prj-eval"
    assert run_data["status"] == "succeeded"
    assert run_data["is_simulated"] is True
    assert run_data["adapter_name"] == "SandboxQualificationHarness"

    # 4. Verify Run Logs
    logs_res = client.get(f"/api/v1/runs/{run_id}/logs")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) >= 5
    assert any("[SIMULATED QUALIFICATION]" in l["message"] for l in logs)

    # 5. Verify Run Artifacts
    arts_res = client.get(f"/api/v1/runs/{run_id}/artifacts")
    assert arts_res.status_code == 200
    arts = arts_res.json()
    art_names = [a["name"] for a in arts]
    assert "scorecard.json" in art_names
    assert "evaluation_report.md" in art_names

    # 6. Verify Recruitment Request State Transition
    req_updated_res = client.get(f"/api/v1/recruitment/requests/{request_id}")
    assert req_updated_res.status_code == 200
    req_updated = req_updated_res.json()
    assert req_updated["status"] == "qualified"
    assert req_updated["benchmark_score"] == scorecard["overall_score"]
    assert req_updated["qualification_run_id"] == run_id

    # 7. Verify Audit Provenance Event
    audit_res = client.get(f"/api/v1/audit-events?target_id={request_id}")
    assert audit_res.status_code == 200
    actions = [ev["action"] for ev in audit_res.json()]
    assert "RECRUITMENT_QUALIFICATION_COMPLETED" in actions

def test_get_qualification_scorecard_endpoint():
    """Verify retrieving existing candidate scorecard."""
    # Qualify candidate Vanguard (seeded)
    qual_res = client.post("/api/v1/recruitment/requests/req-rec-001/qualify")
    assert qual_res.status_code == 200

    # Fetch scorecard
    res = client.get("/api/v1/recruitment/requests/req-rec-001/scorecard")
    assert res.status_code == 200
    data = res.json()
    assert data["request_id"] == "req-rec-001"
    assert data["candidate_name"] == "Vanguard"
    assert data["is_passed"] is True
    assert len(data["stages"]) == 4

def test_get_scorecard_unqualified_candidate():
    """Verify 404 when candidate has not yet executed qualification."""
    req_payload = {
        "role_id": "role-fe-eng",
        "proposed_agent_name": "Novice",
        "rationale": "Untested UI candidate.",
        "required_skills": ["CSS"]
    }
    create_res = client.post("/api/v1/recruitment/requests", json=req_payload)
    assert create_res.status_code == 201
    new_id = create_res.json()["id"]

    res = client.get(f"/api/v1/recruitment/requests/{new_id}/scorecard")
    assert res.status_code == 404
    assert "Candidate has not executed sandbox qualification yet" in res.json()["detail"]

def test_qualify_nonexistent_request():
    """Verify 404 when request id is invalid."""
    res = client.post("/api/v1/recruitment/requests/non-existent-9999/qualify")
    assert res.status_code == 404
