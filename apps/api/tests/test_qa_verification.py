import pytest

def test_qa_verification_flow_and_dod_gate(client):
    # 1. Create a project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Cloud Storage Portal",
        "key": "CLOUD",
        "goal": "Portal penyimpanan cloud dengan enkripsi data dan integrasi S3",
        "github_repo_mode": "local"
    })
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 2. Get an active agent for assignment
    agents_res = client.get("/api/v1/workforce/agents")
    assert agents_res.status_code == 200
    agent_id = agents_res.json()[0]["id"]

    # 3. Create a work item with Acceptance Criteria and Definition of Done
    item_res = client.post(f"/api/v1/projects/{proj_id}/work-items", json={
        "project_id": proj_id,
        "title": "Implementasi Enkripsi File AES-256 Sisi Klien",
        "type": "story",
        "priority": "critical",
        "estimate_points": 5.0,
        "acceptance_criteria": [
            "File dienkripsi menggunakan kunci simetris 256-bit",
            "Kunci enkripsi tidak disimpan dalam bentuk plaintext di server",
            "Proses dekripsi menghasilkan hash SHA-256 yang identik dengan file asal"
        ],
        "definition_of_done": [
            "Semua pengujian unit test enkripsi lulus 100%",
            "Analisis keamanan statis (SAST) tidak menemukan kebocoran memori",
            "Kode lolos tinjauan arsitektur keamanan"
        ],
        "assignee_agent_id": agent_id
    })
    assert item_res.status_code == 201
    item_id = item_res.json()["id"]

    # Check initial QA status
    qa_status_res = client.get(f"/api/v1/work-items/{item_id}/qa-status")
    assert qa_status_res.status_code == 200
    assert qa_status_res.json()["qa_status"] == "pending"

    # 4. Move item to ready, then in_progress
    client.patch(f"/api/v1/work-items/{item_id}", json={"status": "ready"})
    client.patch(f"/api/v1/work-items/{item_id}", json={"status": "in_progress"})

    # 5. Move to in_review
    to_review = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "in_review"})
    assert to_review.status_code == 200
    assert to_review.json()["status"] == "in_review"

    # 6. Explicitly run QA verification via Sentinel (QA Lead)
    verify_res = client.post(f"/api/v1/work-items/{item_id}/verify-qa", json={
        "verified_by": "Sentinel (QA Lead)",
        "force_override": False
    })
    assert verify_res.status_code == 200
    verify_data = verify_res.json()
    assert verify_data["status"] == "passed"
    assert verify_data["total_checks"] >= 6  # 3 criteria + 3 DoD + checks
    assert verify_data["passed_checks"] == verify_data["total_checks"]
    assert "Sentinel" in verify_data["verified_by"]

    # 7. Transition to Done must now succeed
    to_done = client.patch(f"/api/v1/work-items/{item_id}", json={"status": "done"})
    assert to_done.status_code == 200
    assert to_done.json()["status"] == "done"
    assert to_done.json()["qa_status"] == "passed"

    # 8. Check audit trail
    audit_res = client.get("/api/v1/audit-events")
    assert audit_res.status_code == 200
    audits = audit_res.json()
    qa_audit = next((a for a in audits if a["action"] == "QA_VERIFICATION_PASSED"), None)
    assert qa_audit is not None
    assert qa_audit["actor"] == "Sentinel (QA Lead)"

def test_qa_verification_rejects_empty_criteria(client):
    # Create project and item without criteria
    proj_res = client.post("/api/v1/projects", json={
        "name": "Quick Fix Project",
        "key": "FIX",
        "github_repo_mode": "local"
    })
    proj_id = proj_res.json()["id"]

    # Item with no criteria cannot pass to ready or done
    item_res = client.post(f"/api/v1/projects/{proj_id}/work-items", json={
        "project_id": proj_id,
        "title": "Tugas Tanpa Kriteria",
        "type": "task",
        "acceptance_criteria": []
    })
    item_id = item_res.json()["id"]

    # QA verify directly should report failed criteria
    verify_res = client.post(f"/api/v1/work-items/{item_id}/verify-qa", json={
        "verified_by": "Sentinel (QA Lead)",
        "force_override": False
    })
    assert verify_res.status_code == 200
    assert verify_res.json()["status"] == "failed"
    assert any(c["type"] == "acceptance_criteria" and not c["passed"] for c in verify_res.json()["checks"])
