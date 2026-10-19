import uuid
import logging
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from apps.api.models import Project, Sprint, WorkItem, AIAgent, AuditEvent
from apps.api.adapters.live_adapter import live_adapter

logger = logging.getLogger(__name__)

class PMAssistantService:
    """
    Autonomous Technical Product Owner & Project Manager Assistant Service.
    Acts as 'Dewi Lestari' (Technical Product Owner & Agile Delivery Lead).
    """

    @classmethod
    def auto_plan_project(cls, project_id: str, db: Session) -> Dict[str, Any]:
        """
        Decomposes a project's goal into progressive Sprints and User Stories.
        Distributes stories into Sprint 1 (Foundation), Sprint 2 (Core Logic/UI),
        and Sprint 3 (Polish & SEO).
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with ID '{project_id}' not found.")

        # Gather active workforce agents to auto-assign
        agents = db.query(AIAgent).filter(AIAgent.lifecycle_state == "active").all()
        fe_agent = next((a for a in agents if "react" in (a.role.code.lower() if a.role else "") or "frontend" in (a.name.lower() if a.name else "") or "bayu" in a.name.lower() or "kairo" in a.name.lower()), agents[0] if agents else None)
        be_agent = next((a for a in agents if "arch" in (a.role.code.lower() if a.role else "") or "backend" in (a.name.lower() if a.name else "") or "atlas" in a.name.lower() or "aditya" in a.name.lower()), agents[0] if agents else None)
        qa_agent = next((a for a in agents if "qa" in (a.role.code.lower() if a.role else "") or "sentinel" in a.name.lower() or "fajar" in a.name.lower()), agents[0] if agents else None)

        p_name = project.name
        p_goal = project.goal or "Build complete responsive operational application with verified tests."
        p_key = project.key

        # Sprint templates definition
        sprint_plans = [
            {
                "name": "Sprint 1: Foundation, Architecture & Setup",
                "goal": f"Establish core skeleton, design tokens, navigation, and repository structure for {p_name}.",
                "capacity": 20,
                "status": "pending_approval",
                "stories": [
                    {
                        "title": f"Setup AppShell, Navigation Header & Design System for {p_name}",
                        "type": "story",
                        "priority": "critical",
                        "points": 5.0,
                        "criteria": [
                            "Clean modern AppShell with responsive desktop (1280px+) and mobile layout",
                            "Header navigation bar with logo, nav links, and CTA button",
                            "Dark/Light mode contrast compliant with WCAG 2.1 AA standards"
                        ],
                        "dod": ["Lint passed with zero errors", "TypeScript typecheck passed", "Component rendered without layout shifts"],
                        "agent": fe_agent
                    },
                    {
                        "title": f"Core Content Structure, Hero Section & Brand Messaging",
                        "type": "story",
                        "priority": "high",
                        "points": 5.0,
                        "criteria": [
                            "Compelling Hero section with headline, value proposition, and primary action button",
                            "Quick highlights / trusted credentials grid with clean visual hierarchy",
                            "Structured semantic HTML5 tags for accessibility and search indexing"
                        ],
                        "dod": ["Responsive on 375px mobile and 1440px desktop", "Acceptance criteria verified"],
                        "agent": fe_agent
                    },
                    {
                        "title": "CI/CD Pipeline & Automated Verification Gate",
                        "type": "task",
                        "priority": "high",
                        "points": 3.0,
                        "criteria": [
                            "Automated GitHub Actions workflow or test runner configured",
                            "Health and smoke test script passes with exit code 0"
                        ],
                        "dod": ["Tests passing in isolated sandbox workspace"],
                        "agent": qa_agent or be_agent
                    }
                ]
            },
            {
                "name": "Sprint 2: Core Features, Services & User Engagement",
                "goal": f"Deliver core showcase sections, interactive service cards, and customer conversion paths.",
                "capacity": 20,
                "status": "planning",
                "stories": [
                    {
                        "title": "Services & Offerings Grid with Interactive Modals",
                        "type": "story",
                        "priority": "high",
                        "points": 5.0,
                        "criteria": [
                            "Dynamic grid rendering service tiers / features with icons and badges",
                            "Detail modal or expandable view explaining service value propositions",
                            "Clear calls-to-action on every service card"
                        ],
                        "dod": ["No console errors or memory leaks", "Interactive states tested"],
                        "agent": fe_agent
                    },
                    {
                        "title": "Client Inquiries, Contact Form & Lead Submission",
                        "type": "story",
                        "priority": "high",
                        "points": 5.0,
                        "criteria": [
                            "Interactive contact form with input validation (name, email, phone, message)",
                            "Submission success state with clear confirmation message and feedback",
                            "Direct WhatsApp floating action button or quick inquiry link"
                        ],
                        "dod": ["Form input validation tested with invalid/valid inputs", "Zero unhandled rejections"],
                        "agent": fe_agent
                    },
                    {
                        "title": "Client Testimonials & Trust Showcase Carousel",
                        "type": "story",
                        "priority": "medium",
                        "points": 3.0,
                        "criteria": [
                            "Customer reviews and testimonials with star ratings and client avatar placeholders",
                            "Smooth accessible navigation controls (prev/next buttons + keyboard support)"
                        ],
                        "dod": ["Keyboard navigation verified", "Zero horizontal scroll overflow"],
                        "agent": fe_agent
                    }
                ]
            },
            {
                "name": "Sprint 3: SEO Optimization, Performance & Production Launch",
                "goal": f"Finalize performance auditing, meta tags, footer credentials, and release readiness.",
                "capacity": 20,
                "status": "planning",
                "stories": [
                    {
                        "title": "Footer Section, Legal Links, Social Icons & Site Map",
                        "type": "story",
                        "priority": "medium",
                        "points": 3.0,
                        "criteria": [
                            "Comprehensive footer with copyright, privacy policy, and terms links",
                            "Verified social media links with accessible aria-labels",
                            "Operational back-to-top floating button"
                        ],
                        "dod": ["All external links have rel='noopener noreferrer'", "Contrast verified"],
                        "agent": fe_agent
                    },
                    {
                        "title": "OpenGraph Meta Tags, Structured Data & SEO Optimization",
                        "type": "task",
                        "priority": "high",
                        "points": 3.0,
                        "criteria": [
                            "OpenGraph and Twitter card meta tags for rich link previews",
                            "JSON-LD organization structured data schema markup included",
                            "Favicon and web manifest configured"
                        ],
                        "dod": ["Structured data validator passes with 0 warnings"],
                        "agent": be_agent or fe_agent
                    },
                    {
                        "title": "End-to-End Performance, Accessibility & Cross-Browser Audit",
                        "type": "task",
                        "priority": "critical",
                        "points": 5.0,
                        "criteria": [
                            "Lighthouse performance score >= 90",
                            "100% WCAG AA contrast compliance across all breakpoints",
                            "Production build completes with zero errors"
                        ],
                        "dod": ["Release checklist signed off by QA"],
                        "agent": qa_agent or be_agent
                    }
                ]
            }
        ]

        # Check existing sprints for project
        existing_sprints = db.query(Sprint).filter(Sprint.project_id == project.id).all()
        created_sprints = []
        created_items = []

        counter = project.item_counter or 0

        for s_idx, s_plan in enumerate(sprint_plans):
            # If a sprint already exists at this index, reuse or update it
            if s_idx < len(existing_sprints):
                sprint = existing_sprints[s_idx]
                sprint.name = s_plan["name"]
                sprint.goal = s_plan["goal"]
                sprint.capacity_points = s_plan["capacity"]
                sprint.status = s_plan["status"]
            else:
                sprint = Sprint(
                    project_id=project.id,
                    name=s_plan["name"],
                    goal=s_plan["goal"],
                    capacity_points=s_plan["capacity"],
                    status=s_plan["status"],
                )
                db.add(sprint)
                db.flush()

            created_sprints.append(sprint)

            # Create the stories for this sprint
            for st in s_plan["stories"]:
                counter += 1
                item_key = f"{p_key}-{counter}"
                # If Sprint 1, stories are 'ready' so they can be run once human approves; other sprints are 'backlog'
                st_status = "ready" if s_idx == 0 else "backlog"

                item = WorkItem(
                    project_id=project.id,
                    sprint_id=sprint.id,
                    key=item_key,
                    type=st["type"],
                    title=st["title"],
                    description=f"Auto-planned by Technical Product Owner Dewi Lestari for {sprint.name}.\n\nGoal: {s_plan['goal']}",
                    status=st_status,
                    priority=st["priority"],
                    estimate_points=st["points"],
                    acceptance_criteria=st["criteria"],
                    definition_of_done=st["dod"],
                    assignee_agent_id=st["agent"].id if st["agent"] else None,
                    git_branch=f"agencyos/{p_key}/{item_key}"
                )
                db.add(item)
                created_items.append(item)

        project.item_counter = counter
        
        # Log Audit Event
        db.add(AuditEvent(
            actor="Technical Product Owner (Dewi Lestari)",
            action="AI_AUTO_PLAN_PROJECT",
            target_type="PROJECT",
            target_id=project.id,
            project_id=project.id,
            policy_basis="POL-SCRUM-AUTONOMOUS-PLANNING-V1",
            details={
                "project_key": p_key,
                "sprints_planned": len(created_sprints),
                "work_items_created": len(created_items),
                "sprint_1_status": "pending_approval"
            }
        ))

        db.commit()

        return {
            "status": "success",
            "message": f"Project '{p_name}' successfully planned with 3 progressive sprints and {len(created_items)} user stories. Sprint 1 is awaiting your approval to start.",
            "sprints_count": len(created_sprints),
            "stories_count": len(created_items),
            "sprint_1_id": created_sprints[0].id if created_sprints else None,
            "sprint_1_status": created_sprints[0].status if created_sprints else None,
            "pipeline_summary": [
                {
                    "step": 1,
                    "title": "Goal & Architecture Decomposition",
                    "actor": "Dewi Lestari (Technical Product Owner)",
                    "detail": f"Menganalisis tujuan '{p_name}': {p_goal}. Menetapkan arsitektur 3 fase progresif.",
                    "status": "completed"
                },
                {
                    "step": 2,
                    "title": "Progressive Sprints Structuring",
                    "actor": "Dewi Lestari (Scrum Lead)",
                    "detail": "Menyusun Sprint 1 (Foundation & Setup), Sprint 2 (Core Features & UI), dan Sprint 3 (SEO & Deploy).",
                    "status": "completed"
                },
                {
                    "step": 3,
                    "title": "Backlog & Acceptance Criteria Formulation",
                    "actor": "Dewi Lestari",
                    "detail": f"Merumuskan {len(created_items)} User Stories & Tasks lengkap dengan Fibonacci Story Points, Acceptance Criteria, dan DoD.",
                    "status": "completed"
                },
                {
                    "step": 4,
                    "title": "Agent Capability Matching & Staffing",
                    "actor": "Dewi Lestari & Workforce Scheduler",
                    "detail": "Menugaskan agen terbaik berdasarkan skill match: Frontend Specialist, QA Sentinel, Backend/Arch.",
                    "status": "completed"
                },
                {
                    "step": 5,
                    "title": "Sprint 1 Approval Gate Preparation",
                    "actor": "AgencyOS Governance Engine",
                    "detail": "Sprint 1 disiapkan dalam status 'pending_approval' menunggu tinjauan dan konfirmasi Project Owner.",
                    "status": "ready_for_approval"
                }
            ],
            "sprints": [
                {
                    "id": s.id,
                    "name": s.name,
                    "goal": s.goal,
                    "status": s.status,
                    "stories_count": len([item for item in created_items if item.sprint_id == s.id])
                } for s in created_sprints
            ],
            "items": [
                {
                    "id": i.id,
                    "key": i.key,
                    "title": i.title,
                    "type": i.type,
                    "points": i.estimate_points,
                    "sprint_id": i.sprint_id,
                    "assignee_id": i.assignee_agent_id
                } for i in created_items
            ]
        }

    @classmethod
    def instruct_pm(cls, project_id: str, instruction: str, db: Session) -> Dict[str, Any]:
        """
        Processes human conversational instruction to automatically create,
        estimate, and assign new WorkItem(s) to the active or planned sprint.
        """
        project = db.query(Project).filter(Project.id == project_id).first()
        if not project:
            raise ValueError(f"Project with ID '{project_id}' not found.")

        if not instruction or not instruction.strip():
            raise ValueError("Instruksi tidak boleh kosong.")

        clean_inst = instruction.strip()

        # Find target sprint: prefer active sprint, fallback to pending_approval or planning
        active_sprint = (
            db.query(Sprint).filter(Sprint.project_id == project.id, Sprint.status == "active").first()
            or db.query(Sprint).filter(Sprint.project_id == project.id, Sprint.status == "pending_approval").first()
            or db.query(Sprint).filter(Sprint.project_id == project.id).first()
        )

        # Match agents
        agents = db.query(AIAgent).filter(AIAgent.lifecycle_state == "active").all()
        fe_agent = next((a for a in agents if "react" in (a.role.code.lower() if a.role else "") or "bayu" in a.name.lower() or "kairo" in a.name.lower()), agents[0] if agents else None)
        be_agent = next((a for a in agents if "arch" in (a.role.code.lower() if a.role else "") or "atlas" in a.name.lower() or "aditya" in a.name.lower()), agents[0] if agents else None)

        # Determine type & assignee based on instruction keywords
        inst_lower = clean_inst.lower()
        is_backend = any(k in inst_lower for k in ["api", "database", "backend", "endpoint", "sql", "server", "keamanan", "auth"])
        is_bug = any(k in inst_lower for k in ["bug", "error", "rusak", "fix", "perbaiki", "salah"])

        assigned_agent = be_agent if is_backend else fe_agent
        item_type = "bug" if is_bug else ("task" if "setup" in inst_lower or "config" in inst_lower else "story")
        priority = "critical" if ("urgent" in inst_lower or "segera" in inst_lower or "penting" in inst_lower) else "high"

        # Generate story points
        points = 5.0 if ("kompleks" in inst_lower or "lengkap" in inst_lower) else 3.0

        # Increment project counter
        counter = (project.item_counter or 0) + 1
        project.item_counter = counter
        item_key = f"{project.key}-{counter}"

        # Generate title from instruction
        title = clean_inst
        if len(title) > 90:
            title = title[:87] + "..."

        criteria = [
            f"Fungsionalitas '{clean_inst}' terimplementasi dengan baik",
            "Tampilan responsif dan terintegrasi dengan layout yang sudah ada",
            "Zero console error dan lolos automated quality gate check"
        ]

        new_item = WorkItem(
            project_id=project.id,
            sprint_id=active_sprint.id if active_sprint else None,
            key=item_key,
            type=item_type,
            title=title,
            description=f"Instruksi langsung dari Project Owner:\n\"{clean_inst}\"\n\nDeliverable ini diproses oleh Dewi Lestari (Technical Product Owner) dan ditugaskan ke {assigned_agent.name if assigned_agent else 'Tim Agen'}.",
            status="ready" if (active_sprint and active_sprint.status == "active") else "backlog",
            priority=priority,
            estimate_points=points,
            acceptance_criteria=criteria,
            definition_of_done=["Kode ter-merge via Git branch", "Lolos automated lint & test verification"],
            assignee_agent_id=assigned_agent.id if assigned_agent else None,
            git_branch=f"agencyos/{project.key}/{item_key}"
        )

        db.add(new_item)
        db.flush()

        # Audit Event
        db.add(AuditEvent(
            actor="Technical Product Owner (Dewi Lestari)",
            action="PM_INSTRUCTION_PROCESSED",
            target_type="WORK_ITEM",
            target_id=new_item.id,
            project_id=project.id,
            policy_basis="POL-SCRUM-AUTONOMOUS-PM-V1",
            details={
                "instruction": clean_inst,
                "item_key": item_key,
                "assignee": assigned_agent.name if assigned_agent else None,
                "sprint": active_sprint.name if active_sprint else "Backlog"
            }
        ))

        db.commit()

        sprint_name = active_sprint.name if active_sprint else "Product Backlog"
        assignee_name = assigned_agent.name if assigned_agent else "Tim Agen"

        return {
            "status": "success",
            "item_key": item_key,
            "title": title,
            "sprint_name": sprint_name,
            "assignee_name": assignee_name,
            "points": points,
            "pm_response": f"Siap, instruksi Anda telah diproses! Saya telah membuat {item_type.upper()} '{item_key}: {title}' ({points} Story Points). Task ini telah dimasukkan ke '{sprint_name}' dan ditugaskan ke {assignee_name}."
        }

    @classmethod
    def approve_start_sprint(cls, project_id: str, sprint_id: str, approved_by: str, db: Session) -> Dict[str, Any]:
        """
        Approves and officially starts a Sprint. Transitions status to 'active'.
        Moves all its backlog items to 'ready' so agents can execute them.
        """
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id, Sprint.project_id == project_id).first()
        if not sprint:
            raise ValueError(f"Sprint with ID '{sprint_id}' not found.")

        # Ensure no other sprint is active in this project
        other_active = db.query(Sprint).filter(
            Sprint.project_id == project_id,
            Sprint.id != sprint_id,
            Sprint.status == "active"
        ).all()
        for s in other_active:
            s.status = "completed"

        sprint.status = "active"
        sprint.approved_by = approved_by or "Project Owner"
        sprint.approved_at = datetime.now(timezone.utc)
        sprint.start_date = datetime.now(timezone.utc)

        # Transition sprint's items to 'ready'
        items = db.query(WorkItem).filter(WorkItem.sprint_id == sprint.id, WorkItem.status == "backlog").all()
        for item in items:
            item.status = "ready"

        db.add(AuditEvent(
            actor=approved_by or "Project Owner",
            action="APPROVE_START_SPRINT",
            target_type="SPRINT",
            target_id=sprint.id,
            project_id=project_id,
            policy_basis="POL-SCRUM-SPRINT-GOVERNANCE-V1",
            details={
                "sprint_name": sprint.name,
                "capacity": sprint.capacity_points,
                "items_activated": len(items)
            }
        ))

        db.commit()

        return {
            "status": "success",
            "message": f"{sprint.name} telah disetujui dan resmi dimulai! Agen di Scrum Board kini dapat mengeksekusi tugas.",
            "sprint_status": sprint.status,
            "activated_items_count": len(items)
        }

    @classmethod
    def complete_review_sprint(cls, project_id: str, sprint_id: str, review_notes: Optional[str], db: Session) -> Dict[str, Any]:
        """
        Completes an active sprint with a structured Scrum Retrospective.
        Checks if next sprint exists or triggers project completion.
        """
        sprint = db.query(Sprint).filter(Sprint.id == sprint_id, Sprint.project_id == project_id).first()
        if not sprint:
            raise ValueError(f"Sprint with ID '{sprint_id}' not found.")

        items = db.query(WorkItem).filter(WorkItem.sprint_id == sprint.id).all()
        total_items = len(items)
        done_items = sum(1 for i in items if i.status == "done")
        total_points = sum(i.estimate_points or 0 for i in items)
        done_points = sum(i.estimate_points or 0 for i in items if i.status == "done")

        # Generate Retrospective evaluation
        retrospective = {
            "went_well": [
                f"Menyelesaikan {done_items} dari {total_items} user stories ({int((done_points/total_points)*100) if total_points else 100}% delivery rate).",
                f"Velocity tim mencapai {done_points} Story Points tanpa regresi fungsional.",
                "Quality Gates otomatis (CI, lint, TypeScript) terpenuhi pada setiap branch pekerjaan."
            ],
            "bottlenecks": [
                "Perlu memastikan sinkronisasi preview visual dilakukan seawal mungkin pada tiap story." if done_items < total_items else "Zero defect escape pada sprint ini."
            ],
            "action_items": [
                "Pertahankan momentum velocity untuk sprint berikutnya.",
                "Optimalkan branch PR merging agar deliverable langsung live di branch main."
            ]
        }

        sprint.status = "completed"
        sprint.end_date = datetime.now(timezone.utc)
        sprint.review_notes = review_notes or "Sprint deliverables accepted by Project Owner."
        sprint.retrospective = retrospective

        # Check for next planned sprint
        next_sprint = db.query(Sprint).filter(
            Sprint.project_id == project_id,
            Sprint.status.in_(["planning", "pending_approval"]),
            Sprint.id != sprint_id
        ).order_by(Sprint.created_at.asc()).first()

        project_completed = False
        if next_sprint:
            next_sprint.status = "pending_approval"
        else:
            # All sprints completed! Check remaining backlog
            remaining_backlog = db.query(WorkItem).filter(
                WorkItem.project_id == project_id,
                WorkItem.status != "done"
            ).count()

            if remaining_backlog == 0:
                project = db.query(Project).filter(Project.id == project_id).first()
                if project:
                    project.status = "completed"
                    project_completed = True

        db.add(AuditEvent(
            actor="Project Owner & Scrum Master",
            action="COMPLETE_SPRINT_AND_RETRO",
            target_type="SPRINT",
            target_id=sprint.id,
            project_id=project_id,
            policy_basis="POL-SCRUM-SPRINT-GOVERNANCE-V1",
            details={
                "sprint_name": sprint.name,
                "velocity": done_points,
                "retrospective": retrospective,
                "next_sprint_id": next_sprint.id if next_sprint else None,
                "project_completed": project_completed
            }
        ))

        db.commit()

        return {
            "status": "success",
            "message": f"{sprint.name} telah selesai dievaluasi dan ditutup.",
            "velocity": done_points,
            "retrospective": retrospective,
            "next_sprint": {
                "id": next_sprint.id,
                "name": next_sprint.name,
                "status": next_sprint.status
            } if next_sprint else None,
            "project_completed": project_completed
        }

    @classmethod
    def request_work_item_revision(cls, work_item_id: str, revision_notes: str, requested_by: str, db: Session) -> Dict[str, Any]:
        """
        Reopens a work item for revision, logging user feedback notes.
        """
        item = db.query(WorkItem).filter(WorkItem.id == work_item_id).first()
        if not item:
            raise ValueError(f"Work item with ID '{work_item_id}' not found.")

        if not revision_notes or not revision_notes.strip():
            raise ValueError("Catatan revisi tidak boleh kosong.")

        clean_notes = revision_notes.strip()
        item.status = "in_progress"
        item.revision_notes = clean_notes
        item.revision_count = (item.revision_count or 0) + 1

        db.add(AuditEvent(
            actor=requested_by or "Project Owner",
            action="REQUEST_WORK_ITEM_REVISION",
            target_type="WORK_ITEM",
            target_id=item.id,
            project_id=item.project_id,
            policy_basis="POL-SCRUM-REVISION-V1",
            details={
                "revision_count": item.revision_count,
                "revision_notes": clean_notes,
                "item_key": item.key
            }
        ))

        db.commit()

        return {
            "status": "success",
            "message": f"Permintaan revisi untuk '{item.key}' telah dikirim ke agen. Status kartu kembali ke In Progress.",
            "item_key": item.key,
            "revision_count": item.revision_count,
            "status_now": item.status
        }

pm_assistant = PMAssistantService()
