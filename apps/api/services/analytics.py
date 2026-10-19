from datetime import datetime, timezone, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException

from apps.api.models.project import Project, Sprint
from apps.api.models.scrum import WorkItem
from apps.api.models.workforce import AIAgent
from apps.api.schemas.analytics import (
    SprintBurndownOut,
    BurndownDayPoint,
    BurndownAssigneeItem,
    ProjectVelocityOut,
    SprintVelocityItem,
)

class AnalyticsService:
    def get_sprint_burndown(
        self,
        db: Session,
        project_id: str,
        sprint_id: Optional[str] = None
    ) -> SprintBurndownOut:
        project = db.query(Project).filter(
            (Project.id == project_id) | (Project.key == project_id.upper())
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")

        # Find requested sprint or active sprint or latest sprint
        sprint = None
        if sprint_id:
            sprint = db.query(Sprint).filter(
                Sprint.id == sprint_id,
                Sprint.project_id == project.id
            ).first()
        else:
            sprint = db.query(Sprint).filter(
                Sprint.project_id == project.id,
                Sprint.status == "active"
            ).first()

            if not sprint:
                sprint = db.query(Sprint).filter(
                    Sprint.project_id == project.id
                ).order_by(Sprint.created_at.desc()).first()

        if not sprint:
            raise HTTPException(status_code=404, detail="No sprint found for this project.")

        # Get work items
        work_items = db.query(WorkItem).filter(WorkItem.sprint_id == sprint.id).all()
        total_points = sum(item.estimate_points or 0.0 for item in work_items)
        completed_items = [i for i in work_items if i.status == "done"]
        completed_points = sum(item.estimate_points or 0.0 for item in completed_items)
        remaining_points = max(0.0, round(total_points - completed_points, 1))

        # Sprint timeframe
        start_time = sprint.start_date or sprint.created_at or datetime.now(timezone.utc)
        if start_time.tzinfo is None:
            start_time = start_time.replace(tzinfo=timezone.utc)

        end_time = sprint.end_date or (start_time + timedelta(days=14))
        if end_time.tzinfo is None:
            end_time = end_time.replace(tzinfo=timezone.utc)

        total_days = max(1, (end_time.date() - start_time.date()).days)
        now = datetime.now(timezone.utc)
        current_day = min(total_days, max(0, (now.date() - start_time.date()).days))

        # Build day-by-day points
        days: List[BurndownDayPoint] = []
        is_sprint_done = sprint.status == "completed"

        for d in range(total_days + 1):
            day_date = start_time.date() + timedelta(days=d)
            ideal_rem = max(0.0, round(total_points * (1.0 - (d / total_days)), 1))

            if is_sprint_done or day_date <= now.date():
                # Points completed on or before this day
                pts_done = 0.0
                for item in completed_items:
                    item_date = item.updated_at.date() if item.updated_at else start_time.date()
                    if item_date <= day_date:
                        pts_done += (item.estimate_points or 0.0)
                actual_rem = max(0.0, round(total_points - pts_done, 1))
            else:
                actual_rem = None

            days.append(BurndownDayPoint(
                day=d,
                date=day_date.isoformat(),
                ideal_remaining=ideal_rem,
                actual_remaining=actual_rem
            ))

        ideal_today = max(0.0, round(total_points * (1.0 - (current_day / total_days)), 1))
        variance = round(remaining_points - ideal_today, 1)

        if variance <= -1.0:
            health_status = "ahead"
        elif variance >= 2.0:
            health_status = "behind"
        else:
            health_status = "on_track"

        # Status breakdown
        status_breakdown = {
            "done": len(completed_items),
            "in_progress": len([i for i in work_items if i.status == "in_progress"]),
            "in_review": len([i for i in work_items if i.status == "in_review"]),
            "ready": len([i for i in work_items if i.status == "ready"]),
            "backlog": len([i for i in work_items if i.status == "backlog"]),
            "blocked": len([i for i in work_items if i.status == "blocked"]),
        }

        # Assignee breakdown
        assignee_map: Dict[str, Dict[str, Any]] = {}
        for item in work_items:
            key = item.assignee_agent_id or "unassigned"
            if key not in assignee_map:
                assignee_map[key] = {
                    "agent_id": item.assignee_agent_id,
                    "name": item.assignee.name if item.assignee else "Unassigned",
                    "role_name": item.assignee.role.name if (item.assignee and item.assignee.role) else "Unassigned",
                    "allocated_points": 0.0,
                    "completed_points": 0.0,
                }
            assignee_map[key]["allocated_points"] += (item.estimate_points or 0.0)
            if item.status == "done":
                assignee_map[key]["completed_points"] += (item.estimate_points or 0.0)

        assignee_breakdown = [
            BurndownAssigneeItem(
                agent_id=v["agent_id"],
                name=v["name"],
                role_name=v["role_name"],
                allocated_points=round(v["allocated_points"], 1),
                completed_points=round(v["completed_points"], 1),
            )
            for v in assignee_map.values()
        ]

        return SprintBurndownOut(
            sprint_id=sprint.id,
            sprint_name=sprint.name,
            sprint_status=sprint.status,
            sprint_goal=sprint.goal,
            start_date=start_time.date().isoformat(),
            end_date=end_time.date().isoformat(),
            total_days=total_days,
            current_day=current_day,
            total_points=round(total_points, 1),
            completed_points=round(completed_points, 1),
            remaining_points=remaining_points,
            ideal_today=ideal_today,
            variance=variance,
            health_status=health_status,
            days=days,
            status_breakdown=status_breakdown,
            assignee_breakdown=assignee_breakdown,
        )

    def get_project_velocity(self, db: Session, project_id: str) -> ProjectVelocityOut:
        project = db.query(Project).filter(
            (Project.id == project_id) | (Project.key == project_id.upper())
        ).first()
        if not project:
            raise HTTPException(status_code=404, detail="Project not found.")

        sprints = db.query(Sprint).filter(
            Sprint.project_id == project.id
        ).order_by(Sprint.created_at.asc()).all()

        velocity_items: List[SprintVelocityItem] = []
        for s in sprints:
            items = db.query(WorkItem).filter(WorkItem.sprint_id == s.id).all()
            committed = sum(i.estimate_points or 0.0 for i in items)
            completed = sum(i.estimate_points or 0.0 for i in items if i.status == "done")
            rate = round((completed / committed) * 100, 1) if committed > 0 else 100.0

            velocity_items.append(SprintVelocityItem(
                sprint_id=s.id,
                name=s.name,
                status=s.status,
                committed_points=round(committed, 1),
                completed_points=round(completed, 1),
                delivery_rate=rate,
            ))

        completed_sprints = [s for s in velocity_items if s.status == "completed"]
        if completed_sprints:
            avg_vel = round(sum(s.completed_points for s in completed_sprints) / len(completed_sprints), 1)
            pred_rate = round(sum(s.delivery_rate for s in completed_sprints) / len(completed_sprints), 1)
        else:
            # If no sprint completed, use active sprint completed points or 0.0
            active = [s for s in velocity_items if s.status == "active"]
            avg_vel = active[0].completed_points if active else 0.0
            pred_rate = 100.0

        return ProjectVelocityOut(
            project_id=project.id,
            average_velocity=avg_vel,
            predictability_rate=pred_rate,
            completed_sprints_count=len(completed_sprints),
            sprints=velocity_items,
        )

analytics_service = AnalyticsService()
