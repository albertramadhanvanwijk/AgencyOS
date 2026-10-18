from typing import List, Dict, Any
from sqlalchemy.orm import Session

from apps.api.models.project import Project
from apps.api.models.scrum import WorkItem
from apps.api.models.workforce import AIAgent, AgentSkill
from apps.api.models.organization import JobRole
from apps.api.schemas.recruitment import DemandAnalysisOut, SkillBottleneck, RecruitmentRecommendation

SKILL_PATTERNS = {
    "Security & Threat Modeling": ["security", "sandbox", "vulnerability", "auth", "token", "penetration", "permission"],
    "Automation & QA Testing": ["test", "benchmark", "qa", "verification", "pytest", "jest", "assertion", "coverage"],
    "Frontend & UI Engineering": ["ui", "frontend", "next.js", "react", "css", "component", "tailwind", "accessibility", "wcag"],
    "Backend & API Architecture": ["api", "backend", "fastapi", "database", "sqlalchemy", "sqlite", "wal", "endpoint"],
    "DevOps & Isolated Sandboxing": ["isolated", "workspace", "container", "sandbox", "subprocess", "deployment", "docker"]
}

ROLE_MAPPING = {
    "Security & Threat Modeling": ("role-qa", "QA & Quality Gate Validator"),
    "Automation & QA Testing": ("role-qa", "QA & Quality Gate Validator"),
    "Frontend & UI Engineering": ("role-fe-eng", "Frontend Engineer (Next.js/React)"),
    "Backend & API Architecture": ("role-be-arch", "Backend Architect & Lead"),
    "DevOps & Isolated Sandboxing": ("role-be-arch", "Backend Architect & Lead")
}

def analyze_workforce_demand(db: Session) -> DemandAnalysisOut:
    """
    Performs explainable, rules-based demand and capacity analysis.
    Evaluates queued and in-progress work items across all projects against
    current workforce agent capabilities, identifying skill bottlenecks
    and formulating actionable staffing recommendations.
    """
    # 1. Gather Projects and Active Work Items
    active_projects = db.query(Project).filter(Project.status.in_(["active", "planning"])).all()
    project_ids = [p.id for p in active_projects]

    active_items = db.query(WorkItem).filter(
        WorkItem.project_id.in_(project_ids),
        WorkItem.status.in_(["backlog", "ready", "in_progress", "blocked"])
    ).all()

    unassigned_items = [item for item in active_items if not item.assignee_agent_id]

    # 2. Gather Agents and Skills
    all_agents = db.query(AIAgent).all()
    active_agents = [a for a in all_agents if a.lifecycle_state == "active"]

    agent_skills_map: Dict[str, int] = {}
    for agent in active_agents:
        for skill in agent.skills:
            normalized = skill.name.lower()
            agent_skills_map[normalized] = agent_skills_map.get(normalized, 0) + 1

    # 3. Detect Skill Demand from Work Items
    skill_demand: Dict[str, List[WorkItem]] = {cat: [] for cat in SKILL_PATTERNS}

    for item in active_items:
        text_corpus = f"{item.title} {item.description or ''} {' '.join(item.acceptance_criteria or [])}".lower()
        for category, keywords in SKILL_PATTERNS.items():
            if any(kw in text_corpus for kw in keywords):
                skill_demand[category].append(item)

    # 4. Compute Bottlenecks
    bottlenecks: List[SkillBottleneck] = []
    recommendations: List[RecruitmentRecommendation] = []

    for category, matched_items in skill_demand.items():
        demand_count = len(matched_items)
        if demand_count == 0:
            continue

        # Count active agents capable in this category
        keywords = SKILL_PATTERNS[category]
        capable_agents = 0
        for agent in active_agents:
            agent_text = f"{agent.title or ''} {agent.instructions or ''} {' '.join([s.name for s in agent.skills])}".lower()
            if any(kw in agent_text for kw in keywords):
                capable_agents += 1

        # Determine bottleneck severity
        severity = "low"
        if capable_agents == 0 and demand_count > 0:
            severity = "critical"
        elif demand_count > capable_agents * 2:
            severity = "high"
        elif demand_count > capable_agents:
            severity = "medium"

        if severity in ["high", "critical"] or (demand_count >= 2 and capable_agents <= 1):
            bottlenecks.append(SkillBottleneck(
                skill=category,
                demand_items_count=demand_count,
                active_agents_count=capable_agents,
                severity=severity,
                affected_work_items=[i.key for i in matched_items]
            ))

            # Propose Recommendation
            default_role_id, default_role_name = ROLE_MAPPING.get(category, (None, None))
            # Verify if role exists in DB
            db_role = db.query(JobRole).filter((JobRole.id == default_role_id) | (JobRole.name == default_role_name)).first() if default_role_id else None
            role_id = db_role.id if db_role else default_role_id
            role_name = db_role.name if db_role else default_role_name

            confidence = 0.95 if severity == "critical" else 0.85
            recommendations.append(RecruitmentRecommendation(
                action="RECRUIT_NEW_AGENT",
                target_role_id=role_id,
                target_role_name=role_name,
                suggested_skills=keywords[:3],
                rationale=f"High demand ({demand_count} active items) detected for {category} with only {capable_agents} active agent(s). Recruiting a dedicated specialist prevents delivery delays.",
                confidence_score=confidence
            ))

    # If no high bottlenecks detected, confirm capacity sufficiency
    if len(recommendations) == 0:
        recommendations.append(RecruitmentRecommendation(
            action="CAPACITY_SUFFICIENT",
            rationale="Current active workforce capacity matches active sprint demand. No immediate agent recruitment needed.",
            confidence_score=0.90
        ))

    return DemandAnalysisOut(
        total_active_projects=len(active_projects),
        total_active_work_items=len(active_items),
        unassigned_work_items=len(unassigned_items),
        total_workforce_agents=len(all_agents),
        active_workforce_agents=len(active_agents),
        bottlenecks=bottlenecks,
        recommendations=recommendations
    )
