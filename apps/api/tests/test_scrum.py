def test_project_and_scrum_state_machine(client):
    # 1. List pre-seeded projects
    projects_res = client.get("/api/v1/projects")
    assert projects_res.status_code == 200
    projects = projects_res.json()
    assert len(projects) >= 1
    core_proj = next(p for p in projects if p["key"] == "PRJ-CORE")
    assert core_proj["total_items"] >= 5

    # 2. Create new project with isolated workspace
    new_proj_payload = {
        "name": "E-Commerce Gateway",
        "key": "PRJ-ECOMM",
        "goal": "Build robust payment integration with supervised AI agents."
    }
    create_p_res = client.post("/api/v1/projects", json=new_proj_payload)
    assert create_p_res.status_code == 201
    new_proj = create_p_res.json()
    assert new_proj["key"] == "PRJ-ECOMM"
    proj_id = new_proj["id"]

    # 3. Create work item without acceptance criteria
    item_payload = {
        "project_id": proj_id,
        "title": "Payment Webhook Handler",
        "description": "Process Stripe webhooks securely",
        "type": "task",
        "priority": "critical",
        "estimate_points": 3.0,
        "acceptance_criteria": [] # Empty criteria
    }
    create_item_res = client.post(f"/api/v1/projects/{proj_id}/work-items", json=item_payload)
    assert create_item_res.status_code == 201
    item = create_item_res.json()
    assert item["key"] == "PRJ-ECOMM-1"
    assert item["status"] == "backlog"
    item_id = item["id"]

    # 4. Guard 1: Attempt transition to Ready without acceptance criteria -> must fail
    ready_fail_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "ready"})
    assert ready_fail_res.status_code == 400
    assert "Cannot transition to 'Ready' without at least one testable acceptance criterion" in ready_fail_res.json()["detail"]

    # 5. Add acceptance criteria and transition to Ready -> must succeed
    ready_success_res = client.patch(f"/api/v1/work-items/{item_id}", json={
        "acceptance_criteria": ["Signature verified with HMAC", "Replay attack prevented"],
        "status": "ready"
    })
    assert ready_success_res.status_code == 200
    assert ready_success_res.json()["status"] == "ready"

    # 6. Guard 2: Attempt transition to In Progress without assigned agent -> must fail
    in_prog_fail_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "in_progress"})
    assert in_prog_fail_res.status_code == 400
    assert "without an assigned agent identity" in in_prog_fail_res.json()["detail"]

    # 7. Assign agent and transition to In Progress -> must succeed
    agents_res = client.get("/api/v1/workforce/agents")
    agent_id = agents_res.json()[0]["id"]
    in_prog_success_res = client.patch(f"/api/v1/work-items/{item_id}", json={
        "assignee_agent_id": agent_id,
        "status": "in_progress"
    })
    assert in_prog_success_res.status_code == 200
    assert in_prog_success_res.json()["status"] == "in_progress"

    # 8. Guard 3: Attempt direct transition from In Progress to Done -> must fail (must pass through In Review)
    done_fail_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "done"})
    assert done_fail_res.status_code == 400
    assert "must pass through 'In Review'" in done_fail_res.json()["detail"]

    # 9. Valid transition: In Progress -> In Review -> Done
    to_review_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "in_review"})
    assert to_review_res.status_code == 200
    assert to_review_res.json()["status"] == "in_review"

    to_done_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "done"})
    assert to_done_res.status_code == 200
    assert to_done_res.json()["status"] == "done"

    # 10. Guard 4: Transition to Blocked without reason -> must fail
    block_fail_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "blocked", "blocker_reason": ""})
    assert block_fail_res.status_code == 400
