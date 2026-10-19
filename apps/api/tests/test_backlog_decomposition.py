import pytest

def test_backlog_decomposition_gate_and_execution_flow(client):
    # 1. Create a project
    proj_res = client.post("/api/v1/projects", json={
        "name": "SaaS CRM Enterprise",
        "key": "CRM",
        "goal": "Sistem CRM multi-tenant dengan manajemen prospek, pipeline penjualan, dan pelaporan analitik",
        "github_repo_mode": "local"
    })
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 2. Check SDLC Gates initially (PRD is draft, Arch is missing/draft)
    gates_res = client.get(f"/api/v1/projects/{proj_id}/backlog/gates")
    assert gates_res.status_code == 200
    gates_data = gates_res.json()
    assert gates_data["can_decompose"] is False
    assert gates_data["prd_approved"] is False
    assert gates_data["architecture_approved"] is False

    # 3. Attempting to decompose without approval triggers HTTP 400 gate lock
    fail_res = client.post(f"/api/v1/projects/{proj_id}/backlog/decompose", json={
        "force_override_gate": False
    })
    assert fail_res.status_code == 400
    assert "Gerbang Kualitas SDLC Terkunci" in fail_res.json()["detail"]

    # 4. Formulate and Approve PRD
    client.post(f"/api/v1/projects/{proj_id}/prd/generate", json={
        "interview_answers": [
            {"question": "Target Users", "answer": "1. Sales Manager, 2. Sales Rep"},
            {"question": "Core Features", "answer": "Pipeline Kanban, Lead scoring, Email sync"},
            {"question": "Non-Functional", "answer": "Response time < 500ms"},
            {"question": "Scope", "answer": "No billing integration yet"}
        ]
    })
    approve_prd = client.post(f"/api/v1/projects/{proj_id}/prd/approve", json={
        "approved_by": "Product Owner Dewi"
    })
    assert approve_prd.status_code == 200
    assert approve_prd.json()["status"] == "approved"

    # 5. Formulate and Approve Architecture
    client.post(f"/api/v1/projects/{proj_id}/architecture/generate", json={
        "custom_notes": "Use multi-tenant database partitioning."
    })
    approve_arch = client.post(f"/api/v1/projects/{proj_id}/architecture/approve", json={
        "approved_by": "Architect Budi"
    })
    assert approve_arch.status_code == 200
    assert approve_arch.json()["status"] == "approved"

    # 6. Verify Gate is now PASSED
    gates_res2 = client.get(f"/api/v1/projects/{proj_id}/backlog/gates")
    assert gates_res2.status_code == 200
    gates_data2 = gates_res2.json()
    assert gates_data2["can_decompose"] is True
    assert gates_data2["prd_approved"] is True
    assert gates_data2["architecture_approved"] is True

    # 7. Execute Backlog Decomposition from Specs
    decomp_res = client.post(f"/api/v1/projects/{proj_id}/backlog/decompose", json={
        "force_override_gate": False
    })
    assert decomp_res.status_code == 200
    decomp_data = decomp_res.json()
    assert decomp_data["status"] == "success"
    assert decomp_data["epics_count"] >= 1
    assert decomp_data["stories_count"] >= 4
    assert decomp_data["tasks_count"] >= 4
    assert decomp_data["total_story_points"] >= 20.0
    assert len(decomp_data["sprints"]) == 3

    # Sprint 1 must be pending approval awaiting kickoff
    sprint_1 = next(s for s in decomp_data["sprints"] if "Sprint 1" in s["name"])
    assert sprint_1["status"] == "pending_approval"

    # 8. Verify Work Items in Database
    items_res = client.get(f"/api/v1/projects/{proj_id}/work-items")
    assert items_res.status_code == 200
    items = items_res.json()
    assert len(items) >= 8

    # Verify at least one item has acceptance criteria and DoD
    story_item = next((i for i in items if i["type"] == "story"), None)
    assert story_item is not None
    assert len(story_item["acceptance_criteria"]) > 0
    assert len(story_item["definition_of_done"]) > 0
    assert story_item["estimate_points"] > 0

    # 9. Verify Audit Event
    audit_res = client.get("/api/v1/audit-events")
    assert audit_res.status_code == 200
    audit_items = audit_res.json()
    decomp_audit = next((a for a in audit_items if a["action"] == "BACKLOG_DECOMPOSED_FROM_SPECS"), None)
    assert decomp_audit is not None
    assert "Dewi Lestari" in decomp_audit["actor"]
