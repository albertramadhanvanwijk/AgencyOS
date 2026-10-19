from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from apps.api.models.project import Project, ProjectPRD, ProjectArchitecture
from apps.api.models.audit import AuditEvent
from apps.api.schemas.architecture import ArchitectureGenerateIn

class ArchitectureService:
    """
    System Architecture & Technical Design Document (TDD) Service.
    Driven by Principal System Architect to transform approved PRD requirements into
    concrete software architectures, database entity schemas, REST API contracts,
    system component structures, and data flow diagrams.
    """

    @classmethod
    def get_or_create_architecture(cls, project_id: str, db: Session) -> ProjectArchitecture:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        arch = db.query(ProjectArchitecture).filter(ProjectArchitecture.project_id == project_id).first()
        if not arch:
            arch = cls._synthesize_initial_architecture(project, db)
        return arch

    @classmethod
    def generate_architecture_from_prd(
        cls, project_id: str, payload: ArchitectureGenerateIn, db: Session
    ) -> ProjectArchitecture:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        prd = db.query(ProjectPRD).filter(ProjectPRD.project_id == project_id).first()
        arch = db.query(ProjectArchitecture).filter(ProjectArchitecture.project_id == project_id).first()

        # Gather inputs from PRD if available
        functional_requirements = prd.functional_requirements if (prd and prd.functional_requirements) else []
        tech_recommendation = prd.tech_stack_recommendation if (prd and prd.tech_stack_recommendation) else {}

        goal_clean = project.goal or f"Sistem terpadu {project.name}"

        # 1. System Overview
        system_overview = (
            f"Arsitektur teknis modular untuk '{project.name}' dibangun menggunakan pola Multi-tier "
            f"Clean Architecture (Presentation Layer, Business Application Layer, Data Access Layer, dan Background Worker). "
            f"Sistem dirancang untuk mendukung skalabilitas horizontal, pemisahan tugas ketat (SoC), "
            f"serta kepatuhan penuh terhadap spesifikasi PRD resmi: {goal_clean}."
        )
        if payload.custom_notes:
            system_overview += f"\n\nCatatan Khusus Arsitek:\n{payload.custom_notes}"

        # 2. Tech Stack Spec
        frontend_choice = tech_recommendation.get("frontend", "Next.js 15 (React 19, Tailwind CSS, TypeScript)")
        backend_choice = tech_recommendation.get("backend", "FastAPI (Python, SQLAlchemy, Pydantic v2)")
        db_choice = tech_recommendation.get("database", "PostgreSQL / SQLite (ACID compliant)")

        tech_stack = {
            "frontend": frontend_choice,
            "backend": backend_choice,
            "database": db_choice,
            "caching": "Redis 7.x (In-memory cache & rate limiter)",
            "ci_cd": "GitHub Actions (Type check, Pytest, Lint, Docker Build)",
            "tools": ["Docker Compose", "Alembic Migrations", "Uvicorn ASGI", "Zod/Pydantic validation"]
        }

        # 3. Database Entities (ERD Schema)
        entities = [
            {
                "name": "User",
                "table_name": "users",
                "description": "Menyimpan identitas akun, kredensial hash, dan peran otorisasi sistem.",
                "fields": [
                    {"name": "id", "type": "UUID / String(64)", "constraints": "PRIMARY KEY", "description": "ID unik entitas"},
                    {"name": "email", "type": "String(256)", "constraints": "UNIQUE, INDEX, NOT NULL", "description": "Email login pengguna"},
                    {"name": "hashed_password", "type": "String(256)", "constraints": "NOT NULL", "description": "Hash sandi Bcrypt / Argon2"},
                    {"name": "role", "type": "String(32)", "constraints": "DEFAULT 'client', NOT NULL", "description": "Peran hak akses (admin, operator, user)"},
                    {"name": "status", "type": "String(32)", "constraints": "DEFAULT 'active'", "description": "Status akun (active, suspended)"},
                    {"name": "created_at", "type": "DateTime", "constraints": "DEFAULT UTC_NOW", "description": "Waktu registrasi"}
                ],
                "relationships": ["1-to-many -> sessions", "1-to-many -> audit_logs"]
            },
            {
                "name": "AuditLog",
                "table_name": "audit_logs",
                "description": "Pencatatan rekam jejak peristiwa kepatuhan dan aktivitas krusial pengguna.",
                "fields": [
                    {"name": "id", "type": "UUID / String(64)", "constraints": "PRIMARY KEY", "description": "ID catatan audit"},
                    {"name": "actor_id", "type": "String(64)", "constraints": "INDEX, NOT NULL", "description": "Pengguna/agen yang memicu aksi"},
                    {"name": "event_type", "type": "String(64)", "constraints": "INDEX, NOT NULL", "description": "Jenis aksi (e.g. login, create, update)"},
                    {"name": "payload", "type": "JSON", "constraints": "NULLABLE", "description": "Metadata rincian payload data"},
                    {"name": "timestamp", "type": "DateTime", "constraints": "DEFAULT UTC_NOW", "description": "Waktu presisi UTC"}
                ],
                "relationships": ["many-to-1 -> users"]
            }
        ]

        # Dynamically add entities derived from PRD functional requirements
        module_names_seen = set()
        for fr in functional_requirements:
            mod = fr.get("module", "Core").capitalize()
            if mod not in module_names_seen and mod not in ["Auth", "Core", "Security"]:
                module_names_seen.add(mod)
                table_name = mod.lower() + "s"
                entities.append({
                    "name": mod,
                    "table_name": table_name,
                    "description": f"Entitas data bisnis untuk mengelola {fr.get('title', mod)}.",
                    "fields": [
                        {"name": "id", "type": "UUID / String(64)", "constraints": "PRIMARY KEY", "description": f"Identifier unik {mod}"},
                        {"name": "user_id", "type": "String(64)", "constraints": "FOREIGN KEY -> users.id, NOT NULL", "description": "Pemilik/Kreator data"},
                        {"name": "name", "type": "String(128)", "constraints": "NOT NULL", "description": f"Nama/Judul rekaman {mod}"},
                        {"name": "status", "type": "String(32)", "constraints": "DEFAULT 'draft', INDEX", "description": "Status alur kerja"},
                        {"name": "metadata", "type": "JSON", "constraints": "NULLABLE", "description": "Atribut data fleksibel"},
                        {"name": "created_at", "type": "DateTime", "constraints": "DEFAULT UTC_NOW", "description": "Waktu pembuatan"},
                        {"name": "updated_at", "type": "DateTime", "constraints": "ON UPDATE UTC_NOW", "description": "Waktu pembaruan"}
                    ],
                    "relationships": ["many-to-1 -> users"]
                })

        # 4. API Endpoints
        api_endpoints = [
            {
                "module": "Auth",
                "method": "POST",
                "path": "/api/v1/auth/register",
                "description": "Mendaftarkan pengguna baru dengan validasi format email dan kata sandi kuat.",
                "request_body": "{\"email\": \"string\", \"password\": \"string\", \"role\": \"string\"}",
                "response_body": "{\"id\": \"string\", \"email\": \"string\", \"created_at\": \"datetime\"}",
                "auth_required": False
            },
            {
                "module": "Auth",
                "method": "POST",
                "path": "/api/v1/auth/login",
                "description": "Otentikasi kredensial pengguna dan mengembalikan JWT Access Token.",
                "request_body": "{\"email\": \"string\", \"password\": \"string\"}",
                "response_body": "{\"access_token\": \"string\", \"token_type\": \"bearer\", \"expires_in\": 3600}",
                "auth_required": False
            },
            {
                "module": "System",
                "method": "GET",
                "path": "/api/v1/health",
                "description": "Liveness and readiness health check probe.",
                "request_body": None,
                "response_body": "{\"status\": \"healthy\", \"database\": \"connected\"}",
                "auth_required": False
            }
        ]

        # Add endpoints for each functional module
        for fr in functional_requirements:
            mod = fr.get("module", "Business")
            slug = mod.lower().replace(" ", "-")
            api_endpoints.extend([
                {
                    "module": mod,
                    "method": "GET",
                    "path": f"/api/v1/{slug}",
                    "description": f"Mendapatkan daftar data {mod} dengan paginasi, pencarian, dan filter.",
                    "request_body": None,
                    "response_body": "{\"items\": [...], \"total\": 10, \"page\": 1, \"size\": 20}",
                    "auth_required": True
                },
                {
                    "module": mod,
                    "method": "POST",
                    "path": f"/api/v1/{slug}",
                    "description": f"Membuat entitas data {mod} baru sesuai kriteria penerimaan {fr.get('id', 'FR')}.",
                    "request_body": "{\"name\": \"string\", \"metadata\": {...}}",
                    "response_body": "{\"id\": \"string\", \"status\": \"created\"}",
                    "auth_required": True
                },
                {
                    "module": mod,
                    "method": "GET",
                    "path": f"/api/v1/{slug}/{{id}}",
                    "description": f"Mengambil detail entitas {mod} berdasarkan ID.",
                    "request_body": None,
                    "response_body": "{\"id\": \"string\", \"name\": \"string\", ...}",
                    "auth_required": True
                }
            ])

        # 5. Component Modules
        component_modules = [
            {
                "name": "Web Presentation Shell",
                "type": "frontend",
                "responsibilities": [
                    "Menangani perutean halaman App Router Next.js 15",
                    "Menyediakan navigasi sidebar, breadcrumb, dan indikator status",
                    "Mengelola state otentikasi token dan sesi pengguna"
                ],
                "dependencies": ["Tailwind CSS", "Lucide Icons", "Fetch API Client"]
            },
            {
                "name": "API Gateway & Router Layer",
                "type": "backend",
                "responsibilities": [
                    "Validasi payload masuk menggunakan Pydantic v2",
                    "Penanganan CORS, Security Headers, dan middleware otentikasi",
                    "Pemisahan rute modular per domain fungsional"
                ],
                "dependencies": ["FastAPI", "Uvicorn", "Starlette"]
            },
            {
                "name": "Domain Service & Business Logic",
                "type": "service",
                "responsibilities": [
                    "Eksekusi alur kerja aturan bisnis dan validasi domain",
                    "Pemanggilan transaksi database atomik",
                    "Penerbitan audit log dan verifikasi izin RBAC"
                ],
                "dependencies": ["SQLAlchemy Session", "AuditService"]
            },
            {
                "name": "Data Persistence Layer",
                "type": "backend",
                "responsibilities": [
                    "Model relasional ORM dan pemetaan skema database",
                    "Manajemen koneksi database pooling dan migrasi Alembic",
                    "Integritas referensial dan foreign key cascading"
                ],
                "dependencies": ["SQLAlchemy 2.0", "Alembic", "SQLite/PostgreSQL"]
            }
        ]

        # 6. Security Specs
        security_specs = [
            {
                "category": "Authentication",
                "mechanism": "JWT (JSON Web Tokens) with Argon2 Password Hashing",
                "description": "Token kedaluwarsa dalam 60 menit, ditransmisikan via Authorization Bearer header, verifikasi signature kriptografis."
            },
            {
                "category": "Authorization & RBAC",
                "mechanism": "Role-Based Access Control Middleware",
                "description": "Verifikasi hak akses ketat di level endpoint API; pengguna hanya dapat mengakses resource dalam batas perannya."
            },
            {
                "category": "Input Validation & Sanitization",
                "mechanism": "Strict Pydantic / Zod Schema Enforcement",
                "description": "Menolak otomatis payload yang tidak valid, proteksi SQL Injection via parameterized queries ORM, dan sanitasi XSS."
            },
            {
                "category": "Data Protection & Auditability",
                "mechanism": "Audit Event Logging & TLS Encryption",
                "description": "Semua mutasi data krusial dicatat ke tabel audit_logs dengan identitas aktor, payload perubahan, dan timestamp UTC."
            }
        ]

        # 7. Data Flow Diagram (Mermaid.js)
        data_flow_diagram = (
            "graph TD\n"
            "    User([Pengguna / Klien]) -->|HTTPS / REST API| WebUI[Next.js 15 Web App]\n"
            "    WebUI -->|JSON API Request| APIRouter[FastAPI Gateway / Routers]\n"
            "    APIRouter -->|Middleware Auth & RBAC| AuthGuard{Validasi Token}\n"
            "    AuthGuard -->|Token Tidak Sah| ErrResp[401 / 403 Response]\n"
            "    AuthGuard -->|Token Valid| ServiceLayer[Domain Business Services]\n"
            "    ServiceLayer -->|Query / Mutasi Atomik| DB[(Database Relasional)]\n"
            "    ServiceLayer -->|Pencatatan Peristiwa| AuditTable[(Audit Trail Log)]\n"
            "    ServiceLayer -->|JSON Response Data| APIRouter\n"
            "    APIRouter -->|HTTP Status 200/201| WebUI\n"
            "    WebUI -->|Render UI Komponen| User"
        )

        version = (arch.version + 1) if arch else 1

        if not arch:
            arch = ProjectArchitecture(
                project_id=project_id,
                version=version,
                status="draft",
                system_overview=system_overview,
                tech_stack=tech_stack,
                database_entities=entities,
                api_endpoints=api_endpoints,
                component_modules=component_modules,
                security_specs=security_specs,
                data_flow_diagram=data_flow_diagram,
            )
            db.add(arch)
        else:
            arch.version = version
            arch.status = "draft"
            arch.system_overview = system_overview
            arch.tech_stack = tech_stack
            arch.database_entities = entities
            arch.api_endpoints = api_endpoints
            arch.component_modules = component_modules
            arch.security_specs = security_specs
            arch.data_flow_diagram = data_flow_diagram
            arch.approved_by = None
            arch.approved_at = None

        db.commit()
        db.refresh(arch)
        return arch

    @classmethod
    def approve_architecture(
        cls, project_id: str, approved_by: Optional[str], db: Session
    ) -> ProjectArchitecture:
        arch = db.query(ProjectArchitecture).filter(ProjectArchitecture.project_id == project_id).first()
        if not arch:
            raise HTTPException(status_code=404, detail=f"Architecture for project '{project_id}' not found.")

        if not arch.database_entities or not arch.api_endpoints:
            raise HTTPException(
                status_code=400,
                detail="Spesifikasi arsitektur belum memiliki entitas database atau kontrak endpoint API."
            )

        arch.status = "approved"
        arch.approved_by = approved_by or "Lead Software Architect"
        arch.approved_at = datetime.now(timezone.utc)

        # Log audit trail event
        audit_entry = AuditEvent(
            actor=arch.approved_by,
            action="ARCHITECTURE_DOCUMENT_APPROVED",
            target_type="PROJECT_ARCHITECTURE",
            target_id=arch.id,
            project_id=project_id,
            policy_basis="POL-SDLC-ARCHITECTURE-SIGN-OFF-V1",
            details={
                "project_id": project_id,
                "version": arch.version,
                "total_entities": len(arch.database_entities),
                "total_endpoints": len(arch.api_endpoints),
                "approved_at": arch.approved_at.isoformat()
            }
        )
        db.add(audit_entry)

        db.commit()
        db.refresh(arch)
        return arch

    @classmethod
    def _synthesize_initial_architecture(cls, project: Project, db: Session) -> ProjectArchitecture:
        """Create a baseline architecture draft upon initial access."""
        empty_payload = ArchitectureGenerateIn(custom_notes=None)
        return cls.generate_architecture_from_prd(project.id, empty_payload, db)
