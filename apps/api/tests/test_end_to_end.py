import pytest
from pathlib import Path

def test_milestone_1_end_to_end_delivery_and_audit(client):
    """
    Comprehensive End-to-End Test for Milestone 1:
    1. Organization and agent ready.
    2. Create Project.
    3. Create Work Item with acceptance criteria.
    4. Guard validation: Transition from Backlog -> Ready.
    5. Trigger Execution Run via MockEngineAdapter.
    6. Verify path containment and physical artifacts on disk.
    7. Verify quality checks (Lint, Typecheck, Tests, Security scan).
    8. Formal Human Supervisor Approval (/work-items/{id}/approve).
    9. Verify immutable Audit Trail records entire provenance.
    """

    # --- Step 1: Verify Agents & Organization ---
    agents_res = client.get("/api/v1/workforce/agents")
    assert agents_res.status_code == 200
    agents = agents_res.json()
    assert len(agents) > 0
    assigned_agent_id = agents[0]["id"]

    # --- Step 2: Create New Project ---
    project_payload = {
        "name": "AgencyOS Control Plane E2E",
        "key": "E2E",
        "goal": "Verify full autonomous execution, quality gates, and audit provenance.",
        "workspace_path": "workspaces/e2e-project"
    }
    proj_res = client.post("/api/v1/projects", json=project_payload)
    assert proj_res.status_code == 201
    project = proj_res.json()
    project_id = project["id"]
    assert project["key"] == "E2E"

    # --- Step 3: Create Work Item with Acceptance Criteria ---
    item_payload = {
        "project_id": project_id,
        "title": "Build Secure Path Containment Runner",
        "type": "story",
        "priority": "critical",
        "estimate_points": 5.0,
        "acceptance_criteria": [
            "Path canonicalization blocks traversal attacks",
            "MockEngineAdapter outputs labeled [SIMULATED]",
            "Execution logs streamed to database"
        ],
        "definition_of_done": [
            "100% test pass rate",
            "Zero high severity security alerts",
            "Human supervisor sign-off recorded"
        ],
        "assignee_agent_id": assigned_agent_id
    }
    item_res = client.post(f"/api/v1/projects/{project_id}/work-items", json=item_payload)
    assert item_res.status_code == 201
    work_item = item_res.json()
    work_item_id = work_item["id"]
    assert work_item["status"] == "backlog"
    assert work_item["key"].startswith("E2E-")

    # --- Step 4: Transition Backlog -> Ready ---
    ready_res = client.patch(f"/api/v1/work-items/{work_item_id}", json={"status": "ready"})
    assert ready_res.status_code == 200
    assert ready_res.json()["status"] == "ready"

    # --- Step 5: Trigger Autonomous Execution Run ---
    run_res = client.post(f"/api/v1/projects/{project_id}/work-items/{work_item_id}/runs")
    assert run_res.status_code == 201
    run = run_res.json()
    run_id = run["id"]
    assert run["is_simulated"] is True
    assert run["status"] == "review"
    assert "runs" in run["workspace_path"]

    # --- Step 6: Verify Path Containment & Artifacts on Disk ---
    artifacts_res = client.get(f"/api/v1/runs/{run_id}/artifacts")
    assert artifacts_res.status_code == 200
    artifacts = artifacts_res.json()
    assert len(artifacts) >= 3

    artifact_names = [a["name"] for a in artifacts]
    assert "patch.diff" in artifact_names
    assert "test_results.json" in artifact_names
    assert "execution_summary.md" in artifact_names

    for art in artifacts:
        file_path = Path(art["file_path"])
        assert file_path.exists()
        assert art["is_simulated"] is True
        content = art["content_preview"]
        assert content is not None
        if art["name"] == "patch.diff":
            assert "[SIMULATED]" in content

    # --- Step 7: Verify Quality Gates ---
    qc_res = client.get(f"/api/v1/runs/{run_id}/quality-checks")
    assert qc_res.status_code == 200
    quality_checks = qc_res.json()
    check_names = {qc["check_name"]: qc["status"] for qc in quality_checks}
    assert check_names["LINT"] == "passed"
    assert check_names["TYPECHECK"] == "passed"
    assert check_names["UNIT_TESTS"] == "passed"
    assert check_names["SECURITY_SCAN"] == "passed"

    # Verify work item automatically moved to in_review
    check_item = client.get(f"/api/v1/work-items/{work_item_id}").json()
    assert check_item["status"] == "in_review"

    # --- Step 8: Human Supervisor Review & Sign-Off ---
    approval_payload = {
        "decision": "approve",
        "review_notes": "All acceptance criteria verified against test reports. Approved for production.",
        "approver": "Lead Technical Director"
    }
    approve_res = client.post(f"/api/v1/work-items/{work_item_id}/approve", json=approval_payload)
    assert approve_res.status_code == 200
    approved_item = approve_res.json()
    assert approved_item["status"] == "done"

    # --- Step 9: Verify Immutable Audit Provenance Trail ---
    audit_res = client.get(f"/api/v1/audit-events?project_id={project_id}")
    assert audit_res.status_code == 200
    audit_events = audit_res.json()
    actions = [ev["action"] for ev in audit_events]

    # Must contain the consequential actions
    assert "CREATE_PROJECT" in actions
    assert "WORK_ITEM_CREATED" in actions
    assert "EXECUTION_RUN_TRIGGERED" in actions
    assert "WORK_ITEM_STATUS_TRANSITION" in actions
    assert "WORK_ITEM_APPROVED" in actions

    # Verify approved event details
    approval_event = next(ev for ev in audit_events if ev["action"] == "WORK_ITEM_APPROVED")
    assert approval_event["actor"] == "Lead Technical Director"
    assert approval_event["details"]["decision"] == "approve"
    assert approval_event["policy_basis"] == "QUALITY_GATE_HUMAN_APPROVAL_V1"
