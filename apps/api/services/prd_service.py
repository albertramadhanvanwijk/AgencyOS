from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from fastapi import HTTPException

from apps.api.models.project import Project, ProjectPRD
from apps.api.models.audit import AuditEvent

class PRDService:
    """
    Product Requirement Document (PRD) & Discovery Service.
    Driven by Technical Product Owner Dewi Lestari to gather client requirements,
    conduct discovery Q&A, formulate industry-standard PRDs, and handle human sign-off gates.
    """

    @classmethod
    def get_or_create_prd(cls, project_id: str, db: Session) -> ProjectPRD:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        prd = db.query(ProjectPRD).filter(ProjectPRD.project_id == project_id).first()
        if not prd:
            prd = cls._synthesize_initial_prd(project, db)
        return prd

    @classmethod
    def get_discovery_questions(cls, project_id: str, db: Session) -> List[Dict[str, Any]]:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        goal_lower = (project.goal or project.name).lower()

        # Dynamic questions based on project domain
        questions = [
            {
                "id": "q_users",
                "category": "Target Users & Access Roles",
                "question": f"Siapa saja target pengguna utama sistem '{project.name}' dan apakah ada tingkatan role khusus (misal: Admin, Staf Operasional, dan Pelanggan)?",
                "placeholder": "Contoh: 1. Admin Super (kelola semua data), 2. Staf Gudang, 3. Pembeli (registrasi mandiri).",
                "default_hint": "Multi-role: Administrator, Staff, End-user"
            },
            {
                "id": "q_features",
                "category": "Core Features & Integrations",
                "question": "Fitur kunci apa yang menjadi prioritas mutlak rilis perdana, dan apakah memerlukan integrasi pihak ketiga (Payment Gateway, OAuth Google, WhatsApp API, dsb)?",
                "placeholder": "Contoh: Katalog produk, checkout keranjang, login Google, dan pembayaran QRIS Midtrans.",
                "default_hint": "Autentikasi aman, CRUD modul utama, dan notifikasi email"
            },
            {
                "id": "q_nonfunc",
                "category": "Non-Functional & Security",
                "question": "Apakah ada standar performa, kepatuhan keamanan data, atau batasan perangkat khusus (Desktop, Tablet, atau Mobile First)?",
                "placeholder": "Contoh: Responsif di mobile, waktu muat halaman < 1 detik, data transaksi terenkripsi.",
                "default_hint": "Responsif WCAG 2.1, enkripsi data sensitif, waktu muat < 800ms"
            },
            {
                "id": "q_scope",
                "category": "Scope Boundaries",
                "question": "Apakah ada fitur yang secara tegas TIDAK dikerjakan pada fase awal ini (Out of Scope) untuk mencegah pembengkakan anggaran/waktu?",
                "placeholder": "Contoh: Belum mencakup aplikasi mobile Android/iOS native (cukup web PWA dulu), belum ada multi-currency.",
                "default_hint": "Aplikasi native mobile & integrasi multi-bahasa ditunda ke fase 2"
            }
        ]

        return questions

    @classmethod
    def generate_full_prd(
        cls,
        project_id: str,
        interview_answers: Optional[List[Dict[str, str]]],
        db: Session
    ) -> ProjectPRD:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        prd = db.query(ProjectPRD).filter(ProjectPRD.project_id == project_id).first()
        if not prd:
            prd = ProjectPRD(project_id=project_id)
            db.add(prd)
            db.flush()

        p_name = project.name
        p_goal = project.goal or "Sistem informasi modern terintegrasi"
        p_key = project.key

        answers_map = {}
        if interview_answers:
            prd.interview_answers = interview_answers
            for item in interview_answers:
                answers_map[item.get("question", "")] = item.get("answer", "")

        # 1. Executive Summary
        exec_summary = (
            f"Dokumen Spesifikasi Kebutuhan Produk (PRD) resmi untuk '{p_name}'. "
            f"Tujuan utama proyek: {p_goal}. "
            "Dokumen ini dirumuskan oleh Technical Product Owner Dewi Lestari sebagai acuan baku "
            "(baseline specification) yang mengikat seluruh tahapan desain UI/UX, arsitektur database, "
            "eksekusi koding, pengujian kualitas QA, dan perilisan sistem."
        )

        # 2. Target Users & Personas
        target_users = [
            {
                "persona": "Administrator / Back-office Operator",
                "description": "Pengelola utama sistem dengan akses penuh ke data master, konfigurasi, audit log, dan laporan.",
                "needs": ["Dashboard metrik real-time", "Manajemen pengguna & hak akses", "Ekspor laporan analitik"]
            },
            {
                "persona": "Pengguna Akhir / Member",
                "description": "Pengguna eksternal atau pelanggan yang berinteraksi langsung dengan layanan utama aplikasi.",
                "needs": ["Navigasi antarmuka intuitif dan cepat", "Kemudahan alur transaksi", "Keamanan akun & privasi data"]
            },
            {
                "persona": "Auditor / Quality Assurer",
                "description": "Pihak pengawas yang memverifikasi kepatuhan operasional, log audit, dan integritas sistem.",
                "needs": ["Log jejak audit tidak dapat diubah", "Riwayat verifikasi DoD & kriteria penerimaan"]
            }
        ]

        # 3. User Journeys
        user_journeys = [
            {
                "title": "Onboarding & Autentikasi Pengguna",
                "actor": "Pengguna Baru",
                "steps": [
                    "Pengguna mengakses halaman landing page dan mengklik tombol Registrasi/Login.",
                    "Sistem memvalidasi input kredensial dengan enkripsi bcrypt dan standar format email.",
                    "Sistem menerbitkan token sesi JWT dan mengarahkan pengguna ke dashboard personal."
                ]
            },
            {
                "title": "Akses & Eksekusi Alur Kerja Utama",
                "actor": "Member / Operator",
                "steps": [
                    "Pengguna membuka modul kerja utama pada antarmuka responsif.",
                    "Pengguna melakukan input data atau aksi transaksi dengan validasi real-time.",
                    "Sistem mencatat transaksi secara deterministik ke dalam basis data relasional.",
                    "Antarmuka menampilkan status konfirmasi sukses dengan pembaruan data instan."
                ]
            },
            {
                "title": "Monitoring & Pelaporan Operasional",
                "actor": "Administrator",
                "steps": [
                    "Admin membuka dashboard pemantauan dan memfilter rentang tanggal.",
                    "Sistem menyajikan visualisasi data ringkas (agregasi angka & status).",
                    "Admin dapat mengunduh ringkasan laporan operasional."
                ]
            }
        ]

        # 4. Functional Requirements (FR) with strict testable criteria
        functional_requirements = [
            {
                "id": "FR-01",
                "module": "Identity & Access Management",
                "title": "Autentikasi & Otorisasi Berbasis Peran (RBAC)",
                "description": "Sistem wajib menyediakan autentikasi pengguna yang aman dengan dukungan token sesi dan pembagian hak akses granular.",
                "priority": "critical",
                "criteria": [
                    "Password pengguna dienkripsi dengan standar hash industri (bcrypt).",
                    "Akses endpoint terproteksi wajib divalidasi dengan token otorisasi yang valid.",
                    "Percobaan akses tanpa izin menghasilkan kode status HTTP 401/403 yang informatif."
                ]
            },
            {
                "id": "FR-02",
                "module": "Core Business Engine",
                "title": f"Modul Utama Layanan {p_name}",
                "description": f"Sistem wajib mengimplementasikan entitas data dan alur kerja utama sesuai sasaran: {p_goal}.",
                "priority": "high",
                "criteria": [
                    "Operasi Create, Read, Update, Delete (CRUD) tervalidasi secara ketat menggunakan skema Pydantic.",
                    "Perubahan data dicatat ke dalam database relasional dengan integritas transaksi ACID.",
                    "Tersedia penanganan error terpusat yang ramah pengguna."
                ]
            },
            {
                "id": "FR-03",
                "module": "Responsive UI & Design Tokens",
                "title": "Antarmuka Pengguna Adaptif & Terstandarisasi",
                "description": "Frontend dibangun menggunakan komponen yang mematuhi Design System (Tailwind CSS tokens, WCAG 2.1 accessibility).",
                "priority": "high",
                "criteria": [
                    "Tampilan responsif sempurna pada resolusi layar mobile (375px), tablet (768px), dan desktop (1440px).",
                    "Setiap komponen memiliki state visual lengkap: Default, Loading Skeleton, Empty, Error, dan Disabled.",
                    "Navigasi mendukung aksesibilitas keyboard (Focus ring & ARIA labels)."
                ]
            },
            {
                "id": "FR-04",
                "module": "Quality Gate & Test Automation",
                "title": "Otomatisasi Pengujian Mutu (QA Suite)",
                "description": "Setiap fungsionalitas memiliki cakupan pengujian unit dan integrasi otomatis yang dapat diverifikasi oleh agen QA.",
                "priority": "high",
                "criteria": [
                    "Test suite backend (Pytest) lulus 100% tanpa kegagalan.",
                    "Kriteria penerimaan diverifikasi tanpa bukti manipulasi (*zero false negative*)."
                ]
            },
            {
                "id": "FR-05",
                "module": "Security & Audit Governance",
                "title": "Jejak Audit & Pemindaian Keamanan Aplikasi",
                "description": "Sistem mencatat setiap perubahan status kritis dan memastikan tidak ada kebocoran kredensial atau kerentanan OWASP.",
                "priority": "critical",
                "criteria": [
                    "Seluruh mutasi status penting dicatat ke dalam tabel audit event.",
                    "Tidak ada rahasia atau API key yang terekspos di log aplikasi maupun kode publik.",
                    "Proteksi terhadap celah XSS, Path Traversal, dan SQL Injection diterapkan di layer controller."
                ]
            }
        ]

        # 5. Non-Functional Requirements
        non_functional_requirements = [
            {
                "category": "Performance",
                "requirement": "Waktu respons rata-rata API di bawah 500 milidetik pada beban standar."
            },
            {
                "category": "Security",
                "requirement": "Semua komunikasi data terenkripsi melalui protokol HTTPS/TLS 1.3 dan penyimpanan kredensial berstandar OWASP."
            },
            {
                "category": "Accessibility",
                "requirement": "Antarmuka web mematuhi pedoman aksesibilitas konten web WCAG 2.1 Level AA."
            },
            {
                "category": "Reliability",
                "requirement": "Ketersediaan sistem (uptime SLA) ditargetkan minimal 99.5% dengan penanganan kegagalan graceful degradation."
            }
        ]

        # 6. Scope Boundaries
        scope_boundaries = {
            "in_scope": [
                f"Pengembangan aplikasi web {p_name} berbasis Next.js App Router dan backend FastAPI.",
                "Penerapan arsitektur basis data relasional terstruktur dengan isolasi transaksi.",
                "Dukungan autentikasi pengguna, manajemen hak akses, dan pelaporan audit.",
                "Pengujian mutu otomatis (Unit tests & QA quality gates)."
            ],
            "out_of_scope": [
                "Aplikasi mobile native Android / iOS terpisah (menggunakan web responsif terlebih dahulu).",
                "Dukungan transaksi multi-mata uang internasional di luar IDR / USD untuk rilis perdana.",
                "Fitur migrasi data warisan manual di luar format standar ekspor/impor JSON/CSV."
            ]
        }

        # 7. Tech Stack Recommendation
        tech_stack_recommendation = {
            "frontend": "Next.js 15 (App Router, React 19, TypeScript, Tailwind CSS v4)",
            "backend": "FastAPI (Python 3.12+, SQLAlchemy ORM, Pydantic v2)",
            "database": "PostgreSQL / SQLite Relational DB",
            "tools": ["Pytest", "Vitest", "Docker", "Git Worktrees", "OpenAPI / Swagger"]
        }

        prd.version = (prd.version or 1) + 1
        prd.status = "in_review" # Ready for Human Sign-Off
        prd.executive_summary = exec_summary
        prd.target_users = target_users
        prd.user_journeys = user_journeys
        prd.functional_requirements = functional_requirements
        prd.non_functional_requirements = non_functional_requirements
        prd.scope_boundaries = scope_boundaries
        prd.tech_stack_recommendation = tech_stack_recommendation
        prd.updated_at = datetime.now(timezone.utc)

        db.add(AuditEvent(
            actor="Technical Product Owner (Dewi Lestari)",
            action="PRD_DOCUMENT_GENERATED",
            target_type="PROJECT_PRD",
            target_id=prd.id,
            project_id=project_id,
            policy_basis="POL-SDLC-REQUIREMENT-V1",
            details={
                "project_key": p_key,
                "version": prd.version,
                "functional_reqs_count": len(functional_requirements),
                "status": prd.status
            }
        ))

        db.commit()
        db.refresh(prd)
        return prd

    @classmethod
    def approve_prd(cls, project_id: str, approved_by: str, db: Session) -> ProjectPRD:
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise HTTPException(status_code=404, detail=f"Project '{project_id}' not found.")

        prd = db.query(ProjectPRD).filter(ProjectPRD.project_id == project_id).first()
        if not prd:
            raise HTTPException(status_code=404, detail="PRD document has not been formulated yet. Generate PRD first.")

        if prd.status == "approved":
            return prd

        prd.status = "approved"
        prd.approved_by = approved_by or "Project Owner"
        prd.approved_at = datetime.now(timezone.utc)
        prd.updated_at = datetime.now(timezone.utc)

        # Transition project status if in planning
        if project.status == "planning":
            project.status = "active"

        db.add(AuditEvent(
            actor=approved_by or "Project Owner",
            action="PRD_DOCUMENT_APPROVED",
            target_type="PROJECT_PRD",
            target_id=prd.id,
            project_id=project_id,
            policy_basis="POL-SDLC-SIGN-OFF-V1",
            details={
                "project_key": project.key,
                "approved_by": prd.approved_by,
                "approved_at": prd.approved_at.isoformat(),
                "version": prd.version
            }
        ))

        db.commit()
        db.refresh(prd)
        return prd

    @classmethod
    def _synthesize_initial_prd(cls, project: Project, db: Session) -> ProjectPRD:
        p_name = project.name
        p_goal = project.goal or "Pengembangan aplikasi perangkat lunak terintegrasi"
        
        prd = ProjectPRD(
            project_id=project.id,
            version=1,
            status="draft",
            executive_summary=f"Draf Dokumen Kebutuhan Produk (PRD) awal untuk '{p_name}'. Sasaran proyek: {p_goal}. Silakan lengkapi sesi tanya-jawab Discovery untuk memvalidasi spesifikasi resmi.",
            target_users=[],
            user_journeys=[],
            functional_requirements=[],
            non_functional_requirements=[],
            scope_boundaries={"in_scope": [p_goal], "out_of_scope": []},
            tech_stack_recommendation={
                "frontend": "Next.js (React, Tailwind CSS)",
                "backend": "FastAPI (Python, SQLAlchemy)",
                "database": "PostgreSQL / SQLite",
                "tools": ["Git", "Docker", "Pytest"]
            }
        )
        db.add(prd)
        db.commit()
        db.refresh(prd)
        return prd

prd_service = PRDService()
