from abc import ABC, abstractmethod
from pathlib import Path
from typing import Dict, Any, Optional
from sqlalchemy.orm import Session
from apps.api.models.execution import ExecutionRun
from apps.api.models.scrum import WorkItem

class EngineAdapter(ABC):
    """
    Abstract base class defining the contract for AI workforce execution engines.
    Live engines (OpenAI Codex, Claude Code, Gemini CLI, Cursor, etc.) and
    simulation adapters must conform to this interface.
    """

    @property
    @abstractmethod
    def adapter_name(self) -> str:
        """Name of the adapter."""
        pass

    @property
    @abstractmethod
    def is_simulated(self) -> bool:
        """Indicates whether this engine is simulated/mock or live."""
        pass

    @abstractmethod
    def get_capabilities(self) -> Dict[str, Any]:
        """
        Discovers capabilities supported by this adapter:
        - diff_emission: bool
        - test_runner: bool
        - cancellation: bool
        - quality_gates: bool
        - interactive_shell: bool
        """
        pass

    @abstractmethod
    def validate_config(self, config: Dict[str, Any]) -> bool:
        """Validates adapter-specific configuration before starting a run."""
        pass

    @abstractmethod
    def execute_run(
        self,
        run: ExecutionRun,
        work_item: WorkItem,
        workspace_dir: Path,
        db: Session
    ) -> ExecutionRun:
        """
        Executes the run through its multi-step lifecycle, persisting logs,
        artifacts, and quality check results directly to the database.
        """
        pass

    @abstractmethod
    def cancel_run(self, run: ExecutionRun, db: Session) -> bool:
        """Cancels an ongoing execution run."""
        pass

    @abstractmethod
    def health_check(self) -> Dict[str, Any]:
        """Verifies engine adapter availability and operational status."""
        pass
