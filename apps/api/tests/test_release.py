import pytest
from apps.api.models.project import Project, Sprint
from apps.api.models.scrum import WorkItem
from apps.api.services.release_service import ReleaseService

def test_generate_release_notes(db_session):
    # Setup test project
    project = Project(
        name="Delivery Platform",
        key="DELIV",
        goal="Build automated delivery pipeline",
        status="active",
        workspace_path="./test_workspace_deliv"
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    # Setup sprint
    sprint = Sprint(
        project_id=project.id,
        name="Sprint 1 - Foundation",
        goal="Deliver core architecture",
        status="completed",
        retrospective={
            "went_well": ["Architecture clean and tested"],
            "bottlenecks": ["Setup time"],
            "action_items": ["Automate config"]
        }
    )
    db_session.add(sprint)
    db_session.commit()
    db_session.refresh(sprint)

    # Setup work items
    item1 = WorkItem(
        project_id=project.id,
        sprint_id=sprint.id,
        title="Setup Database Schemas",
        key="DELIV-1",
        status="done",
        type="task",
        estimate_points=3.0,
        qa_status="passed",
        acceptance_criteria=["Entity models defined"]
    )
    item2 = WorkItem(
        project_id=project.id,
        sprint_id=sprint.id,
        title="WIP Task",
        key="DELIV-2",
        status="in_progress",
        type="task",
        estimate_points=2.0
    )
    db_session.add_all([item1, item2])
    db_session.commit()

    # Generate release notes
    notes = ReleaseService.generate_release_notes(project.id, db_session, version_tag="v1.0.0")

    assert notes.project_id == project.id
    assert notes.version_tag == "v1.0.0"
    assert notes.total_features_delivered == 1
    assert notes.total_points_delivered == 3.0
    assert notes.qa_certification_rate == 100.0
    assert len(notes.features) == 1
    assert notes.features[0].key == "DELIV-1"
    assert "DELIV-1" in notes.markdown
    assert "Architecture clean and tested" in notes.markdown


def test_release_api_endpoints(client, db_session):
    project = Project(
        name="API Release Test",
        key="APIR",
        goal="Test endpoints",
        status="active",
        workspace_path="./test_workspace_apir"
    )
    db_session.add(project)
    db_session.commit()
    db_session.refresh(project)

    # GET release notes
    res = client.get(f"/api/v1/projects/{project.id}/release-notes?version_tag=v2.0.0")
    assert res.status_code == 200
    data = res.json()
    assert data["version_tag"] == "v2.0.0"
    assert data["project_key"] == "APIR"
    assert "markdown" in data

    # POST publish release
    pub_res = client.post(f"/api/v1/projects/{project.id}/publish-release", json={"version_tag": "v2.0.0", "commit_to_repo": False})
    assert pub_res.status_code == 200
    pub_data = pub_res.json()
    assert pub_data["status"] == "success"
    assert pub_data["version_tag"] == "v2.0.0"
