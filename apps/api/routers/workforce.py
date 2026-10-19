from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from apps.api.core.database import get_db
from apps.api.models import AIAgent, AgentProfileVersion, AgentSkill, Department, JobRole, AuditEvent
from apps.api.adapters.live_adapter import live_adapter
from apps.api.schemas.workforce import (
    AIAgentCreate, AIAgentUpdate, AIAgentOut,
    AgentSkillOut, AgentProfileVersionOut,
)

router = APIRouter(prefix="/workforce", tags=["Workforce & Agents"])

def _build_agent_out(agent: AIAgent) -> AIAgentOut:
    llm_pname = None
    llm_mname = agent.llm_model

    if agent.llm_profile_id and agent.llm_profile_id in live_adapter._llm_configs:
        p = live_adapter._llm_configs[agent.llm_profile_id]
        llm_pname = p.get("name")
        if not llm_mname:
            llm_mname = p.get("model")
    else:
        # Inherit active system default
        d = next((item for item in live_adapter._llm_configs.values() if item.get("is_default")), None)
        if d:
            llm_pname = f"Default Sistem ({d.get('name')})"
            if not llm_mname:
                llm_mname = d.get("model")
        else:
            llm_pname = "Default Sistem"
            if not llm_mname:
                llm_mname = live_adapter.model

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
        llm_profile_id=agent.llm_profile_id,
        llm_profile_name=llm_pname,
        llm_model=llm_mname,
        instructions=agent.instructions,
        current_profile_version=agent.current_profile_version,
        created_at=agent.created_at,
        updated_at=agent.updated_at,
        role_name=agent.role.name if agent.role else None,
        department_name=agent.department.name if agent.department else None,
        skills=[AgentSkillOut.model_validate(s) for s in agent.skills],
    )

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
    return [_build_agent_out(a) for a in agents]

@router.post("/agents", response_model=AIAgentOut, status_code=status.HTTP_201_CREATED)
def create_agent(agent_in: AIAgentCreate, db: Session = Depends(get_db)):
    dept = db.query(Department).filter(Department.id == agent_in.department_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")

    role = db.query(JobRole).filter(JobRole.id == agent_in.role_id).first()
    if not role:
        raise HTTPException(status_code=404, detail="JobRole not found")

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
        llm_profile_id=agent_in.llm_profile_id.strip() if agent_in.llm_profile_id and agent_in.llm_profile_id.strip() else None,
        llm_model=agent_in.llm_model.strip() if agent_in.llm_model and agent_in.llm_model.strip() else None,
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
        config_snapshot={"max_concurrency": agent.max_concurrency, "engine": agent.engine_adapter, "llm_profile_id": agent.llm_profile_id},
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
        details={"name": agent.name, "role": role.name, "dept": dept.name, "llm_profile_id": agent.llm_profile_id}
    ))

    db.commit()
    db.refresh(agent)
    return _build_agent_out(agent)

@router.get("/agents/{agent_id}", response_model=AIAgentOut)
def get_agent(agent_id: str, db: Session = Depends(get_db)):
    agent = db.query(AIAgent).filter(AIAgent.id == agent_id).first()
    if not agent:
        raise HTTPException(status_code=404, detail="Agent not found")
    return _build_agent_out(agent)

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
    if update_in.llm_profile_id is not None:
        agent.llm_profile_id = update_in.llm_profile_id.strip() if update_in.llm_profile_id.strip() else None
    if update_in.llm_model is not None:
        agent.llm_model = update_in.llm_model.strip() if update_in.llm_model.strip() else None

    if instruction_changed:
        pv = AgentProfileVersion(
            agent_id=agent.id,
            version_number=agent.current_profile_version,
            instructions=agent.instructions,
            config_snapshot={"max_concurrency": agent.max_concurrency, "engine": agent.engine_adapter, "llm_profile_id": agent.llm_profile_id},
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
            "llm_profile_id": agent.llm_profile_id,
        }
    ))

    db.commit()
    db.refresh(agent)
    return _build_agent_out(agent)
