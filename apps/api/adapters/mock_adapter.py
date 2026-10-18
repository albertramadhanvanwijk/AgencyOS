import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any
from sqlalchemy.orm import Session

from apps.api.adapters.base import EngineAdapter
from apps.api.models.execution import ExecutionRun, RunLog, RunArtifact, QualityCheckResult
from apps.api.models.scrum import WorkItem
from apps.api.services.workspace_manager import workspace_manager

class MockEngineAdapter(EngineAdapter):
    """
    Deterministic simulated execution engine adapter for AgencyOS.
    Executes multi-step AI workforce simulations safely within bounded workspaces
    without external API calls or destructive effects. All outputs are explicitly
    tagged [SIMULATED].
    """

    @property
    def adapter_name(self) -> str:
        return "MockEngineAdapter"

    @property
    def is_simulated(self) -> bool:
        return True

    def get_capabilities(self) -> Dict[str, Any]:
        return {
            "diff_emission": True,
            "test_runner": True,
            "cancellation": True,
            "quality_gates": True,
            "interactive_shell": False,
            "simulated": True,
            "supported_models": ["mock-gpt-4o", "mock-claude-3-7-sonnet", "mock-gemini-2-flash"]
        }

    def validate_config(self, config: Dict[str, Any]) -> bool:
        # Mock engine requires no external credentials
        return True

    def health_check(self) -> Dict[str, Any]:
        return {
            "status": "healthy",
            "adapter": self.adapter_name,
            "simulated": True,
            "message": "Mock engine adapter is ready for deterministic execution runs."
        }

    def cancel_run(self, run: ExecutionRun, db: Session) -> bool:
        if run.status in ["succeeded", "failed", "cancelled"]:
            return False
        
        run.status = "cancelled"
        run.completed_at = datetime.now(timezone.utc)
        self._add_log(db, run.id, "cancelled", "WARN", "[SIMULATED] Execution run cancelled by operator.")
        db.commit()
        return True

    def execute_run(
        self,
        run: ExecutionRun,
        work_item: WorkItem,
        workspace_dir: Path,
        db: Session
    ) -> ExecutionRun:
        """
        Executes the run through deterministic stages:
        1. PREPARING: Workspace validation & requirement parsing
        2. RUNNING: Agent reasoning & simulated code emission
        3. COLLECTING_RESULTS: Generating git diff and test artifacts
        4. QUALITY_CHECKS: Running mock lint, security, and test checks
        5. REVIEW / SUCCEEDED: Setting final completion status
        """
        try:
            # --- STAGE 1: PREPARING ---
            run.status = "preparing"
            db.commit()
            self._add_log(db, run.id, "preparing", "INFO", f"[SIMULATED] Initializing isolated run workspace at: {workspace_dir}")
            self._add_log(db, run.id, "preparing", "INFO", f"[SIMULATED] Verifying work item {work_item.key}: '{work_item.title}'")
            self._add_log(db, run.id, "preparing", "INFO", f"[SIMULATED] Loaded {len(work_item.acceptance_criteria)} acceptance criteria.")

            # --- STAGE 2: RUNNING ---
            run.status = "running"
            db.commit()
            self._add_log(db, run.id, "running", "INFO", "[SIMULATED] Agent starting task decomposition and code synthesis...")
            for idx, criterion in enumerate(work_item.acceptance_criteria, 1):
                self._add_log(db, run.id, "running", "INFO", f"[SIMULATED] Implementing Criterion #{idx}: {criterion}")
            self._add_log(db, run.id, "running", "INFO", "[SIMULATED] Code generation completed. Preparing filesystem changes...")

            # --- STAGE 3: COLLECTING RESULTS ---
            run.status = "collecting_results"
            db.commit()
            self._add_log(db, run.id, "collecting_results", "INFO", "[SIMULATED] Generating git patch diff and execution artifacts...")

            # Generate Mock Diff
            diff_content = self._generate_mock_diff(work_item)
            diff_path = workspace_manager.write_file_safely(workspace_dir, "artifacts/patch.diff", diff_content)
            
            diff_artifact = RunArtifact(
                run_id=run.id,
                name="patch.diff",
                artifact_type="diff",
                file_path=str(diff_path),
                size_bytes=len(diff_content.encode("utf-8")),
                content_preview=diff_content[:2000],
                is_simulated=True
            )
            db.add(diff_artifact)

            # Generate Mock Test Results
            test_results_data = {
                "simulated": True,
                "framework": "pytest-simulated",
                "total": 14,
                "passed": 14,
                "failed": 0,
                "duration_seconds": 1.24,
                "tests": [
                    {"name": f"test_{work_item.key.lower()}_acceptance_criteria_1", "status": "passed", "duration": 0.08},
                    {"name": f"test_{work_item.key.lower()}_acceptance_criteria_2", "status": "passed", "duration": 0.12},
                    {"name": f"test_{work_item.key.lower()}_boundary_validation", "status": "passed", "duration": 0.05},
                    {"name": f"test_{work_item.key.lower()}_security_containment", "status": "passed", "duration": 0.09},
                ]
            }
            test_results_json = json.dumps(test_results_data, indent=2)
            test_path = workspace_manager.write_file_safely(workspace_dir, "artifacts/test_results.json", test_results_json)

            test_artifact = RunArtifact(
                run_id=run.id,
                name="test_results.json",
                artifact_type="test_results",
                file_path=str(test_path),
                size_bytes=len(test_results_json.encode("utf-8")),
                content_preview=test_results_json,
                is_simulated=True
            )
            db.add(test_artifact)

            # Generate Execution Summary Markdown
            summary_content = (
                f"# [SIMULATED] Execution Summary: {work_item.key}\n\n"
                f"**Title**: {work_item.title}\n"
                f"**Engine**: MockEngineAdapter (Deterministic Simulation)\n"
                f"**Workspace**: `{workspace_dir}`\n\n"
                f"## Verified Acceptance Criteria\n"
            )
            for c in work_item.acceptance_criteria:
                summary_content += f"- [x] {c}\n"
            
            summary_content += (
                f"\n## Quality Status\n"
                f"- Lint: Passed (0 issues)\n"
                f"- Unit Tests: 14/14 Passed (100%)\n"
                f"- Security Scan: Clean (No vulnerabilities)\n"
            )

            summary_path = workspace_manager.write_file_safely(workspace_dir, "artifacts/execution_summary.md", summary_content)
            summary_artifact = RunArtifact(
                run_id=run.id,
                name="execution_summary.md",
                artifact_type="summary",
                file_path=str(summary_path),
                size_bytes=len(summary_content.encode("utf-8")),
                content_preview=summary_content,
                is_simulated=True
            )
            db.add(summary_artifact)

            # --- STAGE 4: QUALITY CHECKS ---
            run.status = "quality_checks"
            db.commit()
            self._add_log(db, run.id, "quality_checks", "INFO", "[SIMULATED] Running quality gate validations (Lint, Typecheck, Security, Tests)...")

            checks = [
                ("LINT", "passed", {"linter": "eslint-mock", "errors": 0, "warnings": 0}),
                ("TYPECHECK", "passed", {"typechecker": "tsc-mock", "errors": 0}),
                ("UNIT_TESTS", "passed", {"total": 14, "passed": 14, "failed": 0}),
                ("SECURITY_SCAN", "passed", {"scanner": "bandit-semgrep-mock", "vulnerabilities": 0, "level": "HIGH_SAFE"}),
            ]

            for check_name, status, details in checks:
                qc = QualityCheckResult(
                    run_id=run.id,
                    check_name=check_name,
                    status=status,
                    details=details,
                    is_simulated=True
                )
                db.add(qc)
                self._add_log(db, run.id, "quality_checks", "INFO", f"[SIMULATED] Quality Gate '{check_name}': {status.upper()}")

            # --- STAGE 5: REVIEW / SUCCEEDED ---
            run.status = "review"
            run.completed_at = datetime.now(timezone.utc)
            self._add_log(db, run.id, "review", "INFO", "[SIMULATED] Execution completed successfully. Ready for supervisor review.")
            db.commit()
            return run

        except Exception as e:
            run.status = "failed"
            run.error_message = str(e)
            run.completed_at = datetime.now(timezone.utc)
            self._add_log(db, run.id, "failed", "ERROR", f"[SIMULATED] Execution failed: {str(e)}")
            db.commit()
            return run

    def _add_log(self, db: Session, run_id: str, stage: str, level: str, message: str) -> None:
        log = RunLog(
            run_id=run_id,
            stage=stage,
            level=level,
            message=message,
            is_simulated=True
        )
        db.add(log)
        db.flush()

    def _generate_mock_diff(self, work_item: WorkItem) -> str:
        return f"""# [SIMULATED] Git Patch Diff for {work_item.key}
# Work Item: {work_item.title}
# Generated by MockEngineAdapter

diff --git a/src/features/{work_item.key.lower()}.py b/src/features/{work_item.key.lower()}.py
new file mode 100644
--- /dev/null
+++ b/src/features/{work_item.key.lower()}.py
@@ -0,0 +1,24 @@
+\"\"\"
+[SIMULATED] Implementation for {work_item.key}
+Title: {work_item.title}
+\"\"\"
+
+def execute_{work_item.key.lower().replace('-', '_')}():
+    # Simulated implementation satisfying acceptance criteria:
+    results = []
+    # Criteria processed:
+    # {', '.join(work_item.acceptance_criteria[:3])}
+    return {{"status": "success", "work_item": "{work_item.key}"}}
"""
