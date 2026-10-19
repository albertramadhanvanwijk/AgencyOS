import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from apps.api.models import Project, Sprint, WorkItem, WorkItemDependency, AIAgent, AuditEvent
from apps.api.models.project import ProjectPRD, ProjectArchitecture

logger = logging.getLogger(__name__)

class BacklogDecompositionService:
    """
    Backlog Decomposition & Sprint Packaging Engine.
    Transforms approved Product Requirement Documents (PRD) and Technical Design Documents (TDD)
    into structured Epics, User Stories, Acceptance Criteria (DoD), Fibonacci Story Points,
    and progressive Sprints with explicit technical dependencies.
    """

    @classmethod
    def check_gates(cls, project_id: str, db: Session) -> Dict[str, Any]:
        """Check whether the project satisfies SDLC gates for backlog decomposition."""
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        prd = db.query(ProjectPRD).filter(ProjectPRD.project_id == project_id).first()
        arch = db.query(ProjectArchitecture).filter(ProjectArchitecture.project_id == project_id).first()

        prd_status = prd.status if prd else "missing"
        arch_status = arch.status if arch else "missing"

        can_decompose = (prd_status == "approved" and arch_status == "approved")

        return {
            "project_id": project_id,
            "project_name": project.name,
            "prd_status": prd_status,
            "prd_approved": prd_status == "approved",
            "architecture_status": arch_status,
            "architecture_approved": arch_status == "approved",
            "can_decompose": can_decompose,
            "gate_message": (
                "Gerbang Kualitas SDLC Lulus. PRD dan Arsitektur telah disetujui."
                if can_decompose
                else "Gerbang Kualitas: Selesaikan dan setujui Dokumen PRD dan Desain Arsitektur sebelum memecah Backlog."
            )
        }

    @classmethod
    def decompose_project(
        cls, project_id: str, force_override_gate: bool, db: Session
    ) -> Dict[str, Any]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        prd = db.query(ProjectPRD).filter(ProjectPRD.project_id == project_id).first()
        arch = db.query(ProjectArchitecture).filter(ProjectArchitecture.project_id == project_id).first()

        # Enforce SDLC Gate
        prd_approved = bool(prd and prd.status == "approved")
        arch_approved = bool(arch and arch.status == "approved")

        if not (prd_approved and arch_approved) and not force_override_gate:
            missing_parts = []
            if not prd_approved:
                missing_parts.append("Dokumen PRD (Tahap 1)")
            if not arch_approved:
                missing_parts.append("Desain Arsitektur Teknis (Tahap 2)")

            raise HTTPException(
                status_code=400,
                detail=(
                    f"Gerbang Kualitas SDLC Terkunci: {', '.join(missing_parts)} belum disetujui (Approved). "
                    "Pastikan kedua dokumen spesifikasi telah ditandatangani sebelum memecah Backlog & Sprints."
                )
            )

        # Gather inputs from PRD & Architecture
        functional_requirements = prd.functional_requirements if prd else []
        db_entities = arch.database_entities if arch else []
        api_endpoints = arch.api_endpoints if arch else []
        security_specs = arch.security_specs if arch else []

        # Find agents for assignment
        agents = db.query(AIAgent).filter(AIAgent.lifecycle_state == "active").all()
        fe_agent = next((a for a in agents if "frontend" in (a.name or "").lower() or "bayu" in (a.name or "").lower() or "kairo" in (a.name or "").lower()), agents[0] if agents else None)
        be_agent = next((a for a in agents if "backend" in (a.name or "").lower() or "atlas" in (a.name or "").lower() or "aditya" in (a.name or "").lower()), agents[0] if agents else None)
        qa_agent = next((a for a in agents if "qa" in (a.name or "").lower() or "sentinel" in (a.name or "").lower() or "fajar" in (a.name or "").lower()), agents[0] if agents else None)

        p_key = project.key
        p_name = project.name
        counter = project.item_counter or 0

        # Group functional requirements by module to create Epics
        modules_map: Dict[str, List[Dict[str, Any]]] = {}
        for fr in functional_requirements:
            mod = fr.get("module", "Core")
            modules_map.setdefault(mod, []).append(fr)

        # If no FRs found (e.g. forced override without PRD), provide baseline
        if not modules_map:
            modules_map["Core Platform"] = [{
                "id": "FR-01",
                "module": "Core Platform",
                "title": f"Fitur Operasional Utama {p_name}",
                "description": project.goal or f"Sistem operasional {p_name}",
                "priority": "high",
                "criteria": ["Modul utama beroperasi normal", "Validasi data input berhasil"]
            }]

        # Clean existing un-started sprints & items if regenerating
        existing_sprints = db.query(Sprint).filter(Sprint.project_id == project.id).all()
        # We reuse or create 3 progressive sprints
        sprint_defs = [
            {
                "name": "Sprint 1: Fondasi Teknis, Skema & Core API",
                "goal": f"Pondasi arsitektur, skema tabel relasional, otentikasi, dan AppShell untuk {p_name}.",
                "capacity": 20,
                "status": "pending_approval"
            },
            {
                "name": "Sprint 2: Fitur Bisnis Utama & Integrasi",
                "goal": f"Pengembangan fitur fungsional utama berdasarkan spesifikasi PRD resmi {p_name}.",
                "capacity": 20,
                "status": "planning"
            },
            {
                "name": "Sprint 3: Pengerasan Keamanan, QA & Rilis",
                "goal": f"Verifikasi mutu, penanganan edge-cases, audit logging, dan kesiapan rilis produksi {p_name}.",
                "capacity": 15,
                "status": "planning"
            }
        ]

        sprints = []
        for idx, s_def in enumerate(sprint_defs):
            if idx < len(existing_sprints):
                sp = existing_sprints[idx]
                sp.name = s_def["name"]
                sp.goal = s_def["goal"]
                sp.capacity_points = s_def["capacity"]
                sp.status = s_def["status"]
            else:
                sp = Sprint(
                    project_id=project.id,
                    name=s_def["name"],
                    goal=s_def["goal"],
                    capacity_points=s_def["capacity"],
                    status=s_def["status"]
                )
                db.add(sp)
                db.flush()
            sprints.append(sp)

        sprint_1, sprint_2, sprint_3 = sprints[0], sprints[1], sprints[2]

        created_epics = []
        created_stories = []
        created_tasks = []

        # 1. Create Epics per module
        epic_objects: Dict[str, WorkItem] = {}
        for mod_name, fr_list in modules_map.items():
            counter += 1
            epic_key = f"{p_key}-{counter}"
            epic_item = WorkItem(
                project_id=project.id,
                sprint_id=None,  # Epics span across sprints
                key=epic_key,
                type="epic",
                title=f"Epic: Modul {mod_name}",
                description=f"Kumpulan User Stories dan tugas teknis untuk modul domain {mod_name}.",
                status="backlog",
                priority="high",
                estimate_points=float(len(fr_list) * 5),
                acceptance_criteria=[f"Seluruh kebutuhan modul {mod_name} terimplementasi dan terverifikasi"],
                definition_of_done=["Semua story dalam epic ini berstatus Done"],
                assignee_agent_id=be_agent.id if be_agent else None,
                git_branch=f"agencyos/{p_key}/{epic_key}-epic"
            )
            db.add(epic_item)
            db.flush()
            epic_objects[mod_name] = epic_item
            created_epics.append(epic_item)

        # 2. Sprint 1 Items: Technical Foundation Tasks
        # A. Database Schema Task
        counter += 1
        db_key = f"{p_key}-{counter}"
        table_names = [e.get("name", "Table") for e in db_entities] if db_entities else ["Users", "AuditLogs"]
        db_task = WorkItem(
            project_id=project.id,
            sprint_id=sprint_1.id,
            key=db_key,
            type="task",
            title=f"Implementasi Skema Database ORM & Migrasi: {', '.join(table_names[:3])}",
            description=(
                f"Membuat model database SQLAlchemy, migrasi Alembic, relasi foreign key, "
                f"dan index untuk tabel: {', '.join(table_names)} sesuai dokumen arsitektur."
            ),
            status="ready",
            priority="critical",
            estimate_points=5.0,
            acceptance_criteria=[
                "Model ORM terdefinisi dengan tipe data dan constraint tepat",
                "File migrasi berhasil di-generate dan dijalankan tanpa konflik",
                "Koneksi pooling dan cascading delete teruji"
            ],
            definition_of_done=["Pytest database test pass", "Zero unhandled migration errors"],
            assignee_agent_id=be_agent.id if be_agent else None,
            git_branch=f"agencyos/{p_key}/{db_key}-db-schema"
        )
        db.add(db_task)
        db.flush()
        created_tasks.append(db_task)

        # B. Core API & Auth Task
        counter += 1
        api_key = f"{p_key}-{counter}"
        api_task = WorkItem(
            project_id=project.id,
            sprint_id=sprint_1.id,
            key=api_key,
            type="task",
            title="Implementasi REST API Gateway & Middleware Autentikasi JWT",
            description=(
                "Membangun router FastAPI untuk endpoint otentikasi login/register, "
                "verifikasi signature token JWT, dan penanganan error 401/403 terstandarisasi."
            ),
            status="ready",
            priority="critical",
            estimate_points=5.0,
            acceptance_criteria=[
                "Endpoint login mengembalikan access token valid dengan waktu kedaluwarsa 60 menit",
                "Middleware menolak request tanpa token yang valid",
                "Skema Pydantic v2 memvalidasi email dan password format"
            ],
            definition_of_done=["Test API auth passed 100%", "Security audit checklist checked"],
            assignee_agent_id=be_agent.id if be_agent else None,
            git_branch=f"agencyos/{p_key}/{api_key}-auth-api"
        )
        db.add(api_task)
        db.flush()
        created_tasks.append(api_task)

        # Link dependency: Auth API depends on DB Schema
        db.add(WorkItemDependency(
            work_item_id=api_task.id,
            depends_on_item_id=db_task.id,
            dependency_type="blocks"
        ))

        # C. Frontend AppShell & Design System Story
        counter += 1
        fe_key = f"{p_key}-{counter}"
        fe_story = WorkItem(
            project_id=project.id,
            sprint_id=sprint_1.id,
            key=fe_key,
            type="story",
            title=f"Setup AppShell, Token Desain UI & Navigasi Responsif {p_name}",
            description=(
                "Membangun kerangka antarmuka pengguna berbasis Next.js 15 App Router, "
                "termasuk sidebar navigasi, header breadcrumb, dan tema dark/light mode."
            ),
            status="ready",
            priority="high",
            estimate_points=5.0,
            acceptance_criteria=[
                "Layout responsif untuk resolusi mobile (375px) hingga desktop (1440px)",
                "Komponen AppShell memuat token CSS konsisten sesuai UX_UI_DESIGN_SYSTEM.md",
                "Waktu interaksi FCP < 800ms dan bebas layout shifts (CLS < 0.1)"
            ],
            definition_of_done=["Next.js production build lulus tanpa error", "TypeScript typecheck lolos"],
            assignee_agent_id=fe_agent.id if fe_agent else None,
            git_branch=f"agencyos/{p_key}/{fe_key}-appshell"
        )
        db.add(fe_story)
        db.flush()
        created_stories.append(fe_story)

        # 3. Sprint 2 Items: Business User Stories from PRD Functional Requirements
        for mod_name, fr_list in modules_map.items():
            parent_epic = epic_objects.get(mod_name)
            for fr in fr_list:
                counter += 1
                story_key = f"{p_key}-{counter}"
                fr_id = fr.get("id", "FR")
                fr_title = fr.get("title", mod_name)
                fr_desc = fr.get("description", "")
                priority_clean = fr.get("priority", "high")

                # Fibonacci points based on criteria count and priority
                criteria = fr.get("criteria", [])
                pts = 5.0 if len(criteria) > 2 or priority_clean in ["critical", "high"] else 3.0

                story_item = WorkItem(
                    project_id=project.id,
                    sprint_id=sprint_2.id,
                    parent_id=parent_epic.id if parent_epic else None,
                    key=story_key,
                    type="story",
                    title=f"[{fr_id}] {fr_title}",
                    description=(
                        f"Sebagai pengguna {p_name}, saya memerlukan fitur '{fr_title}' "
                        f"agar dapat menyelesaikan sasaran bisnis berikut:\n\n{fr_desc}\n\n"
                        f"Modul Domain: {mod_name}"
                    ),
                    status="backlog",
                    priority=priority_clean,
                    estimate_points=pts,
                    acceptance_criteria=criteria if criteria else [
                        f"Fitur {fr_title} dapat diakses oleh user yang terotorisasi",
                        "Data tersimpan secara atomik ke database",
                        "Tampilan visual sesuai komponen UI baku"
                    ],
                    definition_of_done=[
                        "Acceptance criteria lulus pengujian manual & unit test",
                        "Tidak ada error log unhandled pada browser console maupun backend server",
                        "Pull Request telah melalui tinjauan kode"
                    ],
                    assignee_agent_id=fe_agent.id if fe_agent else None,
                    git_branch=f"agencyos/{p_key}/{story_key}-{fr_id.lower()}"
                )
                db.add(story_item)
                db.flush()
                created_stories.append(story_item)

                # Link dependency: Sprint 2 Stories depend on Sprint 1 Auth/API
                db.add(WorkItemDependency(
                    work_item_id=story_item.id,
                    depends_on_item_id=api_task.id,
                    dependency_type="blocks"
                ))

        # 4. Sprint 3 Items: Security Hardening, QA & Release Verification
        # A. Security & Audit Hardening Task
        counter += 1
        sec_key = f"{p_key}-{counter}"
        sec_task = WorkItem(
            project_id=project.id,
            sprint_id=sprint_3.id,
            key=sec_key,
            type="task",
            title="Pengerasan Keamanan, Perlindungan OWASP & Audit Event Logging",
            description=(
                "Memastikan seluruh endpoint terlindungi dari injeksi SQL, verifikasi rate limiting "
                "dengan Redis, dan pencatatan peristiwa audit compliance pada semua mutasi data sensitif."
            ),
            status="backlog",
            priority="high",
            estimate_points=5.0,
            acceptance_criteria=[
                "Audit trail mencatat setiap login, approval, dan mutasi entitas utama",
                "Rate limiter membatasi request brute force ke endpoint publik",
                "Header keamanan HTTP (CORS, CSP, X-Frame-Options) terpasang sempurna"
            ],
            definition_of_done=["Security unit test lulus", "Audit table verifikasi lolos"],
            assignee_agent_id=qa_agent.id if qa_agent else (be_agent.id if be_agent else None),
            git_branch=f"agencyos/{p_key}/{sec_key}-security-hardening"
        )
        db.add(sec_task)
        db.flush()
        created_tasks.append(sec_task)

        # B. Automated QA Regression Suite Task
        counter += 1
        qa_key = f"{p_key}-{counter}"
        qa_task = WorkItem(
            project_id=project.id,
            sprint_id=sprint_3.id,
            key=qa_key,
            type="task",
            title="Verifikasi Pengujian Regresi Otomatis (Pytest & Next.js Build)",
            description=(
                "Menjalankan suite pengujian komprehensif end-to-end, memastikan seluruh test case "
                "berjalan hijau, dan verifikasi deployment build tanpa kegagalan aset."
            ),
            status="backlog",
            priority="critical",
            estimate_points=5.0,
            acceptance_criteria=[
                "100% Pytest test suite lulus tanpa exception",
                "Next.js production build exit code 0 tanpa type error",
                "Laporan verifikasi kelayakan rilis diterbitkan ke dasbor"
            ],
            definition_of_done=["Laporan QA ditandatangani oleh QA Lead Sentinel"],
            assignee_agent_id=qa_agent.id if qa_agent else None,
            git_branch=f"agencyos/{p_key}/{qa_key}-qa-regression"
        )
        db.add(qa_task)
        db.flush()
        created_tasks.append(qa_task)

        project.item_counter = counter

        # Log audit trail
        total_items = len(created_epics) + len(created_stories) + len(created_tasks)
        total_points = sum(item.estimate_points for item in created_stories + created_tasks)

        db.add(AuditEvent(
            actor="Dewi Lestari (Agile Delivery Lead)",
            action="BACKLOG_DECOMPOSED_FROM_SPECS",
            target_type="PROJECT",
            target_id=project.id,
            project_id=project.id,
            policy_basis="POL-SDLC-BACKLOG-DECOMPOSITION-V1",
            details={
                "project_key": p_key,
                "epics_count": len(created_epics),
                "stories_count": len(created_stories),
                "tasks_count": len(created_tasks),
                "total_points": total_points,
                "sprints_count": 3
            }
        ))

        db.commit()

        return {
            "status": "success",
            "message": (
                f"Backlog dan 3 paket Sprint berhasil dipecah dari dokumen PRD & Arsitektur resmi! "
                f"Total {len(created_epics)} Epics, {len(created_stories)} User Stories, "
                f"dan {len(created_tasks)} Tugas Teknis ({total_points} total Story Points)."
            ),
            "project_id": project.id,
            "epics_count": len(created_epics),
            "stories_count": len(created_stories),
            "tasks_count": len(created_tasks),
            "total_items": total_items,
            "total_story_points": total_points,
            "sprints": [
                {"id": s.id, "name": s.name, "status": s.status, "capacity": s.capacity_points}
                for s in sprints
            ]
        }
