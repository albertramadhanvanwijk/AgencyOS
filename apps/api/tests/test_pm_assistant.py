import pytest
from apps.api.models import Project, Sprint, WorkItem

def test_auto_plan_project_success(client):
    # 1. Create a project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Auto Plan Test Project",
        "key": "APTP",
        "goal": "Build modern e-commerce platform with catalog, cart, and payment",
        "github_repo_mode": "local"
    })
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 2. Trigger Auto-Plan
    plan_res = client.post(f"/api/v1/projects/{proj_id}/pm/auto-plan")
    assert plan_res.status_code == 200
    plan_data = plan_res.json()
    assert plan_data["status"] == "success"
    assert plan_data["sprints_count"] == 3
    assert plan_data["stories_count"] >= 8

    # 3. Verify Sprints in DB
    sprints_res = client.get(f"/api/v1/projects/{proj_id}/sprints")
    assert sprints_res.status_code == 200
    sprints = sprints_res.json()
    assert len(sprints) == 3
    assert sprints[0]["status"] == "pending_approval"

    # 4. Verify WorkItems created
    items_res = client.get(f"/api/v1/projects/{proj_id}/work-items")
    assert items_res.status_code == 200
    items = items_res.json()
    assert len(items) >= 8
    first_item = items[0]
    assert len(first_item["acceptance_criteria"]) > 0
    assert first_item["estimate_points"] > 0
    assert first_item["git_branch"].startswith("agencyos/APTP/")

def test_approve_start_sprint_and_pm_instruct(client):
    # 1. Create project & plan
    proj_res = client.post("/api/v1/projects", json={
        "name": "Sprint Approval Project",
        "key": "SAP",
        "goal": "Company Profile Website",
        "github_repo_mode": "local"
    })
    proj_id = proj_res.json()["id"]
    client.post(f"/api/v1/projects/{proj_id}/pm/auto-plan")

    sprints_res = client.get(f"/api/v1/projects/{proj_id}/sprints")
    sprint_1 = sprints_res.json()[0]
    assert sprint_1["status"] == "pending_approval"

    # 2. Approve and start Sprint 1
    approve_res = client.post(f"/api/v1/projects/{proj_id}/sprints/{sprint_1['id']}/approve-start", json={
        "approved_by": "Albert (Project Owner)"
    })
    assert approve_res.status_code == 200
    assert approve_res.json()["sprint_status"] == "active"

    # Check that sprint items are now 'ready'
    items_res = client.get(f"/api/v1/projects/{proj_id}/work-items?sprint_id={sprint_1['id']}")
    for item in items_res.json():
        assert item["status"] == "ready"

    # 3. Test Instruct PM to add feature
    instruct_res = client.post(f"/api/v1/projects/{proj_id}/pm/instruct", json={
        "instruction": "Tolong tambahkan toggle Dark Mode dan tombol WhatsApp floating"
    })
    assert instruct_res.status_code == 200
    inst_data = instruct_res.json()
    assert inst_data["status"] == "success"
    assert "Dark Mode" in inst_data["title"] or "WhatsApp" in inst_data["title"]
    assert inst_data["points"] >= 3.0

    # 4. Test Request Revision on an item
    new_item_key = inst_data["item_key"]
    all_items = client.get(f"/api/v1/projects/{proj_id}/work-items").json()
    target_item = next(i for i in all_items if i["key"] == new_item_key)

    rev_res = client.post(f"/api/v1/projects/{proj_id}/work-items/{target_item['id']}/request-revision", json={
        "revision_notes": "Ubah warna tombol ke biru navy",
        "requested_by": "Albert"
    })
    assert rev_res.status_code == 200
    rev_data = rev_res.json()
    assert rev_data["status_now"] == "in_progress"
    assert rev_data["revision_count"] == 1

def test_complete_review_sprint_retro(client):
    # 1. Create project & plan
    proj_res = client.post("/api/v1/projects", json={
        "name": "Retro Project",
        "key": "RETRO",
        "goal": "Portfolio Platform",
        "github_repo_mode": "local"
    })
    proj_id = proj_res.json()["id"]
    client.post(f"/api/v1/projects/{proj_id}/pm/auto-plan")

    sprints = client.get(f"/api/v1/projects/{proj_id}/sprints").json()
    sprint_1 = sprints[0]
    client.post(f"/api/v1/projects/{proj_id}/sprints/{sprint_1['id']}/approve-start")

    # Mark all items in Sprint 1 as done
    items = client.get(f"/api/v1/projects/{proj_id}/work-items?sprint_id={sprint_1['id']}").json()
    for item in items:
        client.patch(f"/api/v1/projects/{proj_id}/work-items/{item['id']}", json={"status": "done"})

    # Complete review & retro
    complete_res = client.post(f"/api/v1/projects/{proj_id}/sprints/{sprint_1['id']}/complete-review", json={
        "review_notes": "Hasil sprint 1 sangat memuaskan, kualitas visual bagus."
    })
    assert complete_res.status_code == 200
    complete_data = complete_res.json()
    assert complete_data["status"] == "success"
    assert "retrospective" in complete_data
    assert len(complete_data["retrospective"]["went_well"]) > 0
    assert len(complete_data["retrospective"]["action_items"]) > 0
    assert complete_data["next_sprint"]["status"] == "pending_approval"
