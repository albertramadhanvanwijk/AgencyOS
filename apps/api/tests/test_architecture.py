import pytest

def test_architecture_generation_and_approval_flow(client):
    # 1. Create a project
    proj_res = client.post("/api/v1/projects", json={
        "name": "Fintech Payment Gateway",
        "key": "PAYNET",
        "goal": "Gerbang pembayaran multi-channel dengan integrasi e-wallet dan kartu kredit",
        "github_repo_mode": "local"
    })
    assert proj_res.status_code == 201
    proj_id = proj_res.json()["id"]

    # 2. Get initial architecture draft
    arch_res = client.get(f"/api/v1/projects/{proj_id}/architecture")
    assert arch_res.status_code == 200
    arch_data = arch_res.json()
    assert arch_data["status"] == "draft"
    assert arch_data["version"] >= 1
    assert "Multi-tier" in arch_data["system_overview"]
    assert "frontend" in arch_data["tech_stack"]
    assert len(arch_data["database_entities"]) >= 2
    assert len(arch_data["api_endpoints"]) >= 3
    assert len(arch_data["component_modules"]) >= 4
    assert len(arch_data["security_specs"]) >= 4
    assert "graph TD" in arch_data["data_flow_diagram"]

    # 3. Generate architecture with custom architect notes
    custom_notes = "Gunakan micro-batch processing untuk rekonsiliasi settlement harian."
    gen_res = client.post(f"/api/v1/projects/{proj_id}/architecture/generate", json={
        "custom_notes": custom_notes
    })
    assert gen_res.status_code == 200
    gen_data = gen_res.json()
    assert gen_data["status"] == "draft"
    assert custom_notes in gen_data["system_overview"]
    assert gen_data["version"] == arch_data["version"] + 1

    # Verify database entities specification
    user_entity = next((e for e in gen_data["database_entities"] if e["name"] == "User"), None)
    assert user_entity is not None
    assert user_entity["table_name"] == "users"
    assert any(f["name"] == "email" for f in user_entity["fields"])

    # Verify API endpoints specification
    login_ep = next((ep for ep in gen_data["api_endpoints"] if "/login" in ep["path"]), None)
    assert login_ep is not None
    assert login_ep["method"] == "POST"

    # 4. Human Architect Sign-off Gate
    appr_res = client.post(f"/api/v1/projects/{proj_id}/architecture/approve", json={
        "approved_by": "Chief Software Architect"
    })
    assert appr_res.status_code == 200
    appr_data = appr_res.json()
    assert appr_data["status"] == "approved"
    assert appr_data["approved_by"] == "Chief Software Architect"
    assert appr_data["approved_at"] is not None

    # 5. Check Audit Event
    audit_res = client.get("/api/v1/audit-events")
    assert audit_res.status_code == 200
    audit_items = audit_res.json()
    matching_audit = next((a for a in audit_items if a["action"] == "ARCHITECTURE_DOCUMENT_APPROVED"), None)
    assert matching_audit is not None
    assert matching_audit["actor"] == "Chief Software Architect"
