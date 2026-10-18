import os
from pathlib import Path
from apps.api.core.config import settings

class WorkspaceSecurityError(Exception):
    """Raised when an operation attempts to escape the designated workspace boundary."""
    pass

class WorkspaceManager:
    """
    Manages isolated filesystem workspaces for projects and execution runs.
    Enforces strict path canonicalization, preventing directory traversal and
    unauthorized path access outside bounded project workspaces.
    """

    def __init__(self, root_dir: str | Path | None = None):
        self.root_dir = Path(root_dir or settings.WORKSPACE_ROOT).resolve()
        self.root_dir.mkdir(parents=True, exist_ok=True)

    def get_project_workspace(self, project_id: str) -> Path:
        """
        Returns canonical path for a project workspace.
        Ensures project_id does not contain traversal tokens.
        """
        self._validate_identifier(project_id, "project_id")
        project_dir = (self.root_dir / project_id).resolve()
        self._assert_contained(project_dir, self.root_dir)
        project_dir.mkdir(parents=True, exist_ok=True)
        return project_dir

    def create_run_workspace(self, project_id: str, run_id: str) -> Path:
        """
        Creates an isolated run workspace under:
        <root_dir>/<project_id>/runs/<run_id>/
        """
        self._validate_identifier(project_id, "project_id")
        self._validate_identifier(run_id, "run_id")

        project_dir = self.get_project_workspace(project_id)
        run_dir = (project_dir / "runs" / run_id).resolve()
        self._assert_contained(run_dir, project_dir)
        run_dir.mkdir(parents=True, exist_ok=True)
        return run_dir

    def resolve_safe_path(self, base_dir: Path, relative_path: str) -> Path:
        """
        Resolves relative_path within base_dir.
        Raises WorkspaceSecurityError if the resolved path escapes base_dir.
        """
        base_dir_resolved = Path(base_dir).resolve()
        
        # Disallow null bytes or absolute path injections
        if "\0" in relative_path:
            raise WorkspaceSecurityError("Null bytes are not permitted in workspace paths.")
        
        # Check for absolute path injection
        test_path = Path(relative_path)
        if test_path.is_absolute():
            raise WorkspaceSecurityError(f"Absolute paths are forbidden: '{relative_path}'")

        target_path = (base_dir_resolved / relative_path).resolve()
        self._assert_contained(target_path, base_dir_resolved)
        return target_path

    def write_file_safely(self, base_dir: Path, relative_path: str, content: str | bytes) -> Path:
        """
        Writes content to a file strictly within base_dir.
        Creates parent directories if necessary.
        """
        safe_path = self.resolve_safe_path(base_dir, relative_path)
        safe_path.parent.mkdir(parents=True, exist_ok=True)
        
        if isinstance(content, str):
            safe_path.write_text(content, encoding="utf-8")
        else:
            safe_path.write_bytes(content)
            
        return safe_path

    def read_file_safely(self, base_dir: Path, relative_path: str) -> str:
        """
        Reads string content from a file strictly within base_dir.
        """
        safe_path = self.resolve_safe_path(base_dir, relative_path)
        if not safe_path.is_file():
            raise FileNotFoundError(f"File not found: {relative_path}")
        return safe_path.read_text(encoding="utf-8")

    def _validate_identifier(self, identifier: str, field_name: str) -> None:
        """
        Validates that an identifier does not contain path separators or traversal tokens.
        """
        if not identifier or not isinstance(identifier, str):
            raise WorkspaceSecurityError(f"{field_name} must be a non-empty string.")
        
        if "/" in identifier or "\\" in identifier or ".." in identifier or "\0" in identifier:
            raise WorkspaceSecurityError(
                f"Directory traversal or invalid character detected in {field_name}: '{identifier}'"
            )

    def _assert_contained(self, child: Path, parent: Path) -> None:
        """
        Asserts that child is strictly inside parent.
        """
        try:
            # child.relative_to(parent) raises ValueError if child is not a descendant of parent
            child.relative_to(parent)
        except ValueError:
            raise WorkspaceSecurityError(
                f"Security breach: Path '{child}' escapes designated boundary '{parent}'"
            )

workspace_manager = WorkspaceManager()
