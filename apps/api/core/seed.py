from sqlalchemy.orm import Session
from apps.api.core.database import engine, Base, SessionLocal
from apps.api.models import Department, JobRole, AIAgent, AgentProfileVersion, AgentSkill, AuditEvent

def seed_database(db: Session):
    # Check if already seeded
    if db.query(Department).first():
        return

    # 1. Departments
    eng_dept = Department(
        id="dept-eng",
        name="Engineering",
        code="ENG",
        description="Software architecture, backend, frontend, API and systems engineering."
    )
    prod_dept = Department(
        id="dept-prod",
        name="Product & Research",
        code="PROD",
        description="Product strategy, requirements analysis, technical specs and Scrum ownership."
    )
    qa_dept = Department(
        id="dept-qa",
        name="Quality Assurance",
        code="QA",
        description="Automated testing, security quality gates, performance and code review."
    )
    des_dept = Department(
        id="dept-des",
        name="Design System",
        code="DESIGN",
        description="UI/UX design system tokens, accessible interaction, and visual standards."
    )

    db.add_all([eng_dept, prod_dept, qa_dept, des_dept])
    db.flush()

    # 2. Standard Job Roles
    role_be = JobRole(
        id="role-be-arch",
        department_id=eng_dept.id,
        name="Backend Architect & Lead",
        code="BE_ARCH_LEAD",
        description="Designs API contracts, database schemas, server-side business logic and worker flows.",
        responsibilities=["Architecture design", "Database schema & migrations", "API endpoints", "Performance"],
        skills=["Python", "FastAPI", "PostgreSQL", "SQLAlchemy", "API Security", "Docker"],
        capability_categories=["code", "architecture", "database"],
        qualification_criteria=["Python & SQL benchmark passed", "Deterministic error handling verified"],
        is_official=True,
        version=1
    )

    role_fe = JobRole(
        id="role-fe-eng",
        department_id=eng_dept.id,
        name="Frontend Engineer (Next.js/React)",
        code="FE_ENG_REACT",
        description="Builds accessible, dense operational user interfaces using Next.js App Router and Tailwind CSS.",
        responsibilities=["UI component implementation", "Client state management", "Accessibility", "Design tokens"],
        skills=["TypeScript", "React", "Next.js", "Tailwind CSS", "Accessibility (WCAG 2.1)"],
        capability_categories=["code", "ui", "accessibility"],
        qualification_criteria=["Component accessibility verified", "Zero layout shift on 1280/1440px"],
        is_official=True,
        version=1
    )

    role_po = JobRole(
        id="role-po",
        department_id=prod_dept.id,
        name="Technical Product Owner",
        code="TECH_PO",
        description="Refines backlogs, defines verifiable acceptance criteria, and enforces Scrum discipline.",
        responsibilities=["Backlog grooming", "User story breakdown", "Acceptance criteria definition", "Sprint goals"],
        skills=["Scrum", "Product Requirements", "Domain Modeling", "Technical Writing"],
        capability_categories=["planning", "specifications"],
        qualification_criteria=["User story acceptance criteria verified actionable"],
        is_official=True,
        version=1
    )

    role_qa = JobRole(
        id="role-qa",
        department_id=qa_dept.id,
        name="QA & Quality Gate Validator",
        code="QA_VALIDATOR",
        description="Executes test suites, audits evidence against Definition of Done, and blocks unverified releases.",
        responsibilities=["Automated test execution", "Acceptance criteria validation", "Security scanning", "Audit"],
        skills=["Pytest", "Vitest", "Playwright", "Static Analysis", "Security Audit"],
        capability_categories=["testing", "verification", "security"],
        qualification_criteria=["Zero false negative test assertions"],
        is_official=True,
        version=1
    )

    db.add_all([role_be, role_fe, role_po, role_qa])
    db.flush()

    # 3. Foundational Agents
    agent_atlas = AIAgent(
        id="agent-atlas",
        name="Atlas",
        title="Lead Backend Architect",
        role_id=role_be.id,
        department_id=eng_dept.id,
        lifecycle_state="active",
        availability_state="available",
        qualification_state="passed",
        max_concurrency=2,
        current_concurrency=0,
        engine_adapter="mock",
        instructions="Maintain strict domain boundaries, validate all inputs, enforce database integrity, and use type hints.",
        current_profile_version=1
    )

    agent_kairo = AIAgent(
        id="agent-kairo",
        name="Kairo",
        title="Senior Frontend Engineer",
        role_id=role_fe.id,
        department_id=eng_dept.id,
        lifecycle_state="active",
        availability_state="available",
        qualification_state="passed",
        max_concurrency=2,
        current_concurrency=0,
        engine_adapter="mock",
        instructions="Follow UX_UI_DESIGN_SYSTEM.md strictly. Ensure keyboard accessibility, semantic tokens, and no neon AI tropes.",
        current_profile_version=1
    )

    agent_scribe = AIAgent(
        id="agent-scribe",
        name="Scribe",
        title="Technical Product Owner",
        role_id=role_po.id,
        department_id=prod_dept.id,
        lifecycle_state="active",
        availability_state="available",
        qualification_state="passed",
        max_concurrency=1,
        current_concurrency=0,
        engine_adapter="mock",
        instructions="Ensure every work item has testable acceptance criteria before marking ready.",
        current_profile_version=1
    )

    agent_sentinel = AIAgent(
        id="agent-sentinel",
        name="Sentinel",
        title="QA Gatekeeper",
        role_id=role_qa.id,
        department_id=qa_dept.id,
        lifecycle_state="testing",
        availability_state="busy",
        qualification_state="in_progress",
        max_concurrency=1,
        current_concurrency=1,
        engine_adapter="mock",
        instructions="Verify evidence before assertions. Reject tasks lacking passing tests.",
        current_profile_version=1
    )

    db.add_all([agent_atlas, agent_kairo, agent_scribe, agent_sentinel])
    db.flush()

    # 4. Agent Skills & Profile Versions
    db.add(AgentProfileVersion(
        agent_id=agent_atlas.id,
        version_number=1,
        instructions=agent_atlas.instructions,
        config_snapshot={"max_concurrency": 2, "engine": "mock"},
        change_rationale="Initial deployment profile"
    ))
    db.add(AgentSkill(agent_id=agent_atlas.id, name="Python / FastAPI", is_verified=True, verified_evidence="Benchmark test passed"))
    db.add(AgentSkill(agent_id=agent_atlas.id, name="SQLAlchemy / PostgreSQL", is_verified=True, verified_evidence="Migration test passed"))

    db.add(AgentProfileVersion(
        agent_id=agent_kairo.id,
        version_number=1,
        instructions=agent_kairo.instructions,
        config_snapshot={"max_concurrency": 2, "engine": "mock"},
        change_rationale="Initial deployment profile"
    ))
    db.add(AgentSkill(agent_id=agent_kairo.id, name="Next.js App Router", is_verified=True, verified_evidence="Component suite passed"))
    db.add(AgentSkill(agent_id=agent_kairo.id, name="Tailwind Design System", is_verified=True, verified_evidence="Accessibility audit passed"))

    # 5. Audit Event for Seeding
    db.add(AuditEvent(
        actor="System Initializer",
        action="SEED_FOUNDATIONAL_WORKFORCE",
        target_type="ORGANIZATION",
        target_id="ROOT",
        policy_basis="SYSTEM_BOOTSTRAP_V1",
        details={"departments_count": 4, "roles_count": 4, "agents_count": 4}
    ))

    db.commit()

def init_db():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_database(db)
    finally:
        db.close()
