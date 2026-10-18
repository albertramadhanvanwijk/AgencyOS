import pytest
import tempfile
from pathlib import Path
from apps.api.services.workspace_manager import WorkspaceManager, WorkspaceSecurityError

@pytest.fixture
def temp_workspace():
    with tempfile.TemporaryDirectory() as tmp_dir:
        yield WorkspaceManager(root_dir=tmp_dir)

def test_project_workspace_creation(temp_workspace):
    ws = temp_workspace.get_project_workspace("prj-test-101")
    assert ws.exists()
    assert ws.is_dir()
    assert ws.name == "prj-test-101"

def test_run_workspace_creation(temp_workspace):
    run_ws = temp_workspace.create_run_workspace("prj-test-101", "run-abc-123")
    assert run_ws.exists()
    assert run_ws.is_dir()
    assert run_ws.name == "run-abc-123"
    assert "runs" in str(run_ws)

def test_traversal_prevention_in_identifiers(temp_workspace):
    with pytest.raises(WorkspaceSecurityError, match="Directory traversal"):
        temp_workspace.get_project_workspace("../escaped")

    with pytest.raises(WorkspaceSecurityError, match="Directory traversal"):
        temp_workspace.create_run_workspace("prj-101", "../../escaped")

    with pytest.raises(WorkspaceSecurityError, match="Directory traversal"):
        temp_workspace.create_run_workspace("..\\windows\\system32", "run-1")

def test_safe_path_resolution(temp_workspace):
    run_ws = temp_workspace.create_run_workspace("prj-alpha", "run-001")
    
    # Valid relative paths
    safe_file = temp_workspace.resolve_safe_path(run_ws, "src/components/Header.tsx")
    assert safe_file.parent.name == "components"

    # Traversal attempt with ../ escaping run_ws
    with pytest.raises(WorkspaceSecurityError, match="Security breach"):
        temp_workspace.resolve_safe_path(run_ws, "../../../outside.txt")

    # Absolute path attempt
    with pytest.raises(WorkspaceSecurityError, match="Absolute paths are forbidden"):
        temp_workspace.resolve_safe_path(run_ws, "C:/Windows/System32/cmd.exe")

    # Null byte attempt
    with pytest.raises(WorkspaceSecurityError, match="Null bytes are not permitted"):
        temp_workspace.resolve_safe_path(run_ws, "file.txt\0.exe")

def test_safe_file_write_and_read(temp_workspace):
    run_ws = temp_workspace.create_run_workspace("prj-beta", "run-002")
    
    written_path = temp_workspace.write_file_safely(
        run_ws,
        "artifacts/patch.diff",
        "[SIMULATED] Git diff for feature branch"
    )
    assert written_path.exists()
    
    content = temp_workspace.read_file_safely(run_ws, "artifacts/patch.diff")
    assert "[SIMULATED]" in content
