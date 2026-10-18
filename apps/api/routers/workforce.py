from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from apps.api.core.database import get_db
from apps.api.models import AIAgent, AgentProfileVersion, AgentSkill, Department, JobRole, AuditEvent
from apps.api.schemas.workforce import (
    AIAgentCreate, AIAgentUpdate, AIAgentOut,
    AgentSkillOut, AgentProfileVersionOut,
)

router = APIRouter(prefix="/workforce", tags=["Workforce & Agents"])

@router.get("/agents", response_model=List[AIAgentOut])
def list_agents(
    department_id: Optional[str] = Query(None),
    role_id: Optional[str] = Query(None),
    lifecycle_state: Optional[str] = Query(None),
    qualification_state: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(AIAgent)
    if department_id:
        query = query.filter(AIAgent.department_id == department_id)
    if role_id:
        query = query.filter(AIAgent.role_id == role_id)
    if lifecycle_state:
        query = query.filter(AIAgent.lifecycle_state == lifecycle_state)
    if qualification_state:
        query = query.filter(AIAgent.qualification_state == qualification_state)
    if search:
        query = query.filter(AIAgent.name.ilike(f"%{search}%"))

    agents = query.all()
    results = []
    for a in agents:
        out = AIAgentOut(
            id=a.id,
            name=a.name,
            title=a.title,
            role_id=a.role_id,
            department_id=a.department_id,
            lifecycle_state=a.lifecycle_state,
            availability_state=a.availability_state,
            qualification_state=a.qualification_state,
            max_concurrency=a.max_concurrency,
            current_concurrency=a.current_concurrency,
            engine_adapter=a.engine_adapter,
            instructions=a.instructions,
            current_profile_version=a.current_profile_version,
            created_at=a.created_at,
            updated_at=a.updated_at,
            role_name=a.role.name if a.role else None,
            department_name=a.department.name if a.department else None,
            skills=[AgentSkillOut.model_validate(s) for s in a.skills],
        )
        results.append(out)
    return results

@router.post("/agents", response_model=AIAgentOut, status_code=status.HTTP_201_CREATED)
def create_agent(agent_in: AIAgentCreate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == agent_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    role = db.query(JobRole).filter(JobRole.id == agent_in.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="JobRole not found")

    existing = db.query(AIAgent).filter(AIAgent.name == agent_in.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Agent '{agent_in.name}' already exists.")

    agent = AIAgent(
        name=agent_in.name,
        title=agent_in.title or role.name,
        role_id=agent_in.role_id,
        department_id=agent_in.department_id,
        lifecycle_state=agent_in.lifecycle_state,
        availability_state=agent_in.availability_state,
        qualification_state=agent_in.qualification_state,
        max_concurrency=agent_in.max_concurrency,
        current_concurrency=0,
        engine_adapter=agent_in.engine_adapter,
        instructions=agent_in.instructions or role.description,
        current_profile_version=1,
    )
    db.add(agent)
    db.flush()

    # Initial profile version
    pv = AgentProfileVersion(
        agent_id=agent.id,
        version_number=1,
        instructions=agent.instructions,
        config_snapshot={"max_concurrency": agent.max_concurrency, "engine": agent.engine_adapter},
        change_rationale="Initial agent creation"
    )
    db.add(pv)

    # Initial skills
    for skill_name in agent_in.initial_skills:
        db.add(AgentSkill(
            agent_id=agent.id,
            name=skill_name,
            is_verified=False
        ))

    # Audit Event
    db.add(AuditEvent(
        actor="Agency Owner",
        action="CREATE_AGENT",
        target_type="AI_AGENT",
        target_id=agent.id,
        policy_basis="WORKFORCE_PROVISIONING_V1",
        details={"name": agent.name, "role": role.name, "dept": dept.name}
    ))

    db.commit()
    db.refresh(agent)

    return AIAgentOut(
        id=agent.id,
        name=agent.name,
        title=agent.title,
        role_id=agent.role_id,
        department_id=agent.department_id,
        lifecycle_state=agent.lifecycle_state,
        availability_state=agent.availability_state,
        qualification_state=agent.qualification_state,
        max_concurrency=agent.max_concurrency,
        current_concurrency=agent.current_concurrency,
        engine_adapter=agent.engine_adapter,
        instructions=agent.instructions,
        current_profile_version=agent.current_profile_version,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        role_name=role.name,
        department_name=dept.name,
        skills=[AgentSkillOut.model_validate(s) for s in agent.skills],
    )

@router.get("/agents/{agent_id}", response_model=AIAgentOut)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(AIAgent).filter(AIAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    return AIAgentOut(
        id=agent.id,
        name=agent.name,
        title=agent.title,
        role_id=agent.role_id,
        department_id=agent.department_id,
        lifecycle_state=agent.lifecycle_state,
        availability_state=agent.availability_state,
        qualification_state=agent.qualification_state,
        max_concurrency=agent.max_concurrency,
        current_concurrency=agent.current_concurrency,
        engine_adapter=agent.engine_adapter,
        instructions=agent.instructions,
        current_profile_version=agent.current_profile_version,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        role_name=agent.role.name if agent.role else None,
        department_name=agent.department.name if agent.department else None,
        skills=[AgentSkillOut.model_validate(s) for s in agent.skills],
    )

@router.patch("/agents/{agent_id}", response_model=AIAgentOut)
def update_agent(agent_id: str, update_in: AIAgentUpdate, db: Session = Depends(get_db)):
    agent = db.query(AIAgent).filter(AIAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")

    instruction_changed = False
    if update_in.instructions is not None and update_in.instructions != agent.instructions:
        instruction_changed = True
        agent.instructions = update_in.instructions
        agent.current_profile_version += 1

    if update_in.name is not None:
        agent.name = update_in.name
    if update_in.title is not None:
        agent.title = update_in.title
    if update_in.lifecycle_state is not None:
        agent.lifecycle_state = update_in.lifecycle_state
    if update_in.availability_state is not None:
        agent.availability_state = update_in.availability_state
    if update_in.qualification_state is not None:
        agent.qualification_state = update_in.qualification_state
    if update_in.max_concurrency is not None:
        agent.max_concurrency = update_in.max_concurrency
    if update_in.engine_adapter is not None:
        agent.engine_adapter = update_in.engine_adapter

    if instruction_changed:
        pv = AgentProfileVersion(
            agent_id=agent.id,
            version_number=agent.current_profile_version,
            instructions=agent.instructions,
            config_snapshot={"max_concurrency": agent.max_concurrency, "engine": agent.engine_adapter},
            change_rationale=update_in.change_rationale or "Instruction update"
        )
        db.add(pv)

    # Audit Event
    db.add(AuditEvent(
        actor="Agency Owner",
        action="UPDATE_AGENT",
        target_type="AI_AGENT",
        target_id=agent.id,
        policy_basis="WORKFORCE_MANAGEMENT",
        details={
            "instruction_changed": instruction_changed,
            "version": agent.current_profile_version,
            "lifecycle_state": agent.lifecycle_state,
        }
    ))

    db.commit()
    db.refresh(agent)

    return AIAgentOut(
        id=agent.id,
        name=agent.name,
        title=agent.title,
        role_id=agent.role_id,
        department_id=agent.department_id,
        lifecycle_state=agent.lifecycle_state,
        availability_state=agent.availability_state,
        qualification_state=agent.qualification_state,
        max_concurrency=agent.max_concurrency,
        current_concurrency=agent.current_concurrency,
        engine_adapter=agent.engine_adapter,
        instructions=agent.instructions,
        current_profile_version=agent.current_profile_version,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        role_name=agent.role.name if agent.role else None,
        department_name=agent.department.name if agent.department else None,
        skills=[AgentSkillOut.model_validate(s) for s in agent.skills],
    )
