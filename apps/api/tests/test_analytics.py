def test_sprint_burndown_analytics(client):
    res = client.get("/api/v1/projects/PRJ-CORE/analytics/burndown")
    assert res.status_code == 200
    data = res.json()

    assert "sprint_id" in data
    assert "sprint_name" in data
    assert data["total_points"] >= 0.0
    assert "days" in data
    assert len(data["days"]) > 0
    assert "ideal_remaining" in data["days"][0]
    assert data["health_status"] in ["ahead", "on_track", "behind"]
    assert "status_breakdown" in data
    assert "assignee_breakdown" in data


def test_project_velocity_analytics(client):
    res = client.get("/api/v1/projects/PRJ-CORE/analytics/velocity")
    assert res.status_code == 200
    data = res.json()

    assert data["project_id"] is not None
    assert "average_velocity" in data
    assert "predictability_rate" in data
    assert "sprints" in data
    assert len(data["sprints"]) >= 1
    sprint_0 = data["sprints"][0]
    assert "committed_points" in sprint_0
    assert "completed_points" in sprint_0
    assert "delivery_rate" in sprint_0
