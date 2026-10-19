import pytest
from starlette.testclient import TestClient

def test_github_status_endpoint(client: TestClient):
    response = client.get("/api/v1/projects/integrations/github/status")
    assert response.status_code == 200
    data = response.json()
    assert "authenticated" in data
    if data["authenticated"]:
        assert "username" in data
        assert data["username"] is not None

def test_project_creation_local_git_and_subtasks(client: TestClient):
    # 1. Create a project with local git initialization
    proj_payload = {
        "name": "GitHub Test Project",
        "key": "GHTEST",
        "goal": "Verify git branch and subtasks orchestration",
        "github_repo_mode": "local",
        "status": "active"
    }
    proj_res = client.post("/api/v1/projects", json=proj_payload)
    assert proj_res.status_code == 201
    proj_data = proj_res.json()
    assert proj_data["key"] == "GHTEST"
    assert proj_data["github_repo_mode"] == "local"

    # 2. Create a parent work item
    parent_payload = {
        "project_id": proj_data["id"],
        "title": "Build User Authentication Flow",
        "description": "Comprehensive auth flow with JWT",
        "type": "story",
        "priority": "high",
        "estimate_points": 5.0,
        "acceptance_criteria": ["JWT token returned on 200", "401 on expired signature"],
    }
    parent_res = client.post(f"/api/v1/projects/{proj_data['id']}/work-items", json=parent_payload)
    assert parent_res.status_code == 201
    parent_data = parent_res.json()
    assert parent_data["key"] == "GHTEST-1"
    assert parent_data["git_branch"] == "agencyos/ghtest/ghtest-1"
    assert parent_data["pull_request_status"] == "draft"

    # 3. Create a subtask under the parent item
    subtask_payload = {
        "title": "Implement JWT Token Generator",
        "description": "Subtask for crypto token utility",
        "priority": "high",
        "estimate_points": 2.0
    }
    subtask_res = client.post(f"/api/v1/work-items/{parent_data['id']}/subtasks", json=subtask_payload)
    assert subtask_res.status_code == 201
    subtask_data = subtask_res.json()
    assert subtask_data["type"] == "subtask"
    assert subtask_data["parent_id"] == parent_data["id"]
    assert subtask_data["key"] == "GHTEST-1-S1"
    assert subtask_data["git_branch"] == "agencyos/ghtest/ghtest-1-s1"

    # 4. Fetch the parent item and verify subtasks list is populated
    get_parent_res = client.get(f"/api/v1/work-items/{parent_data['id']}")
    assert get_parent_res.status_code == 200
    fetched_parent = get_parent_res.json()
    assert len(fetched_parent["subtasks"]) >= 1
    assert fetched_parent["subtasks"][0]["key"] == "GHTEST-1-S1"
    assert fetched_parent["subtasks"][0]["title"] == "Implement JWT Token Generator"
