from datetime import datetime, timezone
from sqlalchemy.orm import Session
from apps.api.core.database import engine, Base, SessionLocal
from apps.api.models import (
    Department, JobRole, AIAgent, AgentProfileVersion, AgentSkill,
    AuditEvent, Project, Sprint, WorkItem,
    ExecutionRun, RunLog, RunArtifact, QualityCheckResult,
    RecruitmentRequest
)

import os

def seed_enterprise_agency(db: Session):
    """
    Seeds or updates the full enterprise digital agency organization:
    - 3 Primary Directorates: Product & Design, Engineering & Architecture, Quality & Delivery Operations.
    - 19 Specialized Job Roles across departments.
    - 10 Foundational Specialist AI Agents with verified skills and tailored system instructions.
    """
    # 1. Primary Departments (Directorates & Core Units)
    depts_data = [
        {
            "id": "dept-prod",
            "name": "Product & Research",
            "code": "PROD",
            "description": "Strategi produk, analisis kebutuhan bisnis, sistem desain UI/UX, user research, dan spesifikasi PRD."
        },
        {
            "id": "dept-eng",
            "name": "Engineering",
            "code": "ENG",
            "description": "Arsitektur perangkat lunak modular (Clean Architecture), database engineering, REST API, frontend modern, dan keamanan siber."
        },
        {
            "id": "dept-delivery",
            "name": "Operations & Delivery",
            "code": "OPS",
            "description": "Tata kelola Scrum, pengujian mutu otomatis (Definition of Done QA Gate), integrasi CI/CD, dan rilis repositori."
        },
        {
            "id": "dept-qa",
            "name": "Quality Assurance",
            "code": "QA",
            "description": "Automated testing, security quality gates, performance and code review."
        },
        {
            "id": "dept-des",
            "name": "Design System",
            "code": "DESIGN",
            "description": "UI/UX design system tokens, accessible interaction, dan visual standards."
        }
    ]

    for d_info in depts_data:
        existing_d = db.query(Department).filter(
            (Department.id == d_info["id"]) | (Department.code == d_info["code"])
        ).first()
        if existing_d:
            existing_d.name = d_info["name"]
            existing_d.code = d_info["code"]
            existing_d.description = d_info["description"]
        else:
            db.add(Department(**d_info))
    db.flush()

    # 2. Specialized Job Roles
    roles_data = [
        # Core Standard Roles (Backward Compatible)
        {
            "id": "role-be-arch",
            "department_id": "dept-eng",
            "name": "Backend Architect & Lead",
            "code": "BE_ARCH_LEAD",
            "description": "Designs API contracts, database schemas, server-side business logic and worker flows.",
            "responsibilities": ["Architecture design", "Database schema & migrations", "API endpoints", "Performance"],
            "skills": ["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "API Security", "Docker"],
            "capability_categories": ["code", "architecture", "database"],
            "qualification_criteria": ["Python & SQL benchmark passed", "Deterministic error handling verified"],
            "is_official": True
        },
        {
            "id": "role-fe-eng",
            "department_id": "dept-eng",
            "name": "Frontend Engineer (Next.js/React)",
            "code": "FE_ENG_REACT",
            "description": "Builds accessible, dense operational user interfaces using Next.js App Router and Tailwind CSS.",
            "responsibilities": ["UI component implementation", "Client state management", "Accessibility", "Design tokens"],
            "skills": ["TypeScript", "React", "Next.js", "Tailwind CSS", "Accessibility (WCAG 2.1)"],
            "capability_categories": ["code", "ui", "accessibility"],
            "qualification_criteria": ["Component accessibility verified", "Zero layout shift on 1280/1440px"],
            "is_official": True
        },
        {
            "id": "role-po",
            "department_id": "dept-prod",
            "name": "Technical Product Owner",
            "code": "TECH_PO",
            "description": "Refines backlogs, defines verifiable acceptance criteria, and enforces Scrum discipline.",
            "responsibilities": ["Backlog grooming", "User story breakdown", "Acceptance criteria definition", "Sprint goals"],
            "skills": ["Scrum", "Product Requirements", "Domain Modeling", "Technical Writing"],
            "capability_categories": ["planning", "specifications"],
            "qualification_criteria": ["User story acceptance criteria verified actionable"],
            "is_official": True
        },
        {
            "id": "role-qa",
            "department_id": "dept-qa",
            "name": "QA & Quality Gate Validator",
            "code": "QA_VALIDATOR",
            "description": "Executes test suites, audits evidence against Definition of Done, and blocks unverified releases.",
            "responsibilities": ["Automated test execution", "Acceptance criteria validation", "Security scanning", "Audit"],
            "skills": ["Pytest", "Vitest", "Playwright", "Static Analysis", "Security Audit"],
            "capability_categories": ["testing", "verification", "security"],
            "qualification_criteria": ["Zero false negative test assertions"],
            "is_official": True
        },

        # Divisi Produk
        {
            "id": "role-cpo",
            "department_id": "dept-prod",
            "name": "Chief Product Officer",
            "code": "CPO",
            "description": "Memimpin visi produk, strategi portofolio, dan validasi roadmap produk agency.",
            "responsibilities": ["Visi Produk", "Roadmap Strategis", "Stakeholder Alignment", "Kepuasan Klien"],
            "skills": ["Product Strategy", "Market Analysis", "Portfolio Governance", "Executive Reporting"],
            "capability_categories": ["strategy", "planning"],
            "qualification_criteria": ["Product vision alignment", "Strategic roadmap approved"],
            "is_official": True
        },
        {
            "id": "role-lead-pm",
            "department_id": "dept-prod",
            "name": "Lead Product Manager",
            "code": "LEAD_PM",
            "description": "Menyusun dokumen PRD/SRS formal, menguraikan Functional Requirements, dan mengelola scope proyek.",
            "responsibilities": ["PRD Discovery & Synthesis", "Scope Management", "User Stories & Epics", "Acceptance Criteria Definition"],
            "skills": ["Product Requirements (PRD)", "Scope Framing", "Backlog Grooming", "Technical Writing"],
            "capability_categories": ["planning", "specifications"],
            "qualification_criteria": ["PRD completeness verified", "Acceptance criteria actionable"],
            "is_official": True
        },
        {
            "id": "role-ba",
            "department_id": "dept-prod",
            "name": "Business Analyst",
            "code": "BUSINESS_ANALYST",
            "description": "Menganalisis proses bisnis, aturan data bisnis (Business Logic Rules), dan use cases.",
            "responsibilities": ["Business Process Modeling", "Use Case Scenarios", "Cost-Benefit Evaluation", "Domain Analysis"],
            "skills": ["Business Process", "Data Flow Modeling", "ROI Metrics", "Domain Analysis"],
            "capability_categories": ["analysis", "business"],
            "qualification_criteria": ["Domain workflows defined"],
            "is_official": True
        },
        {
            "id": "role-uxr",
            "department_id": "dept-prod",
            "name": "UX Researcher & Flow Analyst",
            "code": "UX_RESEARCHER",
            "description": "Meneliti persona pengguna, journey mapping, dan arsitektur alur informasi aplikasi.",
            "responsibilities": ["User Personas", "Journey Mapping", "Information Architecture", "Wireframing"],
            "skills": ["User Research", "Wireframing", "Journey Mapping", "Empathy Design"],
            "capability_categories": ["ux", "research"],
            "qualification_criteria": ["User personas validated"],
            "is_official": True
        },
        {
            "id": "role-ui-lead",
            "department_id": "dept-prod",
            "name": "Lead UI/UX Designer",
            "code": "UI_DESIGNER_LEAD",
            "description": "Merancang Design System Tokens (palet warna, tipografi, grid) dan komponen visual modern.",
            "responsibilities": ["Design System Governance", "Color Tokens & Typography", "Component Libraries", "WCAG Accessibility"],
            "skills": ["Figma", "Design Tokens", "Tailwind CSS", "WCAG 2.1 Contrast", "Responsive UI"],
            "capability_categories": ["ui", "design"],
            "qualification_criteria": ["Design token contrast verified"],
            "is_official": True
        },
        # Divisi Rekayasa & Arsitektur
        {
            "id": "role-cto",
            "department_id": "dept-eng",
            "name": "Chief Technology Officer",
            "code": "CTO",
            "description": "Memimpin arsitektur teknis, standar teknologi, efisiensi komputasi, dan tata kelola kode.",
            "responsibilities": ["Standar Arsitektur Teknis", "Pemilihan Tech Stack", "Code Governance", "Scalability Assurance"],
            "skills": ["Clean Architecture", "Distributed Systems", "Cloud Governance", "Tech Leadership"],
            "capability_categories": ["architecture", "leadership"],
            "qualification_criteria": ["Technical blueprint validated"],
            "is_official": True
        },
        {
            "id": "role-architect",
            "department_id": "dept-eng",
            "name": "Principal System Architect",
            "code": "SYS_ARCHITECT",
            "description": "Merancang arsitektur modular, diagram relasi data (Mermaid), dan kontrak REST API/OpenAPI.",
            "responsibilities": ["Technical Design Documents (TDD)", "REST API Contracts", "Mermaid Diagramming", "Modular Architecture"],
            "skills": ["Multi-tier Architecture", "OpenAPI / Swagger", "Mermaid.js", "Separation of Concerns"],
            "capability_categories": ["architecture", "specifications"],
            "qualification_criteria": ["System architecture spec verified"],
            "is_official": True
        },
        {
            "id": "role-dba",
            "department_id": "dept-eng",
            "name": "Database Architect & Data Engineer",
            "code": "DB_ARCHITECT",
            "description": "Merancang skema relasional tabel (ERD), indeks performa, aturan normalisasi, dan migrasi ORM.",
            "responsibilities": ["Entity Relational Modeling", "Database Migrations", "Index Optimization", "Data Integrity"],
            "skills": ["SQLAlchemy", "PostgreSQL", "SQLite WAL", "ERD Diagrams", "Database Security"],
            "capability_categories": ["database", "code"],
            "qualification_criteria": ["Database schema normalization verified"],
            "is_official": True
        },
        {
            "id": "role-security",
            "department_id": "dept-eng",
            "name": "Cybersecurity & InfoSec Specialist",
            "code": "INFOSEC_SPECIALIST",
            "description": "Memeriksa kepatuhan keamanan (OWASP Top 10, sanitasi input API, proteksi injeksi, RBAC authorization).",
            "responsibilities": ["Security Audits", "OWASP Top 10 Mitigation", "RBAC Policy Enforcement", "Secret Hygiene"],
            "skills": ["Application Security", "Penetration Testing", "Input Sanitization", "Cryptography", "RBAC"],
            "capability_categories": ["security", "audit"],
            "qualification_criteria": ["Security audit clean"],
            "is_official": True
        },
        {
            "id": "role-tech-lead",
            "department_id": "dept-eng",
            "name": "Engineering Team Lead",
            "code": "TECH_LEAD",
            "description": "Mengatur strategi branching, memimpin code review, dan membimbing engineer pada problem teknis.",
            "responsibilities": ["Code Review Governance", "Branching Strategy", "Technical Guidance", "Sprint Engineering Quality"],
            "skills": ["Git Workflow", "Code Review", "Clean Code", "Design Patterns", "Python / TypeScript"],
            "capability_categories": ["code", "leadership"],
            "qualification_criteria": ["Zero merge regressions"],
            "is_official": True
        },
        {
            "id": "role-sr-fe-eng",
            "department_id": "dept-eng",
            "name": "Senior Frontend Engineer",
            "code": "FE_SR_ENGINEER",
            "description": "Membangun antarmuka web responsif, padat informasi, bebas layout shift, berbasis Next.js & Tailwind.",
            "responsibilities": ["UI Components Development", "State Management", "API Client Integration", "Accessibility"],
            "skills": ["React", "Next.js App Router", "Tailwind CSS", "TypeScript", "WCAG 2.1"],
            "capability_categories": ["code", "ui", "frontend"],
            "qualification_criteria": ["Zero layout shift verified", "Accessibility contrast passed"],
            "is_official": True
        },
        {
            "id": "role-be-eng",
            "department_id": "dept-eng",
            "name": "Senior Backend Engineer",
            "code": "BE_SR_ENGINEER",
            "description": "Membangun endpoint API FastAPI, business logic, integrasi ORM, dan worker asynchronous.",
            "responsibilities": ["REST APIs Implementation", "Business Logic Services", "Database Queries", "Unit Tests"],
            "skills": ["Python", "FastAPI", "SQLAlchemy", "Pydantic", "Unit Testing"],
            "capability_categories": ["code", "backend", "api"],
            "qualification_criteria": ["FastAPI endpoints test passed", "Deterministic error handling"],
            "is_official": True
        },
        {
            "id": "role-integ-eng",
            "department_id": "dept-eng",
            "name": "Integration & 3rd-Party Specialist",
            "code": "INTEG_SPECIALIST",
            "description": "Mengintegrasikan payment gateway, OAuth Google/GitHub, email notifier, dan webhooks pihak ketiga.",
            "responsibilities": ["3rd-Party Connectors", "OAuth & Identity", "Payment Integrations", "Webhook Receivers"],
            "skills": ["OAuth 2.0", "Payment Gateways", "REST Webhooks", "API Resilience"],
            "capability_categories": ["code", "integrations"],
            "qualification_criteria": ["Mock adapter integration verified"],
            "is_official": True
        },
        # Divisi Mutu & Delivery
        {
            "id": "role-coo",
            "department_id": "dept-delivery",
            "name": "VP of Operations & Delivery",
            "code": "COO",
            "description": "Memastikan efisiensi operasional delivery, alokasi kapasitas tim, dan throughput sprint.",
            "responsibilities": ["Delivery Operations", "Capacity Allocation", "Throughput Metrics", "Operational Governance"],
            "skills": ["Agile Operations", "Capacity Modeling", "Throughput Governance", "Process Optimization"],
            "capability_categories": ["operations", "leadership"],
            "qualification_criteria": ["Delivery throughput stable"],
            "is_official": True
        },
        {
            "id": "role-scrum-master",
            "department_id": "dept-delivery",
            "name": "Lead Scrum Master",
            "code": "SCRUM_MASTER_LEAD",
            "description": "Memfasilitasi ritme Scrum, estimasi poin Fibonacci, mitigasi hambatan tim, dan memimpin Retrospektif.",
            "responsibilities": ["Sprint Planning & Cadence", "Fibonacci Point Estimation", "Blocker Removal", "Retrospectives"],
            "skills": ["Scrum Governance", "Velocity Tracking", "Burndown Analysis", "Retrospective Synthesis"],
            "capability_categories": ["planning", "scrum"],
            "qualification_criteria": ["Sprint burndown velocity within target"],
            "is_official": True
        },
        {
            "id": "role-qa-lead",
            "department_id": "dept-delivery",
            "name": "Lead QA & Test Automation",
            "code": "QA_LEAD_SENTINEL",
            "description": "Gatekeeper utama: memverifikasi Acceptance Criteria, mengeksekusi test suite, dan audit Definition of Done.",
            "responsibilities": ["Automated Test Execution", "Acceptance Criteria Verification", "DoD Gatekeeping", "Regression Defense"],
            "skills": ["Pytest", "Test Automation", "DoD Enforcement", "Static Analysis", "Assertion Auditing"],
            "capability_categories": ["testing", "verification", "qa"],
            "qualification_criteria": ["Zero false negative test assertions"],
            "is_official": True
        },
        {
            "id": "role-qa-tester",
            "department_id": "dept-delivery",
            "name": "QA Manual & Edge-Case Hunter",
            "code": "QA_EDGE_HUNTER",
            "description": "Mendeteksi edge-case bugs, memvalidasi usability, input anomali, dan skenario kegagalan tak terduga.",
            "responsibilities": ["Edge Case Hunting", "Usability Validation", "Boundary Value Testing", "Defect Reporting"],
            "skills": ["Exploratory Testing", "Edge Case Analysis", "UX Auditing", "Defect Reproduction"],
            "capability_categories": ["testing", "qa"],
            "qualification_criteria": ["Critical edge cases identified"],
            "is_official": True
        },
        {
            "id": "role-devops",
            "department_id": "dept-delivery",
            "name": "Senior DevOps & CI/CD Engineer",
            "code": "DEVOPS_ENGINEER",
            "description": "Mengelola isolasi worktree branch, pipeline CI/CD, GitHub Actions, dan lingkungan staging.",
            "responsibilities": ["Worktree Branch Management", "GitHub Actions CI", "Containerization", "Pull Request Workflows"],
            "skills": ["Git Worktree", "GitHub Actions", "Docker", "CI/CD Pipelines", "Shell Scripting"],
            "capability_categories": ["devops", "infrastructure"],
            "qualification_criteria": ["CI pipeline determinism verified"],
            "is_official": True
        },
        {
            "id": "role-release-mgr",
            "department_id": "dept-delivery",
            "name": "Release Coordinator & Tech Writer",
            "code": "RELEASE_COORDINATOR",
            "description": "Menyusun catatan rilis (RELEASE_NOTES.md), changelog, dokumentasi teknis, dan koordinasi delivery.",
            "responsibilities": ["Release Notes Generation", "Changelog Versioning", "Technical Documentation", "Delivery Handoff"],
            "skills": ["Release Management", "Markdown Synthesis", "Technical Writing", "Changelog Standards"],
            "capability_categories": ["release", "documentation"],
            "qualification_criteria": ["Release documentation verified"],
            "is_official": True
        }
    ]

    for r_info in roles_data:
        existing_r = db.query(JobRole).filter(
            (JobRole.id == r_info["id"]) | (JobRole.code == r_info["code"])
        ).first()
        if existing_r:
            existing_r.name = r_info["name"]
            existing_r.code = r_info["code"]
            existing_r.department_id = r_info["department_id"]
            existing_r.description = r_info["description"]
            existing_r.responsibilities = r_info["responsibilities"]
            existing_r.skills = r_info["skills"]
            existing_r.capability_categories = r_info["capability_categories"]
            existing_r.qualification_criteria = r_info["qualification_criteria"]
        else:
            db.add(JobRole(**r_info))
    db.flush()

    # 3. Foundational Specialist AI Agents
    agents_data = [
        {
            "id": "agent-atlas",
            "name": "Aditya Pratama",
            "title": "Lead Backend Architect (Atlas)",
            "role_id": "role-be-arch",
            "department_id": "dept-eng",
            "instructions": "Maintain strict domain boundaries, validate all inputs, enforce database integrity, and use type hints. Bertindak sebagai Lead Backend Architect.",
            "skills": ["Python / FastAPI", "SQLAlchemy / PostgreSQL", "Clean Architecture", "API Design"]
        },
        {
            "id": "agent-kairo",
            "name": "Bayu Setiawan",
            "title": "Senior Frontend Engineer (Kairo)",
            "role_id": "role-fe-eng",
            "department_id": "dept-eng",
            "instructions": "Follow UX_UI_DESIGN_SYSTEM.md strictly. Ensure keyboard accessibility, semantic tokens, and no neon AI tropes.",
            "skills": ["Next.js App Router", "Tailwind Design System", "React", "WCAG 2.1"]
        },
        {
            "id": "agent-scribe",
            "name": "Dewi Lestari",
            "title": "Technical Product Owner (Scribe)",
            "role_id": "role-po",
            "department_id": "dept-prod",
            "instructions": "Ensure every work item has testable acceptance criteria before marking ready. Maintain PRD specifications.",
            "skills": ["Product Requirements", "Scrum Refinement", "Backlog Decomposition", "Domain Modeling"]
        },
        {
            "id": "agent-sentinel",
            "name": "Sentinel (QA Lead)",
            "title": "Lead QA Engineer & Gatekeeper",
            "role_id": "role-qa",
            "department_id": "dept-qa",
            "instructions": "Verify evidence before assertions. Reject tasks lacking passing tests. Gatekeeper for Definition of Done.",
            "skills": ["Automated Pytest Suites", "Acceptance Criteria Verification", "Definition of Done Audit", "Regression Testing"]
        },
        {
            "id": "agent-davinci",
            "name": "Bramantyo (DaVinci)",
            "title": "Principal System Architect",
            "role_id": "role-architect",
            "department_id": "dept-eng",
            "instructions": "Bertindak sebagai Principal System Architect. Rancang arsitektur modular, diagram relasi data, dan kontrak REST API OpenAPI yang deterministik.",
            "skills": ["Clean Architecture", "API Contracts (OpenAPI)", "Mermaid Data Flow", "Component Modeling", "System Scalability"]
        },
        {
            "id": "agent-nexus",
            "name": "Arya Wibawa (Nexus)",
            "title": "Database Architect & Data Engineer",
            "role_id": "role-dba",
            "department_id": "dept-eng",
            "instructions": "Bertindak sebagai Database Architect. Pastikan integritas relasi tabel, rancang skema ternormalisasi, dan optimalkan struktur query database.",
            "skills": ["Relational ERD Modeling", "SQLAlchemy / SQLite WAL", "Schema Migrations", "Index Optimization", "Data Integrity"]
        },
        {
            "id": "agent-cipher",
            "name": "Farhan Malik (Cipher)",
            "title": "Cybersecurity & InfoSec Specialist",
            "role_id": "role-security",
            "department_id": "dept-eng",
            "instructions": "Bertindak sebagai Cybersecurity Officer. Lindungi sistem dari celah OWASP Top 10, audit otorisasi role-based, dan pastikan tidak ada kebocoran credential.",
            "skills": ["OWASP Top 10 Mitigation", "API Input Sanitization", "RBAC Access Control", "Data Encryption", "Security Audit"]
        },
        {
            "id": "agent-pixel",
            "name": "Siti Rahma (Pixel)",
            "title": "Lead UI/UX Designer",
            "role_id": "role-ui-lead",
            "department_id": "dept-des",
            "instructions": "Bertindak sebagai Lead UI Designer. Tegakkan pedoman UX_UI_DESIGN_SYSTEM.md: palet warna slate/zinc, tipografi berhierarki, accessibility WCAG 2.1, tanpa dekorasi AI norak.",
            "skills": ["Design Tokens & Systems", "WCAG 2.1 Accessibility", "Tailwind UI Components", "UX Wireframing"]
        },
        {
            "id": "agent-forge",
            "name": "Reza Mahendra (Forge)",
            "title": "Integration & 3rd-Party Specialist",
            "role_id": "role-integ-eng",
            "department_id": "dept-eng",
            "instructions": "Bertindak sebagai Integration Specialist. Bangun konektor pihak ketiga (payment gateway, OAuth, webhooks) menggunakan mock adapters yang deterministik sebelum live approval.",
            "skills": ["Third-Party API Integrations", "OAuth 2.0 & Webhooks", "Mock Adapter Design", "API Resilience"]
        },
        {
            "id": "agent-orion",
            "name": "Bagas Surya (Orion)",
            "title": "Lead Scrum Master",
            "role_id": "role-scrum-master",
            "department_id": "dept-delivery",
            "instructions": "Bertindak sebagai Lead Scrum Master. Fasilitasi sprint cadence, estimasi poin Fibonacci realistis, singkirkan hambatan developer, dan pimpin Retrospektif Sprint.",
            "skills": ["Agile Scrum Governance", "Fibonacci Story Point Estimation", "Sprint Capacity Planning", "Blocker Mitigation", "Retrospective Analysis"]
        },
        {
            "id": "agent-vector",
            "name": "Doni Prasetyo (Vector)",
            "title": "Senior DevOps & CI/CD Engineer",
            "role_id": "role-devops",
            "department_id": "dept-delivery",
            "instructions": "Bertindak sebagai Senior DevOps Engineer. Sediakan worktree branch terisolasi untuk eksekusi koding agen, atur integrasi GitHub PR, dan jaga stabilitas CI.",
            "skills": ["Git Worktree Isolation", "GitHub Actions CI/CD", "Branch Management", "Build Automation", "Environment Setup"]
        },
        {
            "id": "agent-nova",
            "name": "Anisa Putri (Nova)",
            "title": "Release Coordinator & Tech Writer",
            "role_id": "role-release-mgr",
            "department_id": "dept-delivery",
            "instructions": "Bertindak sebagai Release Coordinator. Himpun seluruh deliverable yang lulus QA, susun catatan rilis terstruktur, dan dokumentasikan changelog resmi proyek.",
            "skills": ["Release Notes Synthesis", "Changelog Versioning", "Technical Documentation", "API Documentation", "Release Packaging"]
        }
    ]

    for a_info in agents_data:
        existing_a = db.query(AIAgent).filter(AIAgent.id == a_info["id"]).first()
        if existing_a:
            existing_a.name = a_info["name"]
            existing_a.title = a_info["title"]
            existing_a.role_id = a_info["role_id"]
            existing_a.department_id = a_info["department_id"]
            existing_a.instructions = a_info["instructions"]
            existing_a.lifecycle_state = "active"
            existing_a.availability_state = "available"
            existing_a.qualification_state = "passed"
        else:
            new_agent = AIAgent(
                id=a_info["id"],
                name=a_info["name"],
                title=a_info["title"],
                role_id=a_info["role_id"],
                department_id=a_info["department_id"],
                lifecycle_state="active",
                availability_state="available",
                qualification_state="passed",
                max_concurrency=2,
                current_concurrency=0,
                engine_adapter="mock",
                instructions=a_info["instructions"],
                current_profile_version=1
            )
            db.add(new_agent)
            db.flush()

        # Ensure skills exist
        for s_name in a_info["skills"]:
            existing_s = db.query(AgentSkill).filter(
                AgentSkill.agent_id == a_info["id"],
                AgentSkill.name == s_name
            ).first()
            if not existing_s:
                db.add(AgentSkill(
                    agent_id=a_info["id"],
                    name=s_name,
                    is_verified=True,
                    verified_evidence="Certified via Enterprise Qualification Benchmark"
                ))

        # Ensure Profile Version
        existing_pv = db.query(AgentProfileVersion).filter(
            AgentProfileVersion.agent_id == a_info["id"],
            AgentProfileVersion.version_number == 1
        ).first()
        if not existing_pv:
            db.add(AgentProfileVersion(
                agent_id=a_info["id"],
                version_number=1,
                instructions=a_info["instructions"],
                config_snapshot={"max_concurrency": 2, "engine": "mock"},
                change_rationale="Enterprise Agency Formation Bootstrap"
            ))

    db.add(AuditEvent(
        actor="Agency Owner",
        action="ENTERPRISE_AGENCY_STRUCTURE_SYNCED",
        target_type="ORGANIZATION",
        target_id="ROOT",
        policy_basis="ENTERPRISE_WORKFORCE_SPEC_V2",
        details={
            "departments_count": len(depts_data),
            "roles_count": len(roles_data),
            "agents_count": len(agents_data)
        }
    ))
    db.commit()


def seed_database(db: Session, seed_projects: bool | None = None):
    if seed_projects is None:
        seed_projects = os.environ.get("AGENCYOS_SEED_PROJECTS", "").lower() in ("1", "true")

    # 1. Seed or synchronize enterprise agency workforce
    seed_enterprise_agency(db)

    if seed_projects:
        # 5. Foundational Projects & Sprints
        if not db.query(Project).first():
            agent_atlas = db.query(AIAgent).filter((AIAgent.id == "agent-atlas") | (AIAgent.name == "Aditya Pratama")).first()
            agent_kairo = db.query(AIAgent).filter((AIAgent.id == "agent-kairo") | (AIAgent.name == "Bayu Setiawan")).first()
            agent_sentinel = db.query(AIAgent).filter((AIAgent.id == "agent-sentinel") | (AIAgent.name == "Sentinel (QA Lead)")).first()

            proj_core = Project(
                id="prj-core",
                name="AgencyOS Core Platform",
                key="PRJ-CORE",
                goal="Establish human-supervised AI workforce, isolated workspace execution, and Scrum governance platform.",
                status="active",
                workspace_path="workspaces/prj-core",
                item_counter=5
            )
            db.add(proj_core)
            db.flush()

            sprint_1 = Sprint(
                id="sprint-core-1",
                project_id=proj_core.id,
                name="Sprint 1: Foundation & Scrum Core",
                goal="Deliver monorepo skeleton, live UI shell, and enforceable Scrum state machine.",
                status="active",
                capacity_points=25
            )
            db.add(sprint_1)
            db.flush()

            # 6. Initial Work Items
            item_1 = WorkItem(
                id="item-core-1",
                project_id=proj_core.id,
                sprint_id=sprint_1.id,
                key="PRJ-CORE-1",
                type="task",
                title="Setup Monorepo Skeleton & API Health Engine",
                description="Configure Next.js 15, FastAPI, SQLite WAL mode, and automated tests.",
                status="done",
                priority="critical",
                estimate_points=3.0,
                acceptance_criteria=["FastAPI health endpoint responds 200", "SQLite WAL enabled", "Automated Pytest passed"],
                definition_of_done=["Code merged", "Tests passing", "Zero lint errors"],
                assignee_agent_id=agent_atlas.id if agent_atlas else None
            )

            item_2 = WorkItem(
                id="item-core-2",
                project_id=proj_core.id,
                sprint_id=sprint_1.id,
                key="PRJ-CORE-2",
                type="story",
                title="Implement Calm Engineering UI Shell & Design System",
                description="Build AppShell, Topbar, Sidebar, and semantic color tokens without neon tropes.",
                status="done",
                priority="high",
                estimate_points=5.0,
                acceptance_criteria=["WCAG 2.1 contrast verified", "AppShell responsive at 1280px", "Dark/Light mode operational"],
                definition_of_done=["ESLint passed", "Next.js production build succeeded"],
                assignee_agent_id=agent_kairo.id if agent_kairo else None
            )

            item_3 = WorkItem(
                id="item-core-3",
                project_id=proj_core.id,
                sprint_id=sprint_1.id,
                key="PRJ-CORE-3",
                type="story",
                title="Scrum State Machine & Kanban Board",
                description="Implement server-side state transitions with rejection reasons and project isolation.",
                status="in_progress",
                priority="critical",
                estimate_points=8.0,
                acceptance_criteria=["Transition to Ready requires acceptance criteria", "Transition to Done requires quality gate review", "Project isolation enforced"],
                definition_of_done=["State machine rejection unit tests passing", "Interactive board operational"],
                assignee_agent_id=agent_atlas.id if agent_atlas else None
            )

            item_4 = WorkItem(
                id="item-core-4",
                project_id=proj_core.id,
                sprint_id=sprint_1.id,
                key="PRJ-CORE-4",
                type="task",
                title="MockEngineAdapter Isolated Run Execution",
                description="Confine runs to workspace directory and generate deterministic mock logs and artifacts.",
                status="ready",
                priority="high",
                estimate_points=5.0,
                acceptance_criteria=["Path traversal blocked via resolve()", "Subprocess execution safe from injection", "Logs visibly labelled [SIMULATED]"],
                definition_of_done=["Adapter unit tests passing"],
                assignee_agent_id=agent_atlas.id if agent_atlas else None
            )

            item_5 = WorkItem(
                id="item-core-5",
                project_id=proj_core.id,
                sprint_id=sprint_1.id,
                key="PRJ-CORE-5",
                type="story",
                title="Sandbox Agent Qualification Benchmark",
                description="Define standardized coding tests before new agent identities can be activated.",
                status="backlog",
                priority="medium",
                estimate_points=3.0,
                acceptance_criteria=["Automated test harness for new identities", "Human approval required for activation"],
                definition_of_done=["Zero unverified activations permitted"],
                assignee_agent_id=agent_sentinel.id if agent_sentinel else None
            )

            db.add_all([item_1, item_2, item_3, item_4, item_5])

            # 7. Audit Event for Seeding
            db.add(AuditEvent(
                actor="System Initializer",
                action="SEED_FOUNDATIONAL_WORKFORCE_AND_SCRUM",
                target_type="ORGANIZATION",
                target_id="ROOT",
                policy_basis="SYSTEM_BOOTSTRAP_V1",
                details={"departments_count": 4, "roles_count": 4, "agents_count": 4, "projects_count": 1, "work_items_count": 5}
            ))

            db.commit()

        # Seed PRJ-EVAL (Planning project) if not exists
        if not db.query(Project).filter(Project.id == "prj-eval").first():
            agent_sentinel = db.query(AIAgent).filter(AIAgent.id == "agent-sentinel").first()
            agent_atlas = db.query(AIAgent).filter(AIAgent.id == "agent-atlas").first()
            agent_scribe = db.query(AIAgent).filter(AIAgent.id == "agent-scribe").first()

            proj_eval = Project(
                id="prj-eval",
                name="Agent Qualification Benchmark",
                key="PRJ-EVAL",
                goal="Standardized coding sandbox benchmark to qualify autonomous agent identities before live activation.",
                status="planning",
                workspace_path="workspaces/prj-eval",
                item_counter=3
            )
            db.add(proj_eval)
            db.flush()

            sprint_eval_0 = Sprint(
                id="sprint-eval-0",
                project_id=proj_eval.id,
                name="Sprint 0: Sandbox Setup & Qualification Spec",
                goal="Draft evaluation harness test cases, sandbox containment spec, and qualification scoring rules.",
                status="planning",
                capacity_points=15
            )
            db.add(sprint_eval_0)
            db.flush()

            eval_item_1 = WorkItem(
                id="item-eval-1",
                project_id=proj_eval.id,
                sprint_id=sprint_eval_0.id,
                key="PRJ-EVAL-1",
                type="story",
                title="Define Standardized Coding Benchmark Test Suite",
                description="Create reference test harness assessing Python and TypeScript implementation rigor without network access.",
                status="backlog",
                priority="high",
                estimate_points=5.0,
                acceptance_criteria=["Benchmark runner isolated from external network", "Passing threshold set at >= 85% coverage"],
                definition_of_done=["Test harness runner operational", "Mock agent qualification verified"],
                assignee_agent_id=agent_sentinel.id if agent_sentinel else None
            )

            eval_item_2 = WorkItem(
                id="item-eval-2",
                project_id=proj_eval.id,
                sprint_id=sprint_eval_0.id,
                key="PRJ-EVAL-2",
                type="task",
                title="Design Quarantine Sandbox Execution Environment",
                description="Establish temporary branch-based ephemeral execution environments with zero host credential exposure.",
                status="backlog",
                priority="critical",
                estimate_points=8.0,
                acceptance_criteria=["Path traversal barred by CanonicalPathResolver", "Subprocess timeout enforced at 120s"],
                definition_of_done=["Sandbox security penetration test passed"],
                assignee_agent_id=agent_atlas.id if agent_atlas else None
            )

            eval_item_3 = WorkItem(
                id="item-eval-3",
                project_id=proj_eval.id,
                sprint_id=sprint_eval_0.id,
                key="PRJ-EVAL-3",
                type="story",
                title="Human Evaluator Dual-Key Sign-Off Protocol",
                description="Ensure autonomous agent activation requires explicit human technical lead sign-off and audit log entry.",
                status="ready",
                priority="medium",
                estimate_points=3.0,
                acceptance_criteria=["Dual-key cryptographic or role-based check required", "Audit trail records policy basis"],
                definition_of_done=["Verification gate tested and documented"],
                assignee_agent_id=agent_scribe.id if agent_scribe else None
            )

            db.add_all([eval_item_1, eval_item_2, eval_item_3])
            db.add(AuditEvent(
                actor="System Initializer",
                action="CREATE_PROJECT",
                target_type="PROJECT",
                target_id=proj_eval.id,
                project_id=proj_eval.id,
                policy_basis="SYSTEM_BOOTSTRAP_V1",
                details={"name": proj_eval.name, "key": proj_eval.key, "status": "planning"}
            ))
            db.commit()

        # Seed execution run for completed item_1 if not exists
        if not db.query(ExecutionRun).filter(ExecutionRun.id == "run-core-101").first():
            run_1 = ExecutionRun(
                id="run-core-101",
                project_id="prj-core",
                work_item_id="item-core-1",
                agent_id="agent-atlas",
                status="succeeded",
                workspace_path="workspaces/prj-core/runs/run-core-101",
                is_simulated=True,
                adapter_name="MockEngineAdapter",
                started_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc)
            )
            db.add(run_1)
            db.flush()

            # Logs
            log1 = RunLog(run_id=run_1.id, stage="preparing", level="INFO", message="[SIMULATED] Initializing isolated run workspace for PRJ-CORE-1", is_simulated=True)
            log2 = RunLog(run_id=run_1.id, stage="running", level="INFO", message="[SIMULATED] Implementing API health endpoints & SQLite WAL mode", is_simulated=True)
            log3 = RunLog(run_id=run_1.id, stage="collecting_results", level="INFO", message="[SIMULATED] Generating git patch diff and verification artifacts", is_simulated=True)
            log4 = RunLog(run_id=run_1.id, stage="quality_checks", level="INFO", message="[SIMULATED] Running quality gates (LINT, TYPECHECK, TESTS, SECURITY)", is_simulated=True)
            log5 = RunLog(run_id=run_1.id, stage="review", level="INFO", message="[SIMULATED] Execution completed with zero defect escapes. Approved into Done.", is_simulated=True)
            db.add_all([log1, log2, log3, log4, log5])

            # Artifacts
            diff_text_1 = """# [SIMULATED] Git Patch Diff for PRJ-CORE-1
    # Work Item: Setup Monorepo Skeleton & API Health Engine
    diff --git a/apps/api/routers/health.py b/apps/api/routers/health.py
    new file mode 100644
    --- /dev/null
    +++ b/apps/api/routers/health.py
    @@ -0,0 +1,18 @@
    +from fastapi import APIRouter
    +router = APIRouter()
    +@router.get("/health")
    +def health():
    +    return {"status": "healthy", "service": "AgencyOS API"}
    +"""
            art_diff_1 = RunArtifact(
                run_id=run_1.id,
                name="patch.diff",
                artifact_type="diff",
                file_path="workspaces/prj-core/runs/run-core-101/patch.diff",
                size_bytes=len(diff_text_1.encode("utf-8")),
                content_preview=diff_text_1,
                is_simulated=True
            )

            test_text_1 = """{
      "simulated": true,
      "framework": "pytest-simulated",
      "total": 7,
      "passed": 7,
      "failed": 0,
      "duration_seconds": 0.42
    }"""
            art_test_1 = RunArtifact(
                run_id=run_1.id,
                name="test_results.json",
                artifact_type="test_results",
                file_path="workspaces/prj-core/runs/run-core-101/test_results.json",
                size_bytes=len(test_text_1.encode("utf-8")),
                content_preview=test_text_1,
                is_simulated=True
            )
            db.add_all([art_diff_1, art_test_1])

            # Quality Checks
            qc1 = QualityCheckResult(run_id=run_1.id, check_name="LINT", status="passed", details={"errors": 0}, is_simulated=True)
            qc2 = QualityCheckResult(run_id=run_1.id, check_name="TYPECHECK", status="passed", details={"errors": 0}, is_simulated=True)
            qc3 = QualityCheckResult(run_id=run_1.id, check_name="UNIT_TESTS", status="passed", details={"passed": 7, "total": 7}, is_simulated=True)
            qc4 = QualityCheckResult(run_id=run_1.id, check_name="SECURITY_SCAN", status="passed", details={"vulnerabilities": 0}, is_simulated=True)
            db.add_all([qc1, qc2, qc3, qc4])
            db.commit()

        # Seed execution run for PRJ-CORE-2 if not exists
        if not db.query(ExecutionRun).filter(ExecutionRun.id == "run-core-102").first():
            run_2 = ExecutionRun(
                id="run-core-102",
                project_id="prj-core",
                work_item_id="item-core-2",
                agent_id="agent-kairo",
                status="succeeded",
                workspace_path="workspaces/prj-core/runs/run-core-102",
                is_simulated=True,
                adapter_name="MockEngineAdapter",
                started_at=datetime.now(timezone.utc),
                completed_at=datetime.now(timezone.utc)
            )
            db.add(run_2)
            db.flush()

            log2_1 = RunLog(run_id=run_2.id, stage="preparing", level="INFO", message="[SIMULATED] Preparing isolated UI workspace for PRJ-CORE-2", is_simulated=True)
            log2_2 = RunLog(run_id=run_2.id, stage="running", level="INFO", message="[SIMULATED] Constructing Calm Engineering Design System tokens and AppShell", is_simulated=True)
            log2_3 = RunLog(run_id=run_2.id, stage="collecting_results", level="INFO", message="[SIMULATED] Generating UI components diff and WCAG contrast audit", is_simulated=True)
            log2_4 = RunLog(run_id=run_2.id, stage="quality_checks", level="INFO", message="[SIMULATED] Executing ESLint, Prettier, and Jest component suites", is_simulated=True)
            log2_5 = RunLog(run_id=run_2.id, stage="review", level="INFO", message="[SIMULATED] Verification passed with 100% WCAG AA compliance. Signed off into Done.", is_simulated=True)
            db.add_all([log2_1, log2_2, log2_3, log2_4, log2_5])

            diff_text_2 = """# [SIMULATED] Git Patch Diff for PRJ-CORE-2
    # Work Item: Implement Calm Engineering UI Shell & Design System
    diff --git a/apps/web/src/components/layout/AppShell.tsx b/apps/web/src/components/layout/AppShell.tsx
    new file mode 100644
    --- /dev/null
    +++ b/apps/web/src/components/layout/AppShell.tsx
    @@ -0,0 +1,24 @@
    +import React from "react";
    +import { Sidebar } from "./Sidebar";
    +import { Topbar } from "./Topbar";
    +
    +export function AppShell({ children }: { children: React.ReactNode }) {
    +  return (
    +    <div className="flex h-screen bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark">
    +      <Sidebar />
    +      <main className="flex-1 overflow-y-auto">{children}</main>
    +    </div>
    +  );
    +}
    +"""
            art_diff_2 = RunArtifact(
                run_id=run_2.id,
                name="patch.diff",
                artifact_type="diff",
                file_path="workspaces/prj-core/runs/run-core-102/patch.diff",
                size_bytes=len(diff_text_2.encode("utf-8")),
                content_preview=diff_text_2,
                is_simulated=True
            )

            test_text_2 = """{
      "simulated": true,
      "framework": "jest-accessibility",
      "total": 12,
      "passed": 12,
      "failed": 0,
      "wcag_aa_compliant": true
    }"""
            art_test_2 = RunArtifact(
                run_id=run_2.id,
                name="test_results.json",
                artifact_type="test_results",
                file_path="workspaces/prj-core/runs/run-core-102/test_results.json",
                size_bytes=len(test_text_2.encode("utf-8")),
                content_preview=test_text_2,
                is_simulated=True
            )
            db.add_all([art_diff_2, art_test_2])

            qc2_1 = QualityCheckResult(run_id=run_2.id, check_name="LINT", status="passed", details={"errors": 0}, is_simulated=True)
            qc2_2 = QualityCheckResult(run_id=run_2.id, check_name="TYPECHECK", status="passed", details={"errors": 0}, is_simulated=True)
            qc2_3 = QualityCheckResult(run_id=run_2.id, check_name="WCAG_CONTRAST", status="passed", details={"ratio": "4.8:1", "level": "AA"}, is_simulated=True)
            qc2_4 = QualityCheckResult(run_id=run_2.id, check_name="UNIT_TESTS", status="passed", details={"passed": 12, "total": 12}, is_simulated=True)
            db.add_all([qc2_1, qc2_2, qc2_3, qc2_4])
            db.commit()

        # Seed sample RecruitmentRequest if not exists
        if not db.query(RecruitmentRequest).filter(RecruitmentRequest.id == "req-rec-001").first():
            req_sample = RecruitmentRequest(
                id="req-rec-001",
                role_id="role-qa",
                department_id="dept-qa",
                proposed_agent_name="Fajar Hidayat",
                rationale="Sustained demand for automated security sandbox qualification and threat penetration testing on PRJ-CORE and PRJ-EVAL.",
                requested_by="Technical Lead / Dewi Lestari",
                required_skills=["Security & Threat Modeling", "Sandbox Containment", "Automated QA"],
                status="pending_approval",
                policy_basis="POL-AGENT-RECRUITMENT-V1"
            )
            db.add(req_sample)
            db.flush()

            db.add(AuditEvent(
                actor="Technical Lead / Scribe",
                action="RECRUITMENT_REQUEST_CREATED",
                target_type="RECRUITMENT_REQUEST",
                target_id=req_sample.id,
                policy_basis="POL-AGENT-RECRUITMENT-V1",
                details={
                    "proposed_agent_name": req_sample.proposed_agent_name,
                    "role_id": req_sample.role_id,
                    "skills": req_sample.required_skills
                }
            ))
            db.commit()

def init_db():
    Base.metadata.create_all(bind=engine)
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE ai_agents ADD COLUMN llm_profile_id VARCHAR(64)"))
            conn.commit()
    except Exception:
        pass
    try:
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE ai_agents ADD COLUMN llm_model VARCHAR(64)"))
            conn.commit()
    except Exception:
        pass
    # Project GitHub migrations
    for col, col_type in [
        ("github_repo_url", "VARCHAR(256)"),
        ("github_repo_name", "VARCHAR(128)"),
        ("github_repo_mode", "VARCHAR(32) DEFAULT 'local'"),
        ("github_branch", "VARCHAR(64) DEFAULT 'main'"),
    ]:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE projects ADD COLUMN {col} {col_type}"))
                conn.commit()
        except Exception:
            pass
    # WorkItem Subtask & Git migrations
    for col, col_type in [
        ("parent_id", "VARCHAR(64)"),
        ("git_branch", "VARCHAR(128)"),
        ("pull_request_url", "VARCHAR(256)"),
        ("pull_request_number", "INTEGER"),
        ("pull_request_status", "VARCHAR(32) DEFAULT 'draft'"),
        ("revision_notes", "TEXT"),
        ("revision_count", "INTEGER DEFAULT 0"),
        ("qa_status", "VARCHAR(32) DEFAULT 'pending'"),
        ("qa_verified_by", "VARCHAR(128)"),
        ("qa_verified_at", "DATETIME"),
        ("qa_report", "JSON"),
    ]:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE work_items ADD COLUMN {col} {col_type}"))
                conn.commit()
        except Exception:
            pass

    # Sprint Retrospective & Review migrations
    for col, col_type in [
        ("retrospective", "JSON"),
        ("review_notes", "TEXT"),
        ("approved_by", "VARCHAR(128)"),
        ("approved_at", "DATETIME"),
    ]:
        try:
            from sqlalchemy import text
            with engine.connect() as conn:
                conn.execute(text(f"ALTER TABLE sprints ADD COLUMN {col} {col_type}"))
                conn.commit()
        except Exception:
            pass

    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
