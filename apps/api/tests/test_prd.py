import pytest

def test_prd_discovery_generation_and_approval_flow(client):
    # 1. Create a project
    proj_res = client.post("/api/v1/projects", json={
        "name": "E-Commerce Toko Herbal",
        "key": "HERBAL",
        "goal": "Toko online produk herbal alami dengan checkout keranjang dan integrasi QRIS",
        "github_repo_mode": "local"
    })
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 2. Get initial PRD draft
    get_prd_res = client.get(f"/api/v1/projects/{proj_id}/prd")
    assert get_prd_res.status_code == 200
    prd_data = get_prd_res.json()
    assert prd_data["status"] == "draft"
    assert prd_data["version"] == 1
    assert "HERBAL" in prd_data["executive_summary"] or "E-Commerce" in prd_data["executive_summary"]

    # 3. Get Discovery Questions
    disc_res = client.get(f"/api/v1/projects/{proj_id}/prd/discovery")
    assert disc_res.status_code == 200
    questions = disc_res.json()
    assert len(questions) >= 4
    assert any("q_users" == q["id"] for q in questions)
    assert any("q_features" == q["id"] for q in questions)

    # 4. Generate Full PRD with Discovery Answers
    sample_answers = [
        {"question": questions[0]["question"], "answer": "1. Admin Toko (kelola produk), 2. Pelanggan (beli herbal)"},
        {"question": questions[1]["question"], "answer": "Katalog herbal, keranjang belanja, checkout QRIS Midtrans"},
        {"question": questions[2]["question"], "answer": "Mobile-first responsif, waktu muat < 1 detik"},
        {"question": questions[3]["question"], "answer": "Belum ada multi-currency dan belum ada aplikasi iOS native"}
    ]

    gen_res = client.post(f"/api/v1/projects/{proj_id}/prd/generate", json={
        "interview_answers": sample_answers
    })
    assert gen_res.status_code == 200
    full_prd = gen_res.json()
    assert full_prd["status"] == "in_review"
    assert full_prd["version"] == 2
    assert len(full_prd["target_users"]) >= 2
    assert len(full_prd["user_journeys"]) >= 2
    assert len(full_prd["functional_requirements"]) >= 4
    assert len(full_prd["non_functional_requirements"]) >= 3
    assert len(full_prd["scope_boundaries"]["in_scope"]) >= 2
    assert len(full_prd["scope_boundaries"]["out_of_scope"]) >= 1
    assert "frontend" in full_prd["tech_stack_recommendation"]

    # Check that FR items have testable criteria
    fr_01 = full_prd["functional_requirements"][0]
    assert fr_01["id"] == "FR-01"
    assert len(fr_01["criteria"]) > 0

    # 5. Human Sign-Off / Approve PRD
    approve_res = client.post(f"/api/v1/projects/{proj_id}/prd/approve", json={
        "approved_by": "Albert (Project Owner)"
    })
    assert approve_res.status_code == 200
    approved_prd = approve_res.json()
    assert approved_prd["status"] == "approved"
    assert approved_prd["approved_by"] == "Albert (Project Owner)"
    assert approved_prd["approved_at"] is not None

    # 6. Verify Audit Trail contains PRD events
    audit_res = client.get("/api/v1/audit-events")
    assert audit_res.status_code == 200
    actions = [e["action"] for e in audit_res.json()]
    assert "PRD_DOCUMENT_GENERATED" in actions
    assert "PRD_DOCUMENT_APPROVED" in actions
