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

    # 11. Backward step 1: Done -> In Review (Reopen)
    reopen_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "in_review"})
    assert reopen_res.status_code == 200
    assert reopen_res.json()["status"] == "in_review"

    # 12. Backward step 2: In Review -> In Progress (Rework requested)
    rework_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "in_progress"})
    assert rework_res.status_code == 200
    assert rework_res.json()["status"] == "in_progress"

    # 13. Backward step 3: In Progress -> Ready
    to_ready_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "ready"})
    assert to_ready_res.status_code == 200
    assert to_ready_res.json()["status"] == "ready"

    # 14. Backward step 4: Ready -> Backlog
    to_backlog_res = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "backlog"})
    assert to_backlog_res.status_code == 200
    assert to_backlog_res.json()["status"] == "backlog"


def test_product_backlog_creation_and_sprint_ejection(client):
    # 1. PRJ-CORE has an active sprint seeded
    sprints_res = client.get("/api/v1/projects/PRJ-CORE/sprints")
    assert sprints_res.status_code == 200
    sprints = sprints_res.json()
    active_sprint = next((s for s in sprints if s["status"] == "active"), None)
    assert active_sprint is not None

    # 2. Create work item without sprint_id -> MUST stay in Product Backlog (sprint_id is None)
    create_res = client.post("/api/v1/projects/PRJ-CORE/work-items", json={
        "project_id": "PRJ-CORE",
        "title": "Unplanned Roadmap Discovery Item",
        "type": "story",
        "priority": "medium",
        "estimate_points": 2.0,
        "acceptance_criteria": []
    })
    assert create_res.status_code == 201
    created_item = create_res.json()
    assert created_item["sprint_id"] is None
    assert created_item["status"] == "backlog"
    item_id = created_item["id"]

    # 3. Move work item into active sprint
    assign_res = client.patch(f"/api/v1/work-items/{item_id}", json={
        "sprint_id": active_sprint["id"]
    })
    assert assign_res.status_code == 200
    assert assign_res.json()["sprint_id"] == active_sprint["id"]

    # 4. Eject work item from sprint back to Product Backlog with sprint_id: null
    eject_res = client.patch(f"/api/v1/work-items/{item_id}", json={
        "sprint_id": None,
        "status": "backlog"
    })
    assert eject_res.status_code == 200
    ejected_item = eject_res.json()
    assert ejected_item["sprint_id"] is None
    assert ejected_item["status"] == "backlog"

    # 5. Verify through GET endpoint that database persisted sprint_id as None
    get_res = client.get(f"/api/v1/work-items/{item_id}")
    assert get_res.status_code == 200
    assert get_res.json()["sprint_id"] is None

