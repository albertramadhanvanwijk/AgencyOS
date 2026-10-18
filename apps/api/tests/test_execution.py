import pytest
from pathlib import Path
from apps.api.models.execution import ExecutionRun, RunArtifact, QualityCheckResult

def test_execution_run_lifecycle_and_artifacts(client):
    # 1. Fetch seeded project and work item
    proj_res = client.get("/api/v1/projects")
    assert proj_res.status_code == 200
    projects = proj_res.json()
    assert len(projects) > 0
    project_id = projects[0]["id"]

    items_res = client.get(f"/api/v1/projects/{project_id}/work-items")
    assert items_res.status_code == 200
    items = items_res.json()
    assert len(items) > 0

    # Pick an item and ensure it's in ready state with criteria
    test_item = items[0]
    item_id = test_item["id"]
    client.patch(f"/api/v1/work-items/{item_id}", json={
        "status": "ready",
        "acceptance_criteria": ["Implement API endpoints", "Ensure test containment"]
    })

    # 2. Trigger execution run
    trigger_res = client.post(f"/api/v1/projects/{project_id}/work-items/{item_id}/runs")
    assert trigger_res.status_code == 201
    run_data = trigger_res.json()
    run_id = run_data["id"]

    assert run_data["project_id"] == project_id
    assert run_data["work_item_id"] == item_id
    assert run_data["is_simulated"] is True
    assert run_data["adapter_name"] == "MockEngineAdapter"
    assert run_data["status"] == "review"
    assert "runs" in run_data["workspace_path"]

    # 3. Verify timeline logs
    logs_res = client.get(f"/api/v1/runs/{run_id}/logs")
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) >= 5
    for log in logs:
        assert "[SIMULATED]" in log["message"]
        assert log["is_simulated"] is True

    # 4. Verify generated artifacts
    artifacts_res = client.get(f"/api/v1/runs/{run_id}/artifacts")
    assert artifacts_res.status_code == 200
    artifacts = artifacts_res.json()
    artifact_names = [a["name"] for a in artifacts]
    assert "patch.diff" in artifact_names
    assert "test_results.json" in artifact_names
    assert "execution_summary.md" in artifact_names

    # Verify physical file existence and containment
    for a in artifacts:
        file_path = Path(a["file_path"])
        assert file_path.exists()
        assert a["is_simulated"] is True
        assert a["content_preview"] is not None

    # 5. Verify quality check results
    qc_res = client.get(f"/api/v1/runs/{run_id}/quality-checks")
    assert qc_res.status_code == 200
    checks = qc_res.json()
    check_names = [c["check_name"] for c in checks]
    assert "LINT" in check_names
    assert "TYPECHECK" in check_names
    assert "UNIT_TESTS" in check_names
    assert "SECURITY_SCAN" in check_names

    # 6. Verify work item transitioned to in_review
    item_res = client.get(f"/api/v1/projects/{project_id}/work-items")
    updated_items = item_res.json()
    target = next(i for i in updated_items if i["id"] == item_id)
    assert target["status"] == "in_review"

def test_backlog_item_execution_blocked(client):
    # Fetch project
    proj_res = client.get("/api/v1/projects")
    project_id = proj_res.json()[0]["id"]

    # Create backlog work item
    create_res = client.post(f"/api/v1/projects/{project_id}/work-items", json={
        "project_id": project_id,
        "title": "Unrefined Backlog Item",
        "acceptance_criteria": []
    })
    item_id = create_res.json()["id"]

    # Try triggering execution run -> must fail with 400
    trigger_res = client.post(f"/api/v1/projects/{project_id}/work-items/{item_id}/runs")
    assert trigger_res.status_code == 400
    assert "backlog" in trigger_res.json()["detail"].lower()
