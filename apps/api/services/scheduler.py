from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session

from apps.api.models.scrum import WorkItem
from apps.api.models.project import Project, Sprint
from apps.api.models.workforce import AIAgent, AgentSkill
from apps.api.models.audit import AuditEvent
from apps.api.schemas.scheduler import (
    AgentRecommendationOut,
    SprintCapacityOut,
    AgentCapacityItem,
)

# Common domain keywords mapped to skill categories
KEYWORD_SYNONYMS: Dict[str, List[str]] = {
    "frontend": ["frontend", "ui", "ux", "react", "next.js", "css", "tailwind", "component", "web", "layout", "responsive", "accessibility"],
    "backend": ["backend", "api", "fastapi", "python", "database", "sqlalchemy", "sqlite", "server", "crud", "endpoint", "rest", "auth", "token"],
    "qa": ["qa", "test", "testing", "pytest", "benchmark", "validation", "verification", "assertion", "coverage", "bug", "reproduce"],
    "devops": ["devops", "docker", "workspace", "sandbox", "ci/cd", "deployment", "infrastructure", "isolation", "container", "environment"],
    "architecture": ["architecture", "lead", "architect", "design", "refactor", "domain", "specification", "rfc"],
    "security": ["security", "auth", "permission", "sandbox", "vulnerability", "encryption", "audit", "policy"]
}

class SchedulerService:
    @staticmethod
    def recommend_assignees(db: Session, work_item: WorkItem) -> List[AgentRecommendationOut]:
        """
        Rekomendasi agen terbaik berdasarkan kesesuaian skill, peran, status kualifikasi,
        dan kuota konkurensi (explainable multi-criteria scheduling).
        """
        # Gather all text from work item
        corpus_parts = [
            work_item.title.lower(),
            (work_item.description or "").lower(),
            work_item.type.lower(),
            work_item.priority.lower()
        ]
        if work_item.acceptance_criteria:
            corpus_parts.extend(c.lower() for c in work_item.acceptance_criteria)
        text_corpus = " ".join(corpus_parts)

        # Detect domain themes
        relevant_domains = []
        for domain, kws in KEYWORD_SYNONYMS.items():
            if any(kw in text_corpus for kw in kws):
                relevant_domains.append(domain)

        if not relevant_domains:
            # Fallback based on type
            if work_item.type == "bug":
                relevant_domains = ["qa", "backend"]
            else:
                relevant_domains = ["backend", "frontend"]

        # Query all active agents
        agents = db.query(AIAgent).filter(AIAgent.lifecycle_state == "active").all()
        scored_candidates: List[AgentRecommendationOut] = []

        for agent in agents:
            role_name = agent.role.name if agent.role else "General Agent"
            dept_name = agent.department.name if agent.department else "General"
            agent_skills = agent.skills or []
            
            matched_skills: List[str] = []
            skill_score = 0

            for skill in agent_skills:
                skill_lower = skill.name.lower()
                # Check direct match with work item text
                if skill_lower in text_corpus or any(part in skill_lower for part in text_corpus.split()):
                    matched_skills.append(skill.name)
                    skill_score += 20 if skill.is_verified else 12
                # Check domain synonyms
                elif any(domain in skill_lower for domain in relevant_domains):
                    matched_skills.append(skill.name)
                    skill_score += 15 if skill.is_verified else 10

            # Cap skill score at 50 pts
            skill_score = min(skill_score, 50)

            # Role alignment score (up to 30 pts)
            role_lower = role_name.lower()
            role_score = 0
            for domain in relevant_domains:
                if domain in role_lower:
                    role_score += 20
            if any(kw in role_lower for kw in text_corpus.split() if len(kw) > 3):
                role_score += 10
            role_score = min(role_score, 30)

            # Qualification score (up to 10 pts)
            qual_score = 10 if agent.qualification_state == "passed" else 4

            # Concurrency & capacity score (up to 10 pts)
            concurrency_score = 0
            has_headroom = agent.current_concurrency < agent.max_concurrency
            if has_headroom:
                concurrency_score = 10
            else:
                concurrency_score = 0

            # Calculate total match score
            total_score = min(100, skill_score + role_score + qual_score + concurrency_score)
            
            # Base minimum if role/department is vaguely relevant
            if total_score < 25 and any(d in dept_name.lower() for d in ["engineering", "quality"]):
                total_score = 35

            # Deduplicate matched skills
            unique_matched = list(dict.fromkeys(matched_skills))[:5]

            # Construct human-readable explainable rationale
            reasons = []
            if unique_matched:
                reasons.append(f"Keahlian relevan: {', '.join(unique_matched)}")
            if role_score > 0:
                reasons.append(f"Kesesuaian peran sebagai {role_name}")
            if agent.qualification_state == "passed":
                reasons.append("Status kualifikasi Passed")
            if has_headroom:
                reasons.append(f"Kapasitas tersedia ({agent.current_concurrency}/{agent.max_concurrency} slot aktif)")
            else:
                reasons.append(f"Kapasitas penuh ({agent.current_concurrency}/{agent.max_concurrency} slot aktif)")

            rationale_text = "; ".join(reasons) + "."

            scored_candidates.append(AgentRecommendationOut(
                agent_id=agent.id,
                name=agent.name,
                role_name=role_name,
                department_name=dept_name,
                match_score=total_score,
                qualification_state=agent.qualification_state,
                current_concurrency=agent.current_concurrency,
                max_concurrency=agent.max_concurrency,
                matched_skills=unique_matched,
                rationale=rationale_text,
                is_recommended=False
            ))

        # Sort by match score descending, then by available capacity
        scored_candidates.sort(key=lambda c: (c.match_score, c.max_concurrency - c.current_concurrency), reverse=True)

        # Mark top candidates (top 1 or score >= 75) as recommended
        if scored_candidates:
            scored_candidates[0].is_recommended = True
            for c in scored_candidates[1:3]:
                if c.match_score >= 70:
                    c.is_recommended = True

        return scored_candidates

    @staticmethod
    def assign_agent(
        db: Session,
        work_item: WorkItem,
        agent_id: str,
        actor: str = "Scrum Master",
        rationale: Optional[str] = None
    ) -> WorkItem:
        """
        Menugaskan agen ke work item secara aman, mengelola konkurensi, dan mencatat audit event.
        """
        agent = db.query(AIAgent).filter(AIAgent.id == agent_id).first()
        if not agent:
            raise ValueError(f"Agent with ID '{agent_id}' not found.")

        if agent.lifecycle_state != "active":
            raise ValueError(f"Cannot assign agent '{agent.name}' because lifecycle state is '{agent.lifecycle_state}'. Must be 'active'.")

        previous_assignee_id = work_item.assignee_agent_id
        previous_assignee_name = work_item.assignee.name if work_item.assignee else None

        # If work item was in_progress, update concurrency counts
        if work_item.status == "in_progress":
            if previous_assignee_id and previous_assignee_id != agent_id:
                prev_agent = db.query(AIAgent).filter(AIAgent.id == previous_assignee_id).first()
                if prev_agent and prev_agent.current_concurrency > 0:
                    prev_agent.current_concurrency -= 1
            if previous_assignee_id != agent_id:
                agent.current_concurrency += 1

        work_item.assignee_agent_id = agent.id

        # Record audit event
        db.add(AuditEvent(
            actor=actor,
            action="WORK_ITEM_ASSIGNED",
            target_type="WORK_ITEM",
            target_id=work_item.id,
            project_id=work_item.project_id,
            policy_basis="SCHEDULER_ASSIGNMENT_POLICY_V1",
            details={
                "key": work_item.key,
                "title": work_item.title,
                "assigned_agent_id": agent.id,
                "assigned_agent_name": agent.name,
                "previous_agent_name": previous_assignee_name,
                "rationale": rationale or "Assigned via smart scheduler recommendation",
                "current_concurrency": agent.current_concurrency,
                "max_concurrency": agent.max_concurrency
            }
        ))

        db.commit()
        db.refresh(work_item)
        return work_item

    @staticmethod
    def get_sprint_capacity(
        db: Session,
        project_id: str,
        sprint_id: Optional[str] = None
    ) -> SprintCapacityOut:
        """
        Menghitung kapasitas sprint, alokasi story points per agen, dan utilization rate.
        """
        # Calculate total project scope across all sprints
        all_project_items = db.query(WorkItem).filter(
            WorkItem.project_id == project_id,
            WorkItem.status != "cancelled"
        ).all()
        total_project_items = len(all_project_items)
        total_project_points = round(sum(i.estimate_points or 0.0 for i in all_project_items), 1)

        # Find target sprint
        sprint = None
        if sprint_id and sprint_id not in ["all", "active"]:
            sprint = db.query(Sprint).filter(Sprint.id == sprint_id, Sprint.project_id == project_id).first()
        if not sprint and sprint_id != "all":
            # Priority 1: active sprint
            sprint = db.query(Sprint).filter(Sprint.project_id == project_id, Sprint.status == "active").first()
            # Priority 2: pending_approval sprint
            if not sprint:
                sprint = db.query(Sprint).filter(Sprint.project_id == project_id, Sprint.status == "pending_approval").first()
            # Priority 3: first planning sprint
            if not sprint:
                sprint = db.query(Sprint).filter(Sprint.project_id == project_id).order_by(Sprint.created_at.asc()).first()

        if sprint_id == "all" or (not sprint and not db.query(Sprint).filter(Sprint.project_id == project_id).first()):
            all_sprints = db.query(Sprint).filter(Sprint.project_id == project_id).all()
            total_capacity = float(sum(s.capacity_points for s in all_sprints)) if all_sprints else 20.0
            sprint_id_val = None
            sprint_name_val = "Seluruh Backlog Project"
            sprint_status_val = "all"
            items = all_project_items
        else:
            total_capacity = float(sprint.capacity_points) if sprint else 20.0
            sprint_id_val = sprint.id if sprint else None
            sprint_name_val = sprint.name if sprint else "Sprint 1"
            sprint_status_val = sprint.status if sprint else "pending_approval"
            items = [i for i in all_project_items if i.sprint_id == sprint_id_val]

        allocated_points = sum(i.estimate_points or 0.0 for i in items if i.status != "cancelled")
        completed_points = sum(i.estimate_points or 0.0 for i in items if i.status == "done")

        utilization_rate = round((allocated_points / total_capacity * 100), 1) if total_capacity > 0 else 0.0

        # Group allocations by agent
        agent_allocations_dict: Dict[str, Dict[str, Any]] = {}

        for item in items:
            if not item.assignee_agent_id or item.status == "cancelled":
                continue
            
            aid = item.assignee_agent_id
            if aid not in agent_allocations_dict:
                ag = item.assignee
                agent_allocations_dict[aid] = {
                    "agent_id": aid,
                    "name": ag.name if ag else "Unknown Agent",
                    "role_name": ag.role.name if ag and ag.role else "Specialist",
                    "department_name": ag.department.name if ag and ag.department else "General",
                    "assigned_items_count": 0,
                    "assigned_points": 0.0,
                    "current_concurrency": ag.current_concurrency if ag else 0,
                    "max_concurrency": ag.max_concurrency if ag else 2,
                }
            agent_allocations_dict[aid]["assigned_items_count"] += 1
            agent_allocations_dict[aid]["assigned_points"] += (item.estimate_points or 0.0)

        agent_allocations_list = [
            AgentCapacityItem(**data) for data in agent_allocations_dict.values()
        ]
        agent_allocations_list.sort(key=lambda a: a.assigned_points, reverse=True)

        return SprintCapacityOut(
            sprint_id=sprint_id_val,
            sprint_name=sprint_name_val,
            sprint_status=sprint_status_val,
            total_capacity_points=total_capacity,
            allocated_points=round(allocated_points, 1),
            completed_points=round(completed_points, 1),
            utilization_rate=utilization_rate,
            agent_allocations=agent_allocations_list,
            total_project_points=total_project_points,
            total_project_items=total_project_items,
        )

scheduler_service = SchedulerService()
