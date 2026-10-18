import pytest
from fastapi.testclient import TestClient
from apps.api.main import app

def test_departments_crud():
    with TestClient(app) as client:
        # 1. List pre-seeded departments
        res = client.get("/api/v1/organization/departments")
        assert res.status_code == 200
        depts = res.json()
        assert len(depts) >= 4
        dept_names = [d["name"] for d in depts]
        assert "Engineering" in dept_names
        assert "Product & Research" in dept_names

        # 2. Create new department
        new_dept = {
            "name": "Security & Infrastructure",
            "code": "SEC_INFRA",
            "description": "Cloud security and infra operations"
        }
        create_res = client.post("/api/v1/organization/departments", json=new_dept)
        assert create_res.status_code == 201
        created = create_res.json()
        assert created["code"] == "SEC_INFRA"

        # 3. Duplicate rejection
        dup_res = client.post("/api/v1/organization/departments", json=new_dept)
        assert dup_res.status_code == 400

def test_roles_crud():
    with TestClient(app) as client:
        # 1. List pre-seeded roles
        res = client.get("/api/v1/organization/roles")
        assert res.status_code == 200
        roles = res.json()
        assert len(roles) >= 4
        role_codes = [r["code"] for r in roles]
        assert "BE_ARCH_LEAD" in role_codes

        # 2. Create new role
        depts_res = client.get("/api/v1/organization/departments")
        dept_id = depts_res.json()[0]["id"]

        new_role = {
            "name": "DevSecOps Specialist",
            "code": "DEV_SEC_OPS",
            "department_id": dept_id,
            "description": "CI/CD and container security",
            "responsibilities": ["Pipeline security", "Audit"],
            "skills": ["Docker", "Kubernetes", "Linux"],
            "capability_categories": ["security", "platform"],
            "qualification_criteria": ["Container isolation verified"],
            "is_official": True
        }
        create_res = client.post("/api/v1/organization/roles", json=new_role)
        assert create_res.status_code == 201
        assert create_res.json()["code"] == "DEV_SEC_OPS"
