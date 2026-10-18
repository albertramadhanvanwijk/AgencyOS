def test_workforce_agents(client):
    # 1. List pre-seeded agents
    res = client.get("/api/v1/workforce/agents")
    assert res.status_code == 200
    agents = res.json()
    assert len(agents) >= 4
    agent_names = [a["name"] for a in agents]
    assert "Aditya Pratama" in agent_names
    assert "Bayu Setiawan" in agent_names

    # 2. Inspect Aditya Pratama
    atlas = next(a for a in agents if a["name"] == "Aditya Pratama")
    assert atlas["lifecycle_state"] == "active"
    assert atlas["qualification_state"] == "passed"
    assert atlas["engine_adapter"] == "mock"
    assert len(atlas["skills"]) >= 2

    # 3. Create a new agent
    depts_res = client.get("/api/v1/organization/departments")
    roles_res = client.get("/api/v1/organization/roles")
    dept_id = depts_res.json()[0]["id"]
    role_id = roles_res.json()[0]["id"]

    new_agent = {
        "name": "Dimas Saputra",
        "title": "Junior Backend Agent",
        "department_id": dept_id,
        "role_id": role_id,
        "lifecycle_state": "draft",
        "availability_state": "available",
        "qualification_state": "not_tested",
        "max_concurrency": 1,
        "engine_adapter": "mock",
        "instructions": "Follow backend guidelines strictly.",
        "initial_skills": ["Python", "FastAPI"]
    }
    create_res = client.post("/api/v1/workforce/agents", json=new_agent)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["name"] == "Dimas Saputra"
    assert created["current_profile_version"] == 1
    assert len(created["skills"]) == 2

    # 4. Update instructions & verify version increment
    agent_id = created["id"]
    update_res = client.patch(f"/api/v1/workforce/agents/{agent_id}", json={
        "instructions": "Updated: Enforce strict type hints and Pydantic validation.",
        "change_rationale": "Updated persona rules"
    })
    assert update_res.status_code == 200
    updated = update_res.json()
    assert updated["current_profile_version"] == 2
