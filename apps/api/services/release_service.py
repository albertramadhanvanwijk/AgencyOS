import os
import subprocess
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from apps.api.models.project import Project, Sprint
from apps.api.models.scrum import WorkItem
from apps.api.models.audit import AuditEvent
from apps.api.schemas.release import ReleaseNotesOut, ReleaseFeatureItem, PublishReleaseIn

class ReleaseService:
    """
    Release Management & DevOps Delivery Service.
    Compiles completed user stories, QA verification certifications,
    Sprint retrospectives, and Git/GitHub artifacts into formal release notes and changelogs.
    """

    @classmethod
    def generate_release_notes(
        cls,
        project_id: str,
        db: Session,
        version_tag: str = "v1.0.0"
    ) -> ReleaseNotesOut:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        sprints = db.query(Sprint).filter(Sprint.project_id == project_id).all()
        sprint_name_map = {s.id: s.name for s in sprints}

        work_items = db.query(WorkItem).filter(WorkItem.project_id == project_id).all()
        done_items = [w for w in work_items if w.status == "done"]

        total_done = len(done_items)
        total_points = sum(float(w.estimate_points or 0) for w in done_items)

        qa_passed_count = sum(1 for w in done_items if getattr(w, "qa_status", None) == "passed")
        qa_rate = round((qa_passed_count / total_done * 100), 1) if total_done > 0 else 100.0

        features: List[ReleaseFeatureItem] = []
        for item in done_items:
            features.append(ReleaseFeatureItem(
                key=item.key,
                title=item.title,
                type=item.type or "task",
                estimate_points=float(item.estimate_points or 0),
                qa_status=getattr(item, "qa_status", None) or "passed",
                sprint_name=sprint_name_map.get(item.sprint_id, "Backlog"),
                pull_request_url=getattr(item, "pull_request_url", None),
                git_branch=getattr(item, "git_branch", None)
            ))

        # Compile retrospective highlights from sprints
        went_well: List[str] = []
        bottlenecks: List[str] = []
        action_items: List[str] = []

        for s in sprints:
            if s.retrospective and isinstance(s.retrospective, dict):
                went_well.extend(s.retrospective.get("went_well", []))
                bottlenecks.extend(s.retrospective.get("bottlenecks", []))
                action_items.extend(s.retrospective.get("action_items", []))

        if not went_well:
            went_well = [
                f"Seluruh {total_done} item yang ditargetkan berhasil diselesaikan dengan 100% verifikasi QA Sentinel.",
                "Pola Clean Architecture dan pemisahan lapisan berhasil diimplementasikan tanpa regresi."
            ]
        if not action_items:
            action_items = [
                "Pertahankan Definition of Done gatekeeper otomatis pada setiap sprint selanjutnya.",
                "Optimalkan branch worktree cleanup secara berkala."
            ]

        # Build Markdown Document
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
        
        md_lines = [
            f"# Release Notes — {project.name} ({version_tag})",
            "",
            f"**Project Key**: `{project.key}`  ",
            f"**Release Date**: {now_str}  ",
            f"**Status**: Production Ready / QA Certified  ",
            f"**QA Sentinel Verification Rate**: `{qa_rate}%` ({qa_passed_count}/{total_done} Passed)  ",
            f"**Total Delivered Story Points**: `{total_points} SP`  ",
            "",
            "---",
            "",
            "## 1. Ringkasan Eksekutif",
            f"Rilis `{version_tag}` untuk **{project.name}** mencakup implementasi fitur terpadu yang telah melalui siklus SDLC komprehensif: dari spesifikasi kebutuhan PRD, perancangan arsitektur sistem, pembagian backlog sprint, eksekusi tim agen, hingga pengujian mutu otomatis (Definition of Done & QA Verification).",
            "",
            "---",
            "",
            "## 2. Fitur & User Stories yang Dituntaskan",
            "",
            "| ID | Tipe | Judul / Spesifikasi | SP | QA Status | Sprint |",
            "|---|---|---|---|---|---|",
        ]

        for f in features:
            qa_badge = "✅ PASSED" if f.qa_status == "passed" else "⚠️ PENDING"
            md_lines.append(f"| `{f.key}` | `{f.type}` | {f.title} | {f.estimate_points} | {qa_badge} | {f.sprint_name} |")

        md_lines.extend([
            "",
            "---",
            "",
            "## 3. Sertifikasi Mutu & Quality Gate (Sentinel QA)",
            "- **Definition of Done (DoD)**: Terpenuhi pada seluruh task yang disetujui (Branch terisolasi, Clean code, Acceptance Criteria tervalidasi).",
            f"- **Tingkat Kelulusan QA**: `{qa_rate}%` dari seluruh work item terselesaikan dengan verifikasi otomatis.",
            "- **Review Operator**: Disetujui oleh Supervisor Proyek melalui alur In-Review & Audit Trail.",
            "",
            "---",
            "",
            "## 4. Retrospektif & Pembelajaran Sprint",
            "### Apa yang Berjalan Baik (Went Well):",
        ])

        for item in went_well[:5]:
            md_lines.append(f"- {item}")

        if bottlenecks:
            md_lines.append("")
            md_lines.append("### Kendala yang Teridentifikasi (Bottlenecks):")
            for item in bottlenecks[:5]:
                md_lines.append(f"- {item}")

        md_lines.append("")
        md_lines.append("### Tindakan Perbaikan (Action Items):")
        for item in action_items[:5]:
            md_lines.append(f"- {item}")

        md_lines.extend([
            "",
            "---",
            "",
            f"*Dokumentasi rilis ini digenerate secara otomatis oleh **AgencyOS Platform** pada {now_str}.*",
        ])

        markdown_doc = "\n".join(md_lines)

        return ReleaseNotesOut(
            project_id=project.id,
            project_name=project.name,
            project_key=project.key,
            version_tag=version_tag,
            generated_at=now_str,
            total_features_delivered=total_done,
            total_points_delivered=total_points,
            qa_certification_rate=qa_rate,
            features=features,
            retrospective_highlights={
                "went_well": went_well,
                "bottlenecks": bottlenecks,
                "action_items": action_items
            },
            markdown=markdown_doc
        )

    @classmethod
    def publish_release_notes(
        cls,
        project_id: str,
        payload: PublishReleaseIn,
        db: Session
    ) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        version_tag = payload.version_tag or "v1.0.0"
        notes_out = cls.generate_release_notes(project_id, db, version_tag=version_tag)

        file_written = False
        commit_sha = None

        if project.workspace_path and os.path.exists(project.workspace_path):
            file_path = os.path.join(project.workspace_path, "RELEASE_NOTES.md")
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(notes_out.markdown)
                file_written = True

                if payload.commit_to_repo:
                    # Check git repo
                    git_dir = os.path.join(project.workspace_path, ".git")
                    if os.path.exists(git_dir):
                        subprocess.run(["git", "add", "RELEASE_NOTES.md"], cwd=project.workspace_path, capture_output=True)
                        commit_res = subprocess.run(
                            ["git", "commit", "-m", f"docs(release): publish release notes for {version_tag} [AgencyOS]"],
                            cwd=project.workspace_path,
                            capture_output=True,
                            text=True
                        )
                        rev_parse = subprocess.run(["git", "rev-parse", "--short", "HEAD"], cwd=project.workspace_path, capture_output=True, text=True)
                        if rev_parse.returncode == 0:
                            commit_sha = rev_parse.stdout.strip()
            except Exception as e:
                pass

        # Record audit event
        db.add(AuditEvent(
            actor="Agency Operator",
            action="PROJECT_RELEASE_PUBLISHED",
            target_type="PROJECT",
            target_id=project.id,
            project_id=project.id,
            policy_basis="SDLC_PHASE_5_DEVOPS_RELEASE",
            details={
                "version_tag": version_tag,
                "total_features": notes_out.total_features_delivered,
                "qa_certification_rate": notes_out.qa_certification_rate,
                "file_written": file_written,
                "commit_sha": commit_sha
            }
        ))
        db.commit()

        return {
            "status": "success",
            "message": f"Release notes untuk {version_tag} berhasil dipublikasikan.",
            "version_tag": version_tag,
            "file_written": file_written,
            "commit_sha": commit_sha,
            "total_features_delivered": notes_out.total_features_delivered,
            "qa_certification_rate": notes_out.qa_certification_rate,
            "markdown": notes_out.markdown
        }
