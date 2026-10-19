"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { AppShell } from "../../../../components/layout/AppShell";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { PriorityIndicator, PriorityLevel } from "../../../../components/ui/PriorityIndicator";
import { Button } from "../../../../components/ui/Button";
import { TableSkeleton } from "../../../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../../../components/ui/ErrorState";
import {
  Plus,
  ArrowRight,
  ArrowLeft,
  X,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  Flame,
  Check,
  RotateCcw,
  Edit2,
  Trash2,
  GitBranch,
  GripVertical,
  Play,
  Sparkles,
  Terminal,
  FileCode,
  ShieldCheck,
  Layers,
  Users,
  Zap,
  TrendingUp,
  BarChart2,
  CheckCircle,
  Kanban,
  ListTodo,
  Calendar,
  Bot,
  Github,
  ExternalLink,
  Copy,
  GitPullRequest,
} from "lucide-react";

interface AgentRecommendation {
  agent_id: string;
  name: string;
  role_name: string;
  department_name: string;
  match_score: number;
  qualification_state: string;
  current_concurrency: number;
  max_concurrency: number;
  matched_skills: string[];
  rationale: string;
  is_recommended: boolean;
}

interface AgentCapacityItem {
  agent_id: string;
  name: string;
  role_name: string;
  department_name: string;
  assigned_items_count: number;
  assigned_points: number;
  current_concurrency: number;
  max_concurrency: number;
}

interface SprintCapacity {
  sprint_id?: string;
  sprint_name?: string;
  sprint_status?: string;
  total_capacity_points: number;
  allocated_points: number;
  completed_points: number;
  utilization_rate: number;
  agent_allocations: AgentCapacityItem[];
}

interface WorkItemSubtask {
  id: string;
  key: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  estimate_points: number;
  assignee_agent_id?: string;
  assignee_name?: string;
  git_branch?: string;
}

interface WorkItem {
  id: string;
  project_id: string;
  parent_id?: string;
  key: string;
  type: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  estimate_points: number;
  acceptance_criteria: string[];
  definition_of_done: string[];
  assignee_agent_id?: string;
  assignee_name?: string;
  sprint_id?: string;
  blocker_reason?: string;
  git_branch?: string;
  pull_request_url?: string;
  pull_request_number?: number;
  pull_request_status?: string;
  subtasks?: WorkItemSubtask[];
}

interface ExecutionRun {
  id: string;
  project_id: string;
  work_item_id: string;
  agent_id?: string;
  status: string;
  workspace_path: string;
  is_simulated: boolean;
  adapter_name: string;
  error_message?: string;
  started_at: string;
  completed_at?: string;
}

interface RunLog {
  id: number;
  run_id: string;
  timestamp: string;
  stage: string;
  level: string;
  message: string;
  is_simulated: boolean;
}

interface RunArtifact {
  id: string;
  run_id: string;
  name: string;
  artifact_type: string;
  file_path: string;
  size_bytes: number;
  content_preview?: string;
  is_simulated: boolean;
  created_at: string;
}

interface QualityCheckResult {
  id: string;
  run_id: string;
  check_name: string;
  status: string;
  details: Record<string, any>;
  executed_at: string;
  is_simulated: boolean;
}

interface Project {
  id: string;
  name: string;
  key: string;
  goal?: string;
  status: string;
  workspace_path: string;
  active_sprint_name?: string;
  github_repo_url?: string;
  github_repo_name?: string;
  github_repo_mode?: string;
  github_branch?: string;
}

interface Agent {
  id: string;
  name: string;
  title: string;
  llm_profile_id?: string | null;
  llm_profile_name?: string | null;
  llm_model?: string | null;
}

interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  status: "planning" | "active" | "completed";
  capacity_points: number;
  start_date?: string;
  end_date?: string;
  created_at: string;
  items_count?: number;
}

function getCleanModelBadge(modelName?: string | null): string {
  if (!modelName) return "";
  const cleaned = modelName.includes("/") ? modelName.split("/")[1] : modelName;
  return cleaned.replace("-preview", "").replace("-latest", "");
}

const COLUMNS = [
  { id: "backlog", label: "Backlog", description: "Unrefined or awaiting criteria" },
  { id: "ready", label: "Ready", description: "Criteria verified, ready for sprint" },
  { id: "in_progress", label: "In Progress", description: "Active execution in workspace" },
  { id: "in_review", label: "In Review", description: "Quality gates & human review" },
  { id: "done", label: "Done", description: "Verified & audited delivery" },
];

export default function ScrumBoardPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ sprint?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const projectId = resolvedParams.id;
  const initialSprintParam = resolvedSearchParams?.sprint;

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintFilter, setSelectedSprintFilter] = useState<string>(initialSprintParam || "active");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Drag and Drop state
  const [draggedItemId, setDraggedItemId] = useState<string | null>(null);
  const [dragOverColId, setDragOverColId] = useState<string | null>(null);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("task");
  const [newPriority, setNewPriority] = useState<PriorityLevel>("medium");
  const [newPoints, setNewPoints] = useState(2.0);
  const [newCriteria, setNewCriteria] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");
  const [newSprintId, setNewSprintId] = useState("");

  // Inspect Modal
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  // Edit Task State
  const [isEditingItem, setIsEditingItem] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState("task");
  const [editPriority, setEditPriority] = useState<PriorityLevel>("medium");
  const [editPoints, setEditPoints] = useState(1.0);
  const [editAssigneeId, setEditAssigneeId] = useState("");
  const [editSprintId, setEditSprintId] = useState("");
  const [editCriteria, setEditCriteria] = useState<string[]>([]);
  const [editDod, setEditDod] = useState<string[]>([]);
  const [newCriterionDraft, setNewCriterionDraft] = useState("");
  const [newDodDraft, setNewDodDraft] = useState("");
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // In-Progress Strategy Modal
  const [showInProgressStrategyModal, setShowInProgressStrategyModal] = useState(false);

  // Sprint Capacity & Team Allocation State
  const [sprintCapacity, setSprintCapacity] = useState<SprintCapacity | null>(null);

  // Smart Scheduler Recommendation State
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [assigningAgentId, setAssigningAgentId] = useState<string | null>(null);
  const [showRecsSection, setShowRecsSection] = useState(false);

  // Sprint Completion & Rollover Management State
  const [isCompleteSprintModalOpen, setIsCompleteSprintModalOpen] = useState(false);
  const [isNewSprintModalOpen, setIsNewSprintModalOpen] = useState(false);
  const [nextSprintName, setNextSprintName] = useState("Sprint 2: Multi-Agent Collaboration");
  const [nextSprintGoal, setNextSprintGoal] = useState("Peningkatan kapabilitas platform & delivery fitur");
  const [nextSprintCapacity, setNextSprintCapacity] = useState(25);
  const [shouldRollover, setShouldRollover] = useState(true);
  const [sprintSubmitting, setSprintSubmitting] = useState(false);

  // Execution Run State
  const [activeRun, setActiveRun] = useState<ExecutionRun | null>(null);
  const [runLogs, setRunLogs] = useState<RunLog[]>([]);
  const [runArtifacts, setRunArtifacts] = useState<RunArtifact[]>([]);
  const [runQualityChecks, setRunQualityChecks] = useState<QualityCheckResult[]>([]);
  const [runLoading, setRunLoading] = useState(false);
  const [triggeringRunId, setTriggeringRunId] = useState<string | null>(null);
  const [activeArtifactTab, setActiveArtifactTab] = useState<string>("patch.diff");
  const [activeRunTab, setActiveRunTab] = useState<"logs" | "quality" | "artifacts">("logs");

  // Subtasks & Development Panel State
  const [isAddingSubtask, setIsAddingSubtask] = useState(false);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState("");
  const [newSubtaskPoints, setNewSubtaskPoints] = useState(1.0);
  const [newSubtaskAssigneeId, setNewSubtaskAssigneeId] = useState("");
  const [subtaskSubmitting, setSubtaskSubmitting] = useState(false);
  const [subtaskError, setSubtaskError] = useState<string | null>(null);
  const [copiedBranch, setCopiedBranch] = useState(false);

  const fetchBoardData = useCallback(async (filterOverride?: string) => {
    try {
      setLoading(true);
      setError(null);
      const targetFilter = filterOverride !== undefined ? filterOverride : selectedSprintFilter;
      const sprintCapParam = targetFilter !== "active" && targetFilter !== "all" ? `?sprint_id=${targetFilter}` : "";

      const [projRes, itemsRes, agentsRes, capRes, sprintsRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/work-items`),
        fetch(`http://127.0.0.1:8000/api/v1/workforce/agents`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprint-capacity${sprintCapParam}`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprints`),
      ]);

      if (!projRes.ok || !itemsRes.ok) {
        throw new Error("Failed to load project board data.");
      }

      const projData = await projRes.json();
      const itemsData = await itemsRes.json();
      const agentsData = agentsRes.ok ? await agentsRes.json() : [];
      const capData = capRes.ok ? await capRes.json() : null;
      const sprintsData = sprintsRes.ok ? await sprintsRes.json() : [];

      setProject(projData);
      setItems(itemsData);
      setAgents(agentsData);
      setSprintCapacity(capData);
      setSprints(sprintsData);
      if (agentsData.length > 0) setNewAssigneeId(agentsData[0].id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSprintFilter]);

  useEffect(() => {
    if (initialSprintParam && initialSprintParam !== selectedSprintFilter) {
      setSelectedSprintFilter(initialSprintParam);
      fetchBoardData(initialSprintParam);
    }
  }, [initialSprintParam]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

  const startEditing = () => {
    if (!selectedItem) return;
    setEditTitle(selectedItem.title);
    setEditDesc(selectedItem.description || "");
    setEditType(selectedItem.type || "task");
    setEditPriority((selectedItem.priority as PriorityLevel) || "medium");
    setEditPoints(selectedItem.estimate_points || 1.0);
    setEditAssigneeId(selectedItem.assignee_agent_id || "");
    setEditSprintId(selectedItem.sprint_id || "");
    setEditCriteria(selectedItem.acceptance_criteria ? [...selectedItem.acceptance_criteria] : []);
    setEditDod(selectedItem.definition_of_done ? [...selectedItem.definition_of_done] : []);
    setNewCriterionDraft("");
    setNewDodDraft("");
    setEditError(null);
    setIsEditingItem(true);
  };

  const cancelEditing = () => {
    setIsEditingItem(false);
    setEditError(null);
    setShowInProgressStrategyModal(false);
  };

  const handleSaveItemEdit = async (strategy?: "preserve" | "reset") => {
    if (!selectedItem) return;
    if (!editTitle.trim()) {
      setEditError("Judul task tidak boleh kosong.");
      return;
    }

    // Merge any pending drafts in inputs into criteria/DoD
    const mergedCriteria = [...editCriteria];
    if (newCriterionDraft.trim() && !mergedCriteria.includes(newCriterionDraft.trim())) {
      mergedCriteria.push(newCriterionDraft.trim());
    }
    const cleanCriteria = mergedCriteria.filter((c) => c.trim().length > 0);

    const mergedDod = [...editDod];
    if (newDodDraft.trim() && !mergedDod.includes(newDodDraft.trim())) {
      mergedDod.push(newDodDraft.trim());
    }
    const cleanDod = mergedDod.filter((d) => d.trim().length > 0);

    // If item is in_progress and no strategy chosen yet, prompt confirmation dialog
    if (selectedItem.status === "in_progress" && !strategy) {
      setShowInProgressStrategyModal(true);
      return;
    }

    try {
      setEditSubmitting(true);
      setEditError(null);

      const parsedPoints = Number(editPoints);
      const safePoints = isNaN(parsedPoints) || parsedPoints < 0 ? 1.0 : parsedPoints;

      const payload = {
        title: editTitle.trim(),
        description: editDesc.trim() || undefined,
        type: editType,
        priority: editPriority,
        estimate_points: safePoints,
        assignee_agent_id: editAssigneeId && editAssigneeId.trim() ? editAssigneeId.trim() : undefined,
        sprint_id: editSprintId === "none" ? undefined : (editSprintId || undefined),
        acceptance_criteria: cleanCriteria,
        definition_of_done: cleanDod,
      };

      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${selectedItem.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMsg = "Gagal menyimpan perubahan task.";
        try {
          const errJson = await res.json();
          if (typeof errJson.detail === "string") {
            errorMsg = errJson.detail;
          } else if (Array.isArray(errJson.detail)) {
            errorMsg = errJson.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
          } else if (errJson.message) {
            errorMsg = errJson.message;
          }
        } catch {}
        throw new Error(errorMsg);
      }

      const updatedItem = await res.json();
      setSelectedItem(updatedItem);
      setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      setIsEditingItem(false);
      setShowInProgressStrategyModal(false);
      setNewCriterionDraft("");
      setNewDodDraft("");

      if (strategy === "reset") {
        await handleTriggerRun(updatedItem.id);
      } else {
        await fetchBoardData();
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal menyimpan perubahan.";
      setEditError(msg);
      setShowInProgressStrategyModal(false);
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleTransition = async (itemId: string, targetStatus: string, extraPayload: Record<string, any> = {}) => {
    try {
      setTransitionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus, ...extraPayload }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        const msg = errJson.detail || `Failed to transition item to ${targetStatus}`;
        if (typeof msg === "string" && msg.toLowerCase().includes("acceptance criterion")) {
          const target = items.find((i) => i.id === itemId);
          if (target) setSelectedItem(target);
        }
        throw new Error(msg);
      }

      const updatedItem = await res.json();
      setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      if (selectedItem?.id === updatedItem.id) {
        setSelectedItem(updatedItem);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransitionError(err.message);
      } else {
        setTransitionError("State transition rejected by server.");
      }
    }
  };

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItemId(itemId);
    e.dataTransfer.setData("text/plain", itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverColId(null);
  };

  const handleDragOver = (e: React.DragEvent, colId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColId !== colId) {
      setDragOverColId(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: string) => {
    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
    if (dragOverColId === colId) {
      setDragOverColId(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: string) => {
    e.preventDefault();
    const itemId = e.dataTransfer.getData("text/plain") || draggedItemId;
    setDraggedItemId(null);
    setDragOverColId(null);

    if (!itemId) return;
    const item = items.find((i) => i.id === itemId);
    if (!item || item.status === targetStatus) return;

    await handleTransition(itemId, targetStatus);
  };

  const fetchRecommendations = async (itemId: string) => {
    try {
      setLoadingRecs(true);
      setTransitionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${itemId}/recommend-assignees`);
      if (!res.ok) {
        throw new Error("Failed to load agent recommendations");
      }
      const data: AgentRecommendation[] = await res.json();
      setRecommendations(data);
      setShowRecsSection(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransitionError(err.message);
      }
    } finally {
      setLoadingRecs(false);
    }
  };

  const handleAssignAgent = async (itemId: string, agentId: string, rationale?: string) => {
    try {
      setAssigningAgentId(agentId);
      setTransitionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${itemId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_id: agentId,
          actor: "Agency Operator",
          rationale: rationale || "Assigned via Smart Recommendation",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to assign agent");
      }

      const updatedItem: WorkItem = await res.json();
      setItems((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
      if (selectedItem?.id === updatedItem.id) {
        setSelectedItem(updatedItem);
      }
      setShowRecsSection(false);
      await fetchBoardData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransitionError(err.message);
      }
    } finally {
      setAssigningAgentId(null);
    }
  };

  const handleUpdateSprintStatus = async (sprintId: string, status: string) => {
    try {
      setTransitionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprints/${sprintId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to update sprint status");
      }

      await fetchBoardData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransitionError(err.message);
      }
    }
  };

  const handleCopyBranch = (branchName: string) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(branchName);
      setCopiedBranch(true);
      setTimeout(() => setCopiedBranch(false), 2000);
    }
  };

  const handleCreateSubtask = async (parentId: string) => {
    if (!newSubtaskTitle.trim()) {
      setSubtaskError("Judul subtask wajib diisi.");
      return;
    }
    try {
      setSubtaskSubmitting(true);
      setSubtaskError(null);
      const parsedPoints = Number(newSubtaskPoints);
      const safePoints = isNaN(parsedPoints) || parsedPoints < 0 ? 1.0 : parsedPoints;

      const payload = {
        title: newSubtaskTitle.trim(),
        estimate_points: safePoints,
        assignee_agent_id: newSubtaskAssigneeId && newSubtaskAssigneeId.trim() ? newSubtaskAssigneeId.trim() : undefined,
      };

      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${parentId}/subtasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let msg = "Gagal membuat subtask.";
        try {
          const err = await res.json();
          msg = err.detail || msg;
        } catch {}
        throw new Error(msg);
      }

      await fetchBoardData();
      const updatedParentRes = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${parentId}`);
      if (updatedParentRes.ok) {
        const updatedParent = await updatedParentRes.json();
        setSelectedItem(updatedParent);
      }
      setNewSubtaskTitle("");
      setNewSubtaskPoints(1.0);
      setIsAddingSubtask(false);
    } catch (err: unknown) {
      setSubtaskError(err instanceof Error ? err.message : "Gagal membuat subtask");
    } finally {
      setSubtaskSubmitting(false);
    }
  };

  const handleSubtaskStatusChange = async (subtaskId: string, targetStatus: string) => {
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${subtaskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });
      if (res.ok) {
        await fetchBoardData();
        if (selectedItem) {
          const itemRes = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${selectedItem.id}`);
          if (itemRes.ok) {
            const updated = await itemRes.json();
            setSelectedItem(updated);
          }
        }
      }
    } catch (err) {
      console.error("Gagal mengubah status subtask", err);
    }
  };

  const handleCompleteSprintOnly = async () => {
    if (!sprintCapacity?.sprint_id) return;
    try {
      setSprintSubmitting(true);
      setTransitionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprints/${sprintCapacity.sprint_id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Gagal menyelesaikan sprint");
      }

      setIsCompleteSprintModalOpen(false);
      await fetchBoardData();
    } catch (err: unknown) {
      if (err instanceof Error) setTransitionError(err.message);
    } finally {
      setSprintSubmitting(false);
    }
  };

  const handleCompleteAndStartNewSprint = async () => {
    try {
      setSprintSubmitting(true);
      setTransitionError(null);
      const payload = {
        name: nextSprintName.trim() || "Sprint Baru",
        goal: nextSprintGoal.trim() || undefined,
        capacity_points: Number(nextSprintCapacity) || 20,
        status: "active",
        rollover_unfinished_from_sprint_id: shouldRollover && sprintCapacity?.sprint_id ? sprintCapacity.sprint_id : undefined,
      };

      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Gagal membuat sprint baru");
      }

      setIsCompleteSprintModalOpen(false);
      setIsNewSprintModalOpen(false);
      await fetchBoardData();
    } catch (err: unknown) {
      if (err instanceof Error) setTransitionError(err.message);
    } finally {
      setSprintSubmitting(false);
    }
  };

  const handleTriggerRun = async (workItemId: string) => {
    try {
      setTriggeringRunId(workItemId);
      setTransitionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/work-items/${workItemId}/runs`, {
        method: "POST",
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to trigger execution run");
      }

      const runData: ExecutionRun = await res.json();
      setActiveRun(runData);

      // Fetch logs, artifacts, and quality checks in parallel
      const [logsRes, artifactsRes, qcRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/runs/${runData.id}/logs`),
        fetch(`http://127.0.0.1:8000/api/v1/runs/${runData.id}/artifacts`),
        fetch(`http://127.0.0.1:8000/api/v1/runs/${runData.id}/quality-checks`),
      ]);

      if (logsRes.ok) setRunLogs(await logsRes.json());
      if (artifactsRes.ok) {
        const arts = await artifactsRes.json();
        setRunArtifacts(arts);
        if (arts.length > 0) setActiveArtifactTab(arts[0].name);
      }
      if (qcRes.ok) setRunQualityChecks(await qcRes.json());

      // Refresh board items so status updates
      await fetchBoardData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransitionError(err.message);
      } else {
        setTransitionError("Execution run failed.");
      }
    } finally {
      setTriggeringRunId(null);
    }
  };

  const handleOpenLatestRun = async (workItemId: string) => {
    try {
      setRunLoading(true);
      setTransitionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${workItemId}/runs`);
      if (!res.ok) throw new Error("Failed to load runs");
      const runs: ExecutionRun[] = await res.json();
      
      if (runs.length === 0) {
        const item = items.find((i) => i.id === workItemId);
        setActiveRun({
          id: `manual-${workItemId}`,
          project_id: projectId,
          work_item_id: workItemId,
          status: "succeeded",
          workspace_path: `workspaces/${projectId}/runs/direct-delivery`,
          is_simulated: true,
          adapter_name: "Operator Sign-Off",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        });
        setRunLogs([
          {
            id: 1,
            run_id: `manual-${workItemId}`,
            timestamp: new Date().toISOString(),
            stage: "review",
            level: "INFO",
            message: `[SIMULATED] Item ${item?.key || workItemId} was delivered and moved to Done under supervisor review.`,
            is_simulated: true,
          },
          {
            id: 2,
            run_id: `manual-${workItemId}`,
            timestamp: new Date().toISOString(),
            stage: "succeeded",
            level: "INFO",
            message: "[SIMULATED] All acceptance criteria satisfied. Zero defect escapes detected.",
            is_simulated: true,
          }
        ]);
        setRunArtifacts([
          {
            id: "art-summary",
            run_id: `manual-${workItemId}`,
            name: "delivery_summary.md",
            artifact_type: "summary",
            file_path: `workspaces/${projectId}/delivery_summary.md`,
            size_bytes: 380,
            content_preview: `# [SIMULATED] Work Item Delivery Record\n\n**Item**: ${item?.key || "Work Item"} - ${item?.title || ""}\n**Status**: Done (Operator Verified)\n\nThis work item was completed under direct human supervisor sign-off.\nAll Definition of Done checkpoints verified.`,
            is_simulated: true,
            created_at: new Date().toISOString(),
          }
        ]);
        setRunQualityChecks([
          {
            id: "qc-manual-1",
            run_id: `manual-${workItemId.slice(0, 8)}`,
            check_name: "SUPERVISOR_SIGN_OFF",
            status: "passed",
            details: {
              verifier: "Agency Operator",
              status: "Approved",
              evidence: "Manual review completed"
            },
            executed_at: new Date().toISOString(),
            is_simulated: true,
          }
        ]);
        setActiveArtifactTab("delivery_summary.md");
        setActiveRunTab("artifacts");
        return;
      }

      const latestRun = runs[0];
      setActiveRun(latestRun);

      const [logsRes, artifactsRes, qcRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/runs/${latestRun.id}/logs`),
        fetch(`http://127.0.0.1:8000/api/v1/runs/${latestRun.id}/artifacts`),
        fetch(`http://127.0.0.1:8000/api/v1/runs/${latestRun.id}/quality-checks`),
      ]);

      if (logsRes.ok) setRunLogs(await logsRes.json());
      if (artifactsRes.ok) {
        const arts = await artifactsRes.json();
        setRunArtifacts(arts);
        if (arts.length > 0) setActiveArtifactTab(arts[0].name);
      }
      if (qcRes.ok) setRunQualityChecks(await qcRes.json());
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransitionError(err.message);
      }
    } finally {
      setRunLoading(false);
    }
  };

  // Active sprint helper
  const activeSprint = sprints.find((s) => s.status === "active");

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setCreateError("Judul task wajib diisi.");
      return;
    }

    try {
      setCreateSubmitting(true);
      setCreateError(null);
      setTransitionError(null);
      const criteriaList = newCriteria
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const parsedPoints = Number(newPoints);
      const safePoints = isNaN(parsedPoints) || parsedPoints < 0 ? 1.0 : parsedPoints;
      
      let resolvedSprintId: string | undefined = undefined;
      if (newSprintId === "none") {
        resolvedSprintId = undefined;
      } else if (newSprintId) {
        resolvedSprintId = newSprintId;
      } else if (activeSprint?.id) {
        resolvedSprintId = activeSprint.id;
      }

      const payload = {
        project_id: projectId,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        type: newType,
        priority: newPriority,
        estimate_points: safePoints,
        acceptance_criteria: criteriaList,
        definition_of_done: ["Code merged", "Passing tests", "Audit review recorded"],
        assignee_agent_id: newAssigneeId && newAssigneeId.trim() ? newAssigneeId.trim() : undefined,
        sprint_id: resolvedSprintId,
      };

      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/work-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        let errorMsg = "Gagal membuat task baru.";
        try {
          const errJson = await res.json();
          if (typeof errJson.detail === "string") {
            errorMsg = errJson.detail;
          } else if (Array.isArray(errJson.detail)) {
            errorMsg = errJson.detail.map((d: any) => d.msg || JSON.stringify(d)).join(", ");
          } else if (errJson.message) {
            errorMsg = errJson.message;
          }
        } catch {
          // ignore
        }
        throw new Error(errorMsg);
      }

      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewCriteria("");
      setCreateError(null);
      await fetchBoardData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal membuat task baru.";
      setCreateError(msg);
      setTransitionError(msg);
    } finally {
      setCreateSubmitting(false);
    }
  };
  const filteredBoardItems = items.filter((item) => {
    if (item.parent_id) return false;
    if (selectedSprintFilter === "all") return true;
    if (selectedSprintFilter === "active") {
      if (activeSprint) return item.sprint_id === activeSprint.id;
      return true;
    }
    return item.sprint_id === selectedSprintFilter;
  });

  return (
    <AppShell>
      <PageHeader
        title={`${project?.name || "Project"} — Scrum Board`}
        description={`Active Sprint: ${project?.active_sprint_name || "Sprint 1"} • Workspace: ${project?.workspace_path || ""}`}
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: project?.name || "Board" },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchBoardData()}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setCreateError(null);
                setNewSprintId(activeSprint?.id || "");
                setIsCreateModalOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Work Item
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs: Backlog Planning on Left, Kanban Board on Right */}
      <div className="flex items-center space-x-2 border-b border-borderBase-light dark:border-borderBase-dark pb-3">
        <Link
          href={`/projects/${projectId}/backlog`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors"
        >
          <ListTodo className="w-4 h-4" />
          <span>Backlog & Sprint Planning</span>
        </Link>
        <Link
          href={`/projects/${projectId}/board`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent/10 text-accent border border-accent/20 transition-colors"
        >
          <Kanban className="w-4 h-4" />
          <span>Papan Scrum (Board)</span>
        </Link>
        <Link
          href={`/projects/${projectId}/analytics`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analitik & Laporan Sprint</span>
        </Link>
      </div>

      {/* Planning Phase Informational Banner */}
      {project?.status === "planning" && (
        <div className="p-3.5 rounded-md bg-accent/5 border border-accent/25 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2.5 text-accent">
            <Layers className="w-4 h-4 flex-shrink-0" />
            <div>
              <span className="font-semibold block">Planning Phase Active — Sprint 0 Backlog Refinement</span>
              <span className="text-textMuted-light dark:text-textMuted-dark">
                This project is currently in the planning phase. Stories start in the Backlog and must define testable acceptance criteria to qualify for Ready prior to sprint kickoff.
              </span>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-accent/15 text-accent border border-accent/30">
            Sprint 0 Spec
          </span>
        </div>
      )}

      {/* State Machine Guard Error Banner */}
      {transitionError && (
        <div className="p-3 rounded-md bg-status-danger/10 border border-status-danger/30 flex items-start justify-between text-xs text-status-danger">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">State Machine Transition Denied</span>
              <span>{transitionError}</span>
            </div>
          </div>
          <button
            onClick={() => setTransitionError(null)}
            className="p-1 hover:bg-status-danger/20 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sprint Capacity & Multi-Agent Allocation Bar */}
      {sprintCapacity && (
        <div className="p-3.5 rounded-md bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center space-x-2">
              <BarChart2 className="w-4 h-4 text-accent" />
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-textMuted-light dark:text-textMuted-dark font-medium">Sprint:</span>
                <select
                  value={selectedSprintFilter}
                  onChange={(e) => {
                    const newFilter = e.target.value;
                    setSelectedSprintFilter(newFilter);
                    fetchBoardData(newFilter);
                  }}
                  className="h-7 px-2 text-xs font-semibold bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                >
                  <option value="active">
                    Active Sprint {activeSprint ? `(${activeSprint.name})` : "(Belum ada)"}
                  </option>
                  {sprints.filter((s) => s.status === "completed").length > 0 && (
                    <optgroup label="Riwayat Sprint Selesai">
                      {sprints
                        .filter((s) => s.status === "completed")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Selesai)
                          </option>
                        ))}
                    </optgroup>
                  )}
                  {sprints.filter((s) => s.status === "planning").length > 0 && (
                    <optgroup label="Sprint Perencanaan">
                      {sprints
                        .filter((s) => s.status === "planning")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} (Planning)
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <option value="all">Semua Work Items</option>
                </select>
              </div>
              <StatusBadge
                variant={sprintCapacity.sprint_status === "completed" ? "neutral" : "success"}
                label={sprintCapacity.sprint_status === "completed" ? "Completed" : "Active Sprint"}
              />
            </div>

            <div className="flex items-center space-x-3 text-xs">
              <div className="flex items-center space-x-1.5 font-mono">
                <span className="text-textMuted-light dark:text-textMuted-dark">Beban Sprint:</span>
                <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                  {sprintCapacity.allocated_points} / {sprintCapacity.total_capacity_points} SP
                </span>
                <span className="text-textMuted-light dark:text-textMuted-dark text-[11px]">
                  ({sprintCapacity.utilization_rate}%)
                </span>
              </div>
              <div className="flex items-center space-x-1 font-mono text-status-success">
                <span>• Selesai:</span>
                <span className="font-semibold">{sprintCapacity.completed_points} SP</span>
              </div>
              {sprintCapacity.sprint_id && sprintCapacity.sprint_status === "active" ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setIsCompleteSprintModalOpen(true)}
                  leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                >
                  Selesaikan Sprint
                </Button>
              ) : sprintCapacity.sprint_status === "completed" ? (
                <div className="flex items-center space-x-1 px-2 py-1 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark text-[11px] font-mono">
                  <CheckCircle2 className="w-3 h-3 text-status-success" />
                  <span>Arsip Sprint</span>
                </div>
              ) : (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setIsNewSprintModalOpen(true)}
                  leftIcon={<Play className="w-3.5 h-3.5" />}
                >
                  Mulai Sprint Baru
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 rounded-full bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark overflow-hidden">
            <div
              className={`h-full transition-all duration-300 rounded-full ${
                sprintCapacity.utilization_rate > 100
                  ? "bg-status-danger"
                  : sprintCapacity.utilization_rate > 80
                  ? "bg-status-warning"
                  : "bg-status-success"
              }`}
              style={{ width: `${Math.min(100, sprintCapacity.utilization_rate)}%` }}
            />
          </div>

          {/* Active Agents Allocation Chips */}
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-borderBase-light/60 dark:border-borderBase-dark/60 text-xs">
            <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark flex items-center space-x-1">
              <Users className="w-3.5 h-3.5" />
              <span>Alokasi Agen ({sprintCapacity.agent_allocations.length}):</span>
            </span>
            {sprintCapacity.agent_allocations.length === 0 ? (
              <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark italic">
                Belum ada agen yang ditugaskan ke work item pada sprint ini.
              </span>
            ) : (
              sprintCapacity.agent_allocations.map((alloc) => (
                <div
                  key={alloc.agent_id}
                  className="flex items-center space-x-1.5 px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-[11px]"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                  <span className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    {alloc.name}
                  </span>
                  <span className="text-textMuted-light dark:text-textMuted-dark text-[10px]">
                    ({alloc.role_name})
                  </span>
                  <span className="font-mono font-semibold text-accent text-[10px]">
                    {alloc.assigned_points} SP
                  </span>
                  <span className="text-[9px] px-1 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light/40 dark:border-borderBase-dark/40 text-textMuted-light dark:text-textMuted-dark font-mono">
                    {alloc.current_concurrency}/{alloc.max_concurrency} slot
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Notice when viewing an archive / completed sprint */}
      {sprintCapacity?.sprint_status === "completed" && (
        <div className="p-3 rounded-md bg-accent/5 border border-accent/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
          <div className="flex items-center space-x-2 text-textPrimary-light dark:text-textPrimary-dark">
            <CheckCircle2 className="w-4 h-4 text-status-success flex-shrink-0" />
            <span>
              Anda sedang melihat rekaman arsip dari <strong>{sprintCapacity.sprint_name}</strong> yang telah tuntas.
            </span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            onClick={() => {
              setSelectedSprintFilter("active");
              fetchBoardData("active");
            }}
          >
            Beralih ke Active Sprint
          </Button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchBoardData} />
      ) : (
        /* Kanban Columns Grid */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 min-h-[550px] items-start">
          {COLUMNS.map((col) => {
            const colItems = filteredBoardItems.filter((item) => item.status === col.id);
            const isOver = dragOverColId === col.id;

            return (
              <div
                key={col.id}
                onDragOver={(e) => handleDragOver(e, col.id)}
                onDragLeave={(e) => handleDragLeave(e, col.id)}
                onDrop={(e) => handleDrop(e, col.id)}
                className={`flex flex-col bg-surfaceSecondary-light/60 dark:bg-surfaceSecondary-dark/60 rounded-md border min-h-[480px] overflow-hidden transition-all duration-150 ${
                  isOver
                    ? "border-accent ring-2 ring-accent/30 bg-accent/5 dark:bg-accent/10"
                    : "border-borderBase-light dark:border-borderBase-dark"
                }`}
              >
                {/* Column Header */}
                <div className="p-2.5 border-b border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark flex items-center justify-between">
                  <div className="flex items-center space-x-1.5">
                    <span className="font-semibold text-xs text-textPrimary-light dark:text-textPrimary-dark">
                      {col.label}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark">
                      {colItems.length}
                    </span>
                  </div>
                </div>

                {/* Cards Container */}
                <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                  {colItems.length === 0 ? (
                    <div
                      className={`h-28 border border-dashed rounded flex items-center justify-center text-[11px] transition-colors ${
                        isOver
                          ? "border-accent text-accent bg-accent/5"
                          : "border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark"
                      }`}
                    >
                      {isOver ? "Drop to move here" : "No items"}
                    </div>
                  ) : (
                    colItems.map((item) => (
                      <div
                        key={item.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, item.id)}
                        onDragEnd={handleDragEnd}
                        onClick={() => setSelectedItem(item)}
                        className={`p-3 rounded-lg bg-surface-light dark:bg-surface-dark border space-y-2.5 shadow-xs transition-all cursor-grab active:cursor-grabbing hover:border-accent/50 hover:shadow-sm ${
                          draggedItemId === item.id
                            ? "opacity-40 scale-[0.98] border-dashed border-accent"
                            : "border-borderBase-light dark:border-borderBase-dark"
                        }`}
                      >
                        {/* Card Header: Key, Subtasks count & Priority */}
                        <div className="flex items-center justify-between text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <GripVertical className="w-3.5 h-3.5 text-textMuted-light/40 dark:text-textMuted-dark/40 shrink-0 cursor-grab" />
                            <span className="font-mono font-semibold text-accent">{item.key}</span>
                            {item.subtasks && item.subtasks.length > 0 && (
                              <span
                                className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark"
                                title={`${item.subtasks.filter((s) => s.status === "done").length}/${item.subtasks.length} Subtask Selesai`}
                              >
                                <Layers className="w-2.5 h-2.5 text-accent" />
                                <span>{item.subtasks.filter((s) => s.status === "done").length}/{item.subtasks.length}</span>
                              </span>
                            )}
                          </div>
                          <PriorityIndicator level={item.priority as PriorityLevel} showLabel={false} />
                        </div>

                        {/* Title */}
                        <h4 className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark line-clamp-2 leading-snug">
                          {item.title}
                        </h4>

                        {/* Branch badge if exists */}
                        {item.git_branch && (
                          <div className="flex items-center gap-1 text-[10px] font-mono text-textMuted-light dark:text-textMuted-dark truncate" title={`Git Branch: ${item.git_branch}`}>
                            <GitBranch className="w-2.5 h-2.5 text-accent shrink-0" />
                            <span className="truncate">{item.git_branch}</span>
                          </div>
                        )}

                        {/* Bottom Row: Assigned Agent (Mandatory) */}
                        <div className="flex items-center justify-between text-xs pt-2 border-t border-borderBase-light/60 dark:border-borderBase-dark/60 gap-2 min-w-0">
                          <div className="flex items-center gap-1.5 min-w-0" title={item.assignee_name || "Belum ditugaskan"}>
                            <User className="w-3.5 h-3.5 text-accent shrink-0" />
                            <span className="font-medium text-xs text-textPrimary-light dark:text-textPrimary-dark truncate">
                              {item.assignee_name || (
                                <span className="text-textMuted-light dark:text-textMuted-dark italic font-normal text-[11px]">
                                  Belum ditugaskan
                                </span>
                              )}
                            </span>
                          </div>
                          {(col.id === "ready" || col.id === "in_progress") && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleTriggerRun(item.id);
                              }}
                              disabled={triggeringRunId === item.id}
                              title={triggeringRunId === item.id ? "Sedang menjalankan agen..." : "Jalankan Agen"}
                              className="p-1 rounded text-accent hover:bg-accent/10 active:bg-accent/20 transition-colors shrink-0 disabled:opacity-50"
                            >
                              <Sparkles className={`w-3.5 h-3.5 ${triggeringRunId === item.id ? "animate-spin" : ""}`} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Inspect Item Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-2xl w-full p-5 sm:p-6 space-y-4 shadow-2xl max-h-[92vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark gap-3">
              <div className="space-y-1.5 min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                    {selectedItem.key}
                  </span>
                  <StatusBadge variant="info" label={selectedItem.status.toUpperCase()} />
                  <PriorityIndicator level={selectedItem.priority as PriorityLevel} />
                  {isEditingItem && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                      Mode Pengeditan
                    </span>
                  )}
                </div>
                {!isEditingItem ? (
                  <h3 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark leading-snug">
                    {selectedItem.title}
                  </h3>
                ) : (
                  <div className="pt-1">
                    <label className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block mb-1">
                      Judul Task *
                    </label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      placeholder="Judul task..."
                      className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {!isEditingItem ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={startEditing}
                    leftIcon={<Edit2 className="w-3.5 h-3.5 text-accent" />}
                  >
                    Edit Task
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={cancelEditing}
                  >
                    Batal
                  </Button>
                )}
                <button
                  onClick={() => {
                    setSelectedItem(null);
                    setIsEditingItem(false);
                  }}
                  className="p-1.5 rounded-md text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            {isEditingItem ? (
              /* --- EDIT MODE BODY --- */
              <div className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1">
                {editError && (
                  <div className="p-2.5 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-2 animate-in fade-in">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{editError}</span>
                  </div>
                )}

                {/* Classification & Metadata Card */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-3">
                  <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block">
                    Klasifikasi & Penugasan
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <div>
                      <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                        Tipe
                      </label>
                      <select
                        value={editType}
                        onChange={(e) => setEditType(e.target.value)}
                        className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="task">Task</option>
                        <option value="story">Story</option>
                        <option value="bug">Bug</option>
                        <option value="epic">Epic</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                        Prioritas
                      </label>
                      <select
                        value={editPriority}
                        onChange={(e) => setEditPriority(e.target.value as PriorityLevel)}
                        className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="critical">Critical</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                        Story Points
                      </label>
                      <input
                        type="number"
                        step="0.5"
                        min="0"
                        value={isNaN(editPoints) ? "" : editPoints}
                        onChange={(e) => setEditPoints(e.target.value === "" ? 1.0 : parseFloat(e.target.value))}
                        className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                    <div>
                      <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                        Target Sprint
                      </label>
                      <select
                        value={editSprintId}
                        onChange={(e) => setEditSprintId(e.target.value)}
                        className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        {activeSprint && (
                          <option value={activeSprint.id}>
                            {activeSprint.name} (Active Sprint)
                          </option>
                        )}
                        {sprints
                          .filter((s) => s.id !== activeSprint?.id)
                          .map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name} ({s.status})
                            </option>
                          ))}
                        <option value="none">Product Backlog (Tanpa Sprint)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                        Agen yang Ditugaskan
                      </label>
                      <select
                        value={editAssigneeId}
                        onChange={(e) => setEditAssigneeId(e.target.value)}
                        className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="">Belum Ditugaskan (Unassigned)</option>
                        {agents.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.title})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Description Card */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-2">
                  <label className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block">
                    Deskripsi Tugas
                  </label>
                  <textarea
                    rows={3}
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    placeholder="Konteks, instruksi pengerjaan, dan detail implementasi..."
                    className="w-full p-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-xs text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                {/* Acceptance Criteria Card */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider">
                      Acceptance Criteria ({editCriteria.length})
                    </span>
                    <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                      Wajib minimal 1 kriteria untuk status Ready
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {editCriteria.map((c, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={c}
                          onChange={(e) => {
                            const updated = [...editCriteria];
                            updated[idx] = e.target.value;
                            setEditCriteria(updated);
                          }}
                          className="flex-1 h-7.5 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button
                          type="button"
                          onClick={() => setEditCriteria(editCriteria.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded text-status-danger hover:bg-status-danger/10 transition-colors shrink-0"
                          title="Hapus kriteria ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-borderBase-light/40 dark:border-borderBase-dark/40">
                    <input
                      type="text"
                      placeholder="+ Ketik kriteria baru lalu tekan Enter untuk menambahkan..."
                      value={newCriterionDraft}
                      onChange={(e) => setNewCriterionDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newCriterionDraft.trim()) {
                          e.preventDefault();
                          setEditCriteria([...editCriteria, newCriterionDraft.trim()]);
                          setNewCriterionDraft("");
                        }
                      }}
                      onBlur={() => {
                        if (newCriterionDraft.trim()) {
                          setEditCriteria([...editCriteria, newCriterionDraft.trim()]);
                          setNewCriterionDraft("");
                        }
                      }}
                      className="w-full h-8 px-2.5 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-textMuted-light/60 dark:placeholder:text-textMuted-dark/60"
                    />
                  </div>
                </div>

                {/* Definition of Done Card */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-2.5">
                  <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block">
                    Definition of Done ({editDod.length})
                  </span>

                  <div className="space-y-1.5">
                    {editDod.map((d, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <input
                          type="text"
                          value={d}
                          onChange={(e) => {
                            const updated = [...editDod];
                            updated[idx] = e.target.value;
                            setEditDod(updated);
                          }}
                          className="flex-1 h-7.5 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                        />
                        <button
                          type="button"
                          onClick={() => setEditDod(editDod.filter((_, i) => i !== idx))}
                          className="p-1.5 rounded text-status-danger hover:bg-status-danger/10 transition-colors shrink-0"
                          title="Hapus DoD ini"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="pt-2 border-t border-borderBase-light/40 dark:border-borderBase-dark/40">
                    <input
                      type="text"
                      placeholder="+ Ketik item Definition of Done lalu tekan Enter..."
                      value={newDodDraft}
                      onChange={(e) => setNewDodDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && newDodDraft.trim()) {
                          e.preventDefault();
                          setEditDod([...editDod, newDodDraft.trim()]);
                          setNewDodDraft("");
                        }
                      }}
                      onBlur={() => {
                        if (newDodDraft.trim()) {
                          setEditDod([...editDod, newDodDraft.trim()]);
                          setNewDodDraft("");
                        }
                      }}
                      className="w-full h-8 px-2.5 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent placeholder:text-textMuted-light/60 dark:placeholder:text-textMuted-dark/60"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* --- VIEW MODE BODY --- */
              <div className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1">
                {/* Description Card */}
                {selectedItem.description && (
                  <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-1">
                    <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block">
                      Deskripsi Tugas
                    </span>
                    <p className="text-xs text-textPrimary-light dark:text-textPrimary-dark leading-relaxed whitespace-pre-wrap">
                      {selectedItem.description}
                    </p>
                  </div>
                )}

                {/* Acceptance Criteria Card */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider">
                      Acceptance Criteria (Tolok Ukur Pengujian)
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent/10 text-accent font-semibold">
                      {selectedItem.acceptance_criteria?.length || 0} Kriteria
                    </span>
                  </div>
                  {selectedItem.acceptance_criteria && selectedItem.acceptance_criteria.length > 0 ? (
                    <ul className="space-y-1.5">
                      {selectedItem.acceptance_criteria.map((c, i) => (
                        <li key={i} className="flex items-start gap-2 text-textPrimary-light dark:text-textPrimary-dark">
                          <Check className="w-3.5 h-3.5 text-status-success shrink-0 mt-0.5" />
                          <span className="leading-snug">{c}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-2.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[11px] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                        <span>Belum ada kriteria pengujian (wajib minimal 1 kriteria untuk pindah ke Ready).</span>
                      </div>
                      <button
                        type="button"
                        onClick={startEditing}
                        className="text-xs font-semibold underline hover:opacity-80 shrink-0"
                      >
                        Edit Task
                      </button>
                    </div>
                  )}
                </div>

                {/* Definition of Done Card */}
                {selectedItem.definition_of_done && selectedItem.definition_of_done.length > 0 && (
                  <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-2">
                    <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block">
                      Definition of Done
                    </span>
                    <ul className="space-y-1.5">
                      {selectedItem.definition_of_done.map((dod, i) => (
                        <li key={i} className="flex items-center gap-2 text-textMuted-light dark:text-textMuted-dark text-[11px]">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                          <span>{dod}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Assignee & Model & Estimate Card */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block mb-1">
                      Agen yang Ditugaskan
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-xs flex items-center gap-1.5 text-textPrimary-light dark:text-textPrimary-dark">
                        <User className="w-3.5 h-3.5 text-accent shrink-0" />
                        <span>{selectedItem.assignee_name || "Belum Ditugaskan"}</span>
                      </span>
                      {(() => {
                        const assigned = agents.find((a) => a.id === selectedItem.assignee_agent_id);
                        if (assigned?.llm_model) {
                          return (
                            <span
                              className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium"
                              title={`Model LLM: ${assigned.llm_model} (${assigned.llm_profile_name || 'Default Sistem'})`}
                            >
                              <Sparkles className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                              <span>{assigned.llm_model}</span>
                            </span>
                          );
                        }
                        return null;
                      })()}
                    </div>
                    {(() => {
                      const assigned = agents.find((a) => a.id === selectedItem.assignee_agent_id);
                      if (assigned?.llm_profile_name) {
                        return (
                          <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark block mt-1">
                            Provider: {assigned.llm_profile_name}
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block mb-1">
                      Estimasi Story Points
                    </span>
                    <span className="font-mono font-semibold text-xs text-textPrimary-light dark:text-textPrimary-dark">
                      {selectedItem.estimate_points} Points
                    </span>
                  </div>
                </div>

                {/* Smart Staffing Panel */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs flex items-center gap-1.5 text-accent">
                      <Zap className="w-3.5 h-3.5 shrink-0" />
                      <span>Smart Staffing & Rekomendasi</span>
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => fetchRecommendations(selectedItem.id)}
                      isLoading={loadingRecs}
                      leftIcon={<Sparkles className="w-3 h-3 text-accent" />}
                    >
                      {recommendations.length > 0 && showRecsSection ? "Segarkan" : "Cari Agen Terbaik"}
                    </Button>
                  </div>

                  {/* Recommendation Candidates List */}
                  {showRecsSection && (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {loadingRecs ? (
                        <div className="p-3 text-center text-textMuted-light dark:text-textMuted-dark text-[11px]">
                          Menganalisis kecocokan skill, peran & kapasitas agen...
                        </div>
                      ) : recommendations.length === 0 ? (
                        <div className="p-2 text-center text-textMuted-light dark:text-textMuted-dark text-[11px]">
                          Tidak ada agen aktif yang tersedia saat ini.
                        </div>
                      ) : (
                        recommendations.map((rec) => {
                          const isAssigned = selectedItem.assignee_agent_id === rec.agent_id;
                          return (
                            <div
                              key={rec.agent_id}
                              className={`p-3 rounded-lg border transition-all text-xs space-y-1.5 ${
                                rec.is_recommended
                                  ? "border-accent/50 bg-accent/5 dark:bg-accent/10"
                                  : "border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="w-2 h-2 rounded-full bg-accent shrink-0" />
                                  <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark truncate">
                                    {rec.name}
                                  </span>
                                  <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark truncate">
                                    ({rec.role_name})
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <span
                                    className={`px-1.5 py-0.2 rounded font-mono text-[10px] font-bold ${
                                      rec.match_score >= 80
                                        ? "bg-status-success/15 text-status-success border border-status-success/30"
                                        : "bg-status-info/15 text-status-info border border-status-info/30"
                                    }`}
                                  >
                                    {rec.match_score}% Cocok
                                  </span>
                                  {rec.is_recommended && (
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-accent text-white">
                                      Best Fit
                                    </span>
                                  )}
                                </div>
                              </div>

                              <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark leading-tight">
                                {rec.rationale}
                              </p>

                              {rec.matched_skills.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {rec.matched_skills.map((s, idx) => (
                                    <span
                                      key={idx}
                                      className="px-1.5 py-0.2 rounded text-[9px] bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-mono text-textPrimary-light dark:text-textPrimary-dark"
                                    >
                                      ✓ {s}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <div className="flex items-center justify-between pt-1.5 border-t border-borderBase-light/40 dark:border-borderBase-dark/40 text-[10px]">
                                <span className="text-textMuted-light dark:text-textMuted-dark font-mono">
                                  Slot Aktif: {rec.current_concurrency}/{rec.max_concurrency}
                                </span>
                                {isAssigned ? (
                                  <span className="font-semibold text-status-success flex items-center gap-1">
                                    <Check className="w-3 h-3" />
                                    <span>Sedang Ditugaskan</span>
                                  </span>
                                ) : (
                                  <Button
                                    size="sm"
                                    onClick={() => handleAssignAgent(selectedItem.id, rec.agent_id, rec.rationale)}
                                    isLoading={assigningAgentId === rec.agent_id}
                                    leftIcon={<User className="w-3 h-3" />}
                                  >
                                    Tugaskan Agen
                                  </Button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>

                {/* Development & Git Worktree Panel */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <GitBranch className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                        Development & Git Panel
                      </span>
                    </div>
                    {project?.github_repo_url && (
                      <a
                        href={project.github_repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-[11px] font-mono text-accent hover:underline"
                        title="Buka Repositori GitHub"
                      >
                        <Github className="w-3.5 h-3.5" />
                        <span>{project.github_repo_name || "GitHub Repo"}</span>
                        <ExternalLink className="w-3 h-3 ml-0.5" />
                      </a>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Branch Info */}
                    <div className="p-2.5 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider">
                          Working Branch
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyBranch(selectedItem.git_branch || `agencyos/${project?.key?.toLowerCase() || 'dev'}/${selectedItem.key.toLowerCase()}`)}
                          className="flex items-center gap-1 text-[10px] font-mono text-accent hover:underline cursor-pointer"
                          title="Salin nama branch"
                        >
                          <Copy className="w-2.5 h-2.5" />
                          <span>{copiedBranch ? "Disalin!" : "Salin"}</span>
                        </button>
                      </div>
                      <div className="font-mono text-[11px] text-textPrimary-light dark:text-textPrimary-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark px-2 py-1 rounded border border-borderBase-light/60 dark:border-borderBase-dark/60 truncate">
                        {selectedItem.git_branch || `agencyos/${project?.key?.toLowerCase() || 'dev'}/${selectedItem.key.toLowerCase()}`}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-textMuted-light dark:text-textMuted-dark">
                        <span className="w-1.5 h-1.5 rounded-full bg-status-success animate-pulse shrink-0" />
                        <span>Worktree branch terisolasi untuk agen</span>
                      </div>
                    </div>

                    {/* Pull Request & CI */}
                    <div className="p-2.5 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5">
                      <span className="text-[10px] font-bold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block">
                        Pull Request & Verification
                      </span>
                      {selectedItem.pull_request_url ? (
                        <div className="flex items-center justify-between">
                          <a
                            href={selectedItem.pull_request_url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 font-mono text-xs font-semibold text-accent hover:underline"
                          >
                            <GitPullRequest className="w-3.5 h-3.5" />
                            <span>PR #{selectedItem.pull_request_number || 1}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-status-success/10 text-status-success border border-status-success/20">
                            {selectedItem.pull_request_status || "Open"}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between text-[11px] text-textMuted-light dark:text-textMuted-dark">
                          <span className="flex items-center gap-1 font-mono">
                            <GitPullRequest className="w-3 h-3" />
                            <span>PR Belum Dibuka</span>
                          </span>
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark">
                            Draft
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between pt-1 border-t border-borderBase-light/60 dark:border-borderBase-dark/60 text-[10px] text-textMuted-light dark:text-textMuted-dark">
                        <span>CI Automated Gate:</span>
                        <span className="text-status-success font-semibold flex items-center gap-1 font-mono">
                          <ShieldCheck className="w-3 h-3" /> Passing
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Subtasks Management Panel */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                        Subtasks ({selectedItem.subtasks?.length || 0})
                      </span>
                    </div>
                    {!isAddingSubtask && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setIsAddingSubtask(true);
                          if (agents.length > 0 && !newSubtaskAssigneeId) {
                            setNewSubtaskAssigneeId(agents[0].id);
                          }
                        }}
                        leftIcon={<Plus className="w-3 h-3" />}
                      >
                        Tambah Subtask
                      </Button>
                    )}
                  </div>

                  {/* Subtask list */}
                  {selectedItem.subtasks && selectedItem.subtasks.length > 0 ? (
                    <div className="space-y-2">
                      {selectedItem.subtasks.map((st) => (
                        <div
                          key={st.id}
                          className="p-2.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-accent/10 text-accent font-semibold shrink-0">
                              {st.key}
                            </span>
                            <span className={`font-medium text-textPrimary-light dark:text-textPrimary-dark truncate ${st.status === 'done' ? 'line-through text-textMuted-light dark:text-textMuted-dark' : ''}`}>
                              {st.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {/* Assignee Badge */}
                            <span className="inline-flex items-center gap-1 text-[11px] text-textMuted-light dark:text-textMuted-dark px-1.5 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark">
                              <User className="w-2.5 h-2.5 text-accent" />
                              <span className="truncate max-w-[100px]">{st.assignee_name || "Unassigned"}</span>
                            </span>

                            {/* Points */}
                            <span className="text-[10px] font-mono text-textMuted-light dark:text-textMuted-dark">
                              {st.estimate_points} SP
                            </span>

                            {/* Status Selector */}
                            <select
                              value={st.status}
                              onChange={(e) => handleSubtaskStatusChange(st.id, e.target.value)}
                              className="text-[11px] font-mono px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
                            >
                              <option value="backlog">Backlog</option>
                              <option value="ready">Ready</option>
                              <option value="in_progress">In Progress</option>
                              <option value="done">Done</option>
                            </select>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    !isAddingSubtask && (
                      <div className="p-3 text-center rounded border border-dashed border-borderBase-light dark:border-borderBase-dark text-[11px] text-textMuted-light dark:text-textMuted-dark">
                        Belum ada subtask. Pecah story ini menjadi beberapa tugas spesifik untuk agen.
                      </div>
                    )
                  )}

                  {/* Add Subtask Inline Form */}
                  {isAddingSubtask && (
                    <div className="p-3 rounded-lg border border-accent/40 bg-accent/5 dark:bg-accent/10 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-accent flex items-center gap-1">
                          <Plus className="w-3 h-3" /> Tambah Subtask Baru
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingSubtask(false);
                            setSubtaskError(null);
                          }}
                          className="text-textMuted-light hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {subtaskError && (
                        <div className="p-2 rounded bg-status-danger/10 text-status-danger text-[11px]">
                          {subtaskError}
                        </div>
                      )}

                      <div className="space-y-2">
                        <input
                          type="text"
                          value={newSubtaskTitle}
                          onChange={(e) => setNewSubtaskTitle(e.target.value)}
                          placeholder="Judul subtask (contoh: Buat skema migrasi tabel, Tulis unit test)..."
                          className="w-full h-8 px-2.5 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              handleCreateSubtask(selectedItem.id);
                            }
                          }}
                        />

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          <div>
                            <label className="text-[10px] text-textMuted-light dark:text-textMuted-dark block mb-0.5">
                              Tugaskan ke Agen:
                            </label>
                            <select
                              value={newSubtaskAssigneeId}
                              onChange={(e) => setNewSubtaskAssigneeId(e.target.value)}
                              className="w-full h-7 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                            >
                              <option value="">Belum Ditugaskan</option>
                              {agents.map((a) => (
                                <option key={a.id} value={a.id}>
                                  {a.name} ({a.title})
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-textMuted-light dark:text-textMuted-dark block mb-0.5">
                              Estimasi Poin (SP):
                            </label>
                            <input
                              type="number"
                              step="0.5"
                              min="0.5"
                              max="10"
                              value={newSubtaskPoints}
                              onChange={(e) => setNewSubtaskPoints(parseFloat(e.target.value) || 1.0)}
                              className="w-full h-7 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs font-mono text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsAddingSubtask(false);
                              setSubtaskError(null);
                            }}
                          >
                            Batal
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleCreateSubtask(selectedItem.id)}
                            isLoading={subtaskSubmitting}
                            leftIcon={<Plus className="w-3 h-3" />}
                          >
                            Simpan Subtask
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Modal Action Footer */}
            {isEditingItem ? (
              <div className="pt-3.5 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between gap-2.5">
                <Button size="sm" variant="outline" onClick={cancelEditing}>
                  Batal
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleSaveItemEdit()}
                  isLoading={editSubmitting}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Simpan Perubahan
                </Button>
              </div>
            ) : (
              <div className="pt-3.5 border-t border-borderBase-light dark:border-borderBase-dark flex flex-wrap items-center justify-between gap-2.5">
                <Button size="sm" variant="outline" onClick={() => setSelectedItem(null)}>
                  Tutup
                </Button>
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  {/* Reverse transitions */}
                  {selectedItem.status === "ready" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTransition(selectedItem.id, "backlog")}
                      leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                    >
                      Kembali ke Backlog
                    </Button>
                  )}
                  {selectedItem.status === "in_progress" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTransition(selectedItem.id, "ready")}
                      leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                    >
                      Kembali ke Ready
                    </Button>
                  )}
                  {selectedItem.status === "in_review" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTransition(selectedItem.id, "in_progress")}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Minta Rework
                    </Button>
                  )}
                  {selectedItem.status === "done" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTransition(selectedItem.id, "in_review")}
                      leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                    >
                      Buka Ulang
                    </Button>
                  )}

                  {/* Forward transitions */}
                  {selectedItem.status === "backlog" && (
                    <Button
                      size="sm"
                      onClick={() => handleTransition(selectedItem.id, "ready")}
                      disabled={!selectedItem.acceptance_criteria || selectedItem.acceptance_criteria.length === 0}
                      title={
                        !selectedItem.acceptance_criteria || selectedItem.acceptance_criteria.length === 0
                          ? "Wajib memiliki minimal 1 Acceptance Criteria sebelum dipindahkan ke Ready"
                          : "Pindahkan ke Ready"
                      }
                    >
                      Siap Dikerjakan (Ready) →
                    </Button>
                  )}
                  {selectedItem.status === "ready" && (
                    <>
                      {(() => {
                        const assigned = agents.find((a) => a.id === selectedItem.assignee_agent_id);
                        return (
                          <Button
                            size="sm"
                            onClick={() => handleTriggerRun(selectedItem.id)}
                            isLoading={triggeringRunId === selectedItem.id}
                            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                          >
                            <span>{triggeringRunId === selectedItem.id ? "Menjalankan..." : "Run Agent"}</span>
                            {assigned?.llm_model && triggeringRunId !== selectedItem.id && (
                              <span className="text-[10px] font-mono opacity-80 font-normal">
                                ({getCleanModelBadge(assigned.llm_model)})
                              </span>
                            )}
                          </Button>
                        );
                      })()}
                      <Button size="sm" variant="outline" onClick={() => handleTransition(selectedItem.id, "in_progress")}>
                        Mulai Manual →
                      </Button>
                    </>
                  )}
                  {selectedItem.status === "in_progress" && (
                    <>
                      {(() => {
                        const assigned = agents.find((a) => a.id === selectedItem.assignee_agent_id);
                        return (
                          <Button
                            size="sm"
                            onClick={() => handleTriggerRun(selectedItem.id)}
                            isLoading={triggeringRunId === selectedItem.id}
                            leftIcon={<Sparkles className="w-3.5 h-3.5" />}
                          >
                            <span>{triggeringRunId === selectedItem.id ? "Menjalankan..." : "Run Agent"}</span>
                            {assigned?.llm_model && triggeringRunId !== selectedItem.id && (
                              <span className="text-[10px] font-mono opacity-80 font-normal">
                                ({getCleanModelBadge(assigned.llm_model)})
                              </span>
                            )}
                          </Button>
                        );
                      })()}
                      <Button size="sm" variant="outline" onClick={() => handleTransition(selectedItem.id, "in_review")}>
                        Review →
                      </Button>
                    </>
                  )}
                  {selectedItem.status === "in_review" && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenLatestRun(selectedItem.id)}
                        leftIcon={<Terminal className="w-3.5 h-3.5" />}
                      >
                        Hasil Run & Diffs
                      </Button>
                      <Button size="sm" variant="primary" onClick={() => handleTransition(selectedItem.id, "done")}>
                        Setujui (Approve) ✓
                      </Button>
                    </>
                  )}
                  {selectedItem.status === "done" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenLatestRun(selectedItem.id)}
                      leftIcon={<FileCode className="w-3.5 h-3.5" />}
                    >
                      Lihat Artefak
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* In-Progress Strategy Confirmation Modal */}
      {showInProgressStrategyModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in"
          onClick={(e) => {
            if (e.target === e.currentTarget && !editSubmitting) {
              setShowInProgressStrategyModal(false);
            }
          }}
        >
          <div
            className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-md w-full p-5 sm:p-6 space-y-4 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-full bg-accent/10 text-accent shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                    Task Sedang Dikerjakan (In Progress)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowInProgressStrategyModal(false)}
                    disabled={editSubmitting}
                    className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark mt-1 leading-relaxed">
                  Perubahan detail terdeteksi pada task yang sedang aktif dikerjakan agen. Pilih bagaimana agen harus menangani draf kodenya:
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleSaveItemEdit("preserve")}
                disabled={editSubmitting}
                className="w-full text-left p-3.5 rounded-lg border-2 border-accent/40 bg-accent/5 dark:bg-accent/10 hover:border-accent hover:bg-accent/15 transition-all text-xs space-y-1 group cursor-pointer"
              >
                <div className="font-semibold text-accent flex items-center justify-between">
                  <span>1. Simpan & Sesuaikan Draf (Hemat Token ⭐)</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-accent text-white font-normal">Rekomendasi</span>
                </div>
                <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark leading-snug">
                  Memperbarui kriteria baru dan mempertahankan draf kode yang sudah dibuat agen di branch agar proses revisi berjalan efisien tanpa mulai dari nol.
                </p>
              </button>

              <button
                type="button"
                onClick={() => handleSaveItemEdit("reset")}
                disabled={editSubmitting}
                className="w-full text-left p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/40 dark:bg-surfaceSecondary-dark/30 hover:border-status-warning hover:bg-surfaceSecondary-light/70 transition-all text-xs space-y-1 cursor-pointer"
              >
                <div className="font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center gap-1.5">
                  <RotateCcw className="w-3.5 h-3.5 text-status-warning" />
                  <span>2. Simpan & Reset Draf dari Awal</span>
                </div>
                <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark leading-snug">
                  Membersihkan draf kode lama dan agen akan mengeksekusi ulang dari titik awal (clean branch) berdasarkan spesifikasi baru.
                </p>
              </button>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowInProgressStrategyModal(false)}
                disabled={editSubmitting}
              >
                Batal / Kembali ke Edit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Work Item Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <form
            onSubmit={handleCreateItem}
            className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-lg w-full p-5 sm:p-6 space-y-4 shadow-2xl"
          >
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <h3 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                  Tambah Task Baru
                </h3>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Buat work item baru di project {project?.key || project?.name}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {createError && (
              <div className="p-2.5 rounded-lg bg-status-error/10 border border-status-error/30 text-status-error text-xs flex items-center gap-2 animate-in fade-in">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-snug">{createError}</span>
              </div>
            )}

            <div className="space-y-3.5 text-xs">
              <div>
                <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                  Judul Task *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Implementasi isolated Git worktree runner"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-9 px-3 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                    Tipe
                  </label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="task">Task</option>
                    <option value="story">Story</option>
                    <option value="bug">Bug</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                    Prioritas
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                    Points
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={isNaN(newPoints) ? "" : newPoints}
                    onChange={(e) => setNewPoints(e.target.value === "" ? 1.0 : parseFloat(e.target.value))}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                    Target Sprint
                  </label>
                  <select
                    value={newSprintId}
                    onChange={(e) => setNewSprintId(e.target.value)}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {activeSprint && (
                      <option value={activeSprint.id}>
                        {activeSprint.name} (Active Sprint)
                      </option>
                    )}
                    {sprints
                      .filter((s) => s.id !== activeSprint?.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                    <option value="none">Product Backlog (Tanpa Sprint)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                    Tugaskan ke Agen
                  </label>
                  <select
                    value={newAssigneeId}
                    onChange={(e) => setNewAssigneeId(e.target.value)}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">Belum Ditugaskan (Unassigned)</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.title})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                  Acceptance Criteria (1 per baris)
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh:&#10;Subprocess execution bounds verified&#10;Path traversal test passes"
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  className="w-full p-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                  Deskripsi (Opsional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Konteks dan instruksi pengerjaan..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded-md text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={createSubmitting}>
                Save Work Item
              </Button>
            </div>
          </form>
        </div>
      )}
      {/* Execution Run & Artifacts Modal */}
      {activeRun && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-borderBase-light dark:border-borderBase-dark flex items-start justify-between bg-surfaceSecondary-light/40 dark:bg-surfaceSecondary-dark/40">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                    Run {activeRun.id.slice(0, 8)}
                  </span>
                  <StatusBadge
                    variant={
                      activeRun.status === "review" || activeRun.status === "succeeded"
                        ? "success"
                        : activeRun.status === "failed"
                        ? "danger"
                        : "info"
                    }
                    label={activeRun.status.toUpperCase()}
                  />
                  {activeRun.is_simulated ? (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-status-warning/15 text-status-warning border border-status-warning/30 flex items-center space-x-1">
                      <Sparkles className="w-3 h-3" />
                      <span>[SIMULATED] {activeRun.adapter_name}</span>
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-[#16794B]/15 text-[#16794B] dark:text-[#209961] border border-[#16794B]/30 flex items-center space-x-1">
                      <Bot className="w-3 h-3" />
                      <span>[LIVE] {activeRun.adapter_name}</span>
                    </span>
                  )}
                </div>
                <div className="text-[11px] font-mono text-textMuted-light dark:text-textMuted-dark flex items-center space-x-2">
                  <span>Workspace:</span>
                  <span className="truncate max-w-md bg-surface-light dark:bg-surface-dark px-1.5 py-0.2 rounded border border-borderBase-light dark:border-borderBase-dark">
                    {activeRun.workspace_path}
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Link
                  href={`/projects/${projectId}/runs/${activeRun.id}`}
                  className="px-2.5 py-1 rounded text-xs font-medium bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark hover:border-accent text-accent transition-colors flex items-center space-x-1"
                >
                  <span>Open Full Page</span>
                  <ArrowRight className="w-3 h-3" />
                </Link>
                <button
                  onClick={() => setActiveRun(null)}
                  className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stepper Bar */}
            <div className="px-4 py-2 border-b border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark flex items-center justify-between text-[11px] overflow-x-auto">
              {[
                { id: "queued", label: "Queued" },
                { id: "preparing", label: "Preparing" },
                { id: "running", label: "Running" },
                { id: "collecting_results", label: "Collecting Results" },
                { id: "quality_checks", label: "Quality Checks" },
                { id: "review", label: "Ready for Review" },
              ].map((step, idx) => (
                <div key={step.id} className="flex items-center space-x-1.5">
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] ${
                      activeRun.status === step.id || (activeRun.status === "review" && step.id !== "review")
                        ? "bg-accent text-white font-bold"
                        : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark border border-borderBase-light dark:border-borderBase-dark"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-medium text-textPrimary-light dark:text-textPrimary-dark whitespace-nowrap">
                    {step.label}
                  </span>
                  {idx < 5 && <span className="text-borderBase-light dark:text-borderBase-dark mx-1">→</span>}
                </div>
              ))}
            </div>

            {/* Tab Navigation */}
            <div className="px-4 pt-2 border-b border-borderBase-light dark:border-borderBase-dark flex items-center space-x-2 bg-surface-light dark:bg-surface-dark">
              <button
                onClick={() => setActiveRunTab("logs")}
                className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeRunTab === "logs"
                    ? "border-accent text-accent"
                    : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Timeline & Logs ({runLogs.length})</span>
              </button>
              <button
                onClick={() => setActiveRunTab("quality")}
                className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeRunTab === "quality"
                    ? "border-accent text-accent"
                    : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Quality Gates ({runQualityChecks.length})</span>
              </button>
              <button
                onClick={() => setActiveRunTab("artifacts")}
                className={`pb-2 px-2 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
                  activeRunTab === "artifacts"
                    ? "border-accent text-accent"
                    : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                }`}
              >
                <FileCode className="w-3.5 h-3.5" />
                <span>Artifacts & Diffs ({runArtifacts.length})</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-4 flex-1 overflow-y-auto min-h-[320px] max-h-[500px]">
              {/* TAB 1: LOGS */}
              {activeRunTab === "logs" && (
                <div className="space-y-1.5 font-mono text-[11px] bg-black/90 text-neutral-200 p-3.5 rounded-md border border-neutral-800 overflow-x-auto min-h-[280px]">
                  {runLogs.length === 0 ? (
                    <div className="text-neutral-500">No logs recorded yet.</div>
                  ) : (
                    runLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-2.5 leading-relaxed">
                        <span className="text-neutral-500 flex-shrink-0">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`px-1 py-0.2 rounded text-[9px] font-bold flex-shrink-0 ${
                            log.level === "ERROR"
                              ? "bg-red-950 text-red-400 border border-red-800"
                              : log.level === "WARN"
                              ? "bg-amber-950 text-amber-400 border border-amber-800"
                              : "bg-neutral-800 text-neutral-300"
                          }`}
                        >
                          {log.level}
                        </span>
                        <span className="text-blue-400 uppercase text-[10px] flex-shrink-0">
                          [{log.stage}]
                        </span>
                        <span className="text-neutral-200">{log.message}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* TAB 2: QUALITY CHECKS */}
              {activeRunTab === "quality" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {runQualityChecks.map((qc) => (
                    <div
                      key={qc.id}
                      className="p-3 rounded-md bg-surfaceSecondary-light/50 dark:bg-surfaceSecondary-dark/50 border border-borderBase-light dark:border-borderBase-dark space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-xs flex items-center space-x-1.5">
                          <ShieldCheck className="w-4 h-4 text-status-success" />
                          <span>{qc.check_name}</span>
                        </span>
                        <StatusBadge
                          variant={qc.status === "passed" ? "success" : "danger"}
                          label={qc.status.toUpperCase()}
                        />
                      </div>
                      <div className="bg-surface-light dark:bg-surface-dark p-2 rounded border border-borderBase-light dark:border-borderBase-dark font-mono text-[10px] text-textMuted-light dark:text-textMuted-dark">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(qc.details, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: ARTIFACTS */}
              {activeRunTab === "artifacts" && (
                <div className="space-y-3">
                  {/* Artifact Sub-tabs */}
                  <div className="flex items-center space-x-1.5 border-b border-borderBase-light dark:border-borderBase-dark pb-2">
                    {runArtifacts.map((art) => (
                      <button
                        key={art.id}
                        onClick={() => setActiveArtifactTab(art.name)}
                        className={`px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors ${
                          activeArtifactTab === art.name
                            ? "bg-accent text-white"
                            : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                        }`}
                      >
                        {art.name} ({Math.round(art.size_bytes / 1024 * 10) / 10} KB)
                      </button>
                    ))}
                  </div>

                  {/* Artifact Content Preview */}
                  {runArtifacts
                    .filter((art) => art.name === activeArtifactTab)
                    .map((art) => (
                      <div
                        key={art.id}
                        className="p-3 bg-black/90 text-neutral-200 rounded-md border border-neutral-800 font-mono text-xs overflow-x-auto min-h-[220px]"
                      >
                        <pre className="whitespace-pre-wrap leading-relaxed">{art.content_preview}</pre>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark flex items-center justify-between">
              <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                Execution ran under isolated path boundaries with 0 external network requests.
              </span>
              <Button size="sm" onClick={() => setActiveRun(null)}>
                Done / Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Complete Sprint Modal */}
      {isCompleteSprintModalOpen && sprintCapacity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <h3 className="text-base font-semibold flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span>Selesaikan {sprintCapacity.sprint_name || "Sprint"}</span>
                </h3>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Tinjau pencapaian sprint, evaluasi velocity, dan tentukan kelanjutan backlog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCompleteSprintModalOpen(false)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sprint Outcome Summary */}
            <div className="p-3.5 rounded-md bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark space-y-2 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-textMuted-light dark:text-textMuted-dark">Total Delivered Points:</span>
                <span className="font-mono font-bold text-status-success text-sm">
                  {sprintCapacity.completed_points} / {sprintCapacity.total_capacity_points} SP
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px] pt-2 border-t border-borderBase-light/60 dark:border-borderBase-dark/60">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-success" />
                  <span>
                    Task Selesai (Done):{" "}
                    <strong>{items.filter((i) => i.status === "done").length}</strong>
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-status-warning" />
                  <span>
                    Belum Selesai:{" "}
                    <strong>{items.filter((i) => i.status !== "done").length}</strong>
                  </span>
                </div>
              </div>
            </div>

            {/* Next Sprint Rollover Options */}
            <div className="space-y-3 text-xs">
              <label className="flex items-start space-x-2.5 p-2.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark cursor-pointer">
                <input
                  type="checkbox"
                  checked={shouldRollover}
                  onChange={(e) => setShouldRollover(e.target.checked)}
                  className="mt-0.5 rounded text-accent focus:ring-accent"
                />
                <div>
                  <span className="font-semibold block text-textPrimary-light dark:text-textPrimary-dark">
                    Lanjutkan ke Sprint Berikutnya & Alihkan Task Sisa (Rekomendasi)
                  </span>
                  <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Task yang belum berstatus 'Done' akan dialihkan otomatis (Rollover) ke Sprint baru tanpa kehilangan riwayat kerja agen.
                  </span>
                </div>
              </label>

              {shouldRollover && (
                <div className="space-y-2.5 p-3 rounded border border-accent/20 bg-accent/5 dark:bg-accent/10">
                  <div>
                    <label className="font-medium block mb-1">Nama Sprint Baru *</label>
                    <input
                      type="text"
                      value={nextSprintName}
                      onChange={(e) => setNextSprintName(e.target.value)}
                      className="w-full h-8 px-2.5 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                      placeholder="e.g. Sprint 2: Multi-Agent Collaboration"
                    />
                  </div>

                  <div>
                    <label className="font-medium block mb-1">Goal Sprint Baru</label>
                    <input
                      type="text"
                      value={nextSprintGoal}
                      onChange={(e) => setNextSprintGoal(e.target.value)}
                      className="w-full h-8 px-2.5 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                      placeholder="Tujuan spesifik sprint ini"
                    />
                  </div>

                  <div>
                    <label className="font-medium block mb-1">Target Kapasitas (Story Points)</label>
                    <input
                      type="number"
                      value={nextSprintCapacity}
                      onChange={(e) => setNextSprintCapacity(Number(e.target.value))}
                      className="w-28 h-8 px-2.5 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <Button size="sm" variant="outline" onClick={() => setIsCompleteSprintModalOpen(false)}>
                Batal
              </Button>
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCompleteSprintOnly}
                  isLoading={sprintSubmitting}
                >
                  Hanya Selesaikan
                </Button>
                {shouldRollover && (
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handleCompleteAndStartNewSprint}
                    isLoading={sprintSubmitting}
                    leftIcon={<Play className="w-3.5 h-3.5" />}
                  >
                    Selesaikan & Mulai Sprint Baru →
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Start New Sprint Modal */}
      {isNewSprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <h3 className="text-base font-semibold flex items-center space-x-2">
                  <Play className="w-4 h-4 text-accent" />
                  <span>Mulai Sprint Baru</span>
                </h3>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Mulai siklus sprint baru untuk project {project?.key}.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNewSprintModalOpen(false)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium block mb-1">Nama Sprint *</label>
                <input
                  type="text"
                  value={nextSprintName}
                  onChange={(e) => setNextSprintName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="e.g. Sprint 2: Multi-Agent Collaboration"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">Goal Sprint</label>
                <input
                  type="text"
                  value={nextSprintGoal}
                  onChange={(e) => setNextSprintGoal(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  placeholder="Tujuan spesifik sprint ini"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">Kapasitas Target (Story Points)</label>
                <input
                  type="number"
                  value={nextSprintCapacity}
                  onChange={(e) => setNextSprintCapacity(Number(e.target.value))}
                  className="w-28 h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <Button size="sm" variant="outline" onClick={() => setIsNewSprintModalOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleCompleteAndStartNewSprint}
                isLoading={sprintSubmitting}
                leftIcon={<Play className="w-3.5 h-3.5" />}
              >
                Mulai Sprint Ini →
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
