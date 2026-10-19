"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { AppShell } from "../../../../components/layout/AppShell";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { StatusBadge, StatusVariant } from "../../../../components/ui/StatusBadge";
import { PriorityIndicator, PriorityLevel } from "../../../../components/ui/PriorityIndicator";
import { Button } from "../../../../components/ui/Button";
import { TableSkeleton } from "../../../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../../../components/ui/ErrorState";
import {
  Plus,
  Play,
  CheckCircle,
  Calendar,
  ArrowRight,
  RotateCcw,
  Sparkles,
  User,
  Layers,
  Search,
  X,
  Kanban,
  ListTodo,
  BarChart2,
  AlertTriangle,
  MoveUpRight,
  ArrowDownToLine,
  Check,
  Zap,
} from "lucide-react";

interface WorkItem {
  id: string;
  project_id: string;
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
  created_at: string;
  updated_at: string;
}

interface Sprint {
  id: string;
  project_id: string;
  name: string;
  goal?: string;
  status: string; // active, planning, completed
  capacity_points: number;
  start_date: string;
  end_date?: string;
  items_count?: number;
}

interface Project {
  id: string;
  name: string;
  key: string;
  goal?: string;
  status: string;
  workspace_path: string;
  active_sprint_name?: string;
}

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

export default function BacklogPlanningPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Search and filter for Product Backlog
  const [backlogSearch, setBacklogSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");

  // Inspect Modal
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);
  const [recommendations, setRecommendations] = useState<AgentRecommendation[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [assigningAgentId, setAssigningAgentId] = useState<string | null>(null);

  // Create Work Item Modal
  const [isCreateItemModalOpen, setIsCreateItemModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("task");
  const [newPriority, setNewPriority] = useState<PriorityLevel>("medium");
  const [newPoints, setNewPoints] = useState(2.0);
  const [newCriteria, setNewCriteria] = useState("");
  const [targetSprintForNewItem, setTargetSprintForNewItem] = useState<string>("");

  // Create / Start Next Sprint Modal
  const [isSprintModalOpen, setIsSprintModalOpen] = useState(false);
  const [sprintTopic, setSprintTopic] = useState("");
  const [sprintGoal, setSprintGoal] = useState("");
  const [sprintCapacityPoints, setSprintCapacityPoints] = useState(20);
  const [sprintSubmitting, setSprintSubmitting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [projRes, sprintsRes, itemsRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprints`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/work-items`),
      ]);

      if (!projRes.ok || !sprintsRes.ok || !itemsRes.ok) {
        throw new Error("Failed to load project backlog & sprint data.");
      }

      const projData = await projRes.json();
      const sprintsData = await sprintsRes.json();
      const itemsData = await itemsRes.json();

      setProject(projData);
      setSprints(sprintsData);
      setItems(itemsData);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Moving item between Sprints or back to Backlog
  const handleMoveItemToSprint = async (itemId: string, sprintId: string | null) => {
    try {
      setActionError(null);
      const targetItem = items.find((i) => i.id === itemId);
      const payload: { sprint_id: string | null; status?: string } = {
        sprint_id: sprintId,
      };

      if (sprintId !== null && targetItem?.status === "backlog" && (targetItem.acceptance_criteria?.length || 0) > 0) {
        payload.status = "ready";
      } else if (sprintId === null) {
        payload.status = "backlog";
      }

      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to update item sprint");
      }

      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      }
    }
  };

  // Start Sprint
  const handleStartSprint = async (sprintId: string) => {
    try {
      setActionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprints/${sprintId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "active" }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to start sprint");
      }

      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      }
    }
  };

  // Complete Sprint
  const handleCompleteSprint = async (sprintId: string) => {
    try {
      setActionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprints/${sprintId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to complete sprint");
      }

      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      }
    }
  };

  // Create new Sprint
  const handleCreateSprint = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSprintSubmitting(true);
      setActionError(null);

      const nextNum = sprints.length + 1;
      const formattedName = sprintTopic.trim()
        ? `Sprint ${nextNum}: ${sprintTopic.trim()}`
        : `Sprint ${nextNum}`;

      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprints`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formattedName,
          goal: sprintGoal.trim() || undefined,
          capacity_points: sprintCapacityPoints || 20,
          status: "planning", // creates as planning/future sprint
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to create sprint container");
      }

      setIsSprintModalOpen(false);
      setSprintTopic("");
      setSprintGoal("");
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      }
    } finally {
      setSprintSubmitting(false);
    }
  };

  // Create new Work Item
  const handleCreateWorkItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreateSubmitting(true);
      setActionError(null);

      const criteriaList = newCriteria
        .split("\n")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      const payload = {
        project_id: projectId,
        title: newTitle.trim(),
        description: newDesc.trim() || undefined,
        type: newType,
        priority: newPriority,
        estimate_points: newPoints,
        acceptance_criteria: criteriaList,
        definition_of_done: ["Code merged", "Passing tests", "Audit review recorded"],
        sprint_id: targetSprintForNewItem || undefined,
      };

      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/work-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to create work item");
      }

      setIsCreateItemModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewCriteria("");
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setActionError(err.message);
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Recommendations for item
  const fetchRecommendations = async (itemId: string) => {
    try {
      setLoadingRecs(true);
      setActionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${itemId}/recommend-assignees`);
      if (!res.ok) throw new Error("Failed to load agent recommendations");
      const data: AgentRecommendation[] = await res.json();
      setRecommendations(data);
    } catch (err: unknown) {
      if (err instanceof Error) setActionError(err.message);
    } finally {
      setLoadingRecs(false);
    }
  };

  // Assign agent
  const handleAssignAgent = async (itemId: string, agentId: string) => {
    try {
      setAssigningAgentId(agentId);
      setActionError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${itemId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: agentId, actor: "Scrum Master" }),
      });
      if (!res.ok) throw new Error("Failed to assign agent");
      const updated = await res.json();
      setSelectedItem(updated);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setActionError(err.message);
    } finally {
      setAssigningAgentId(null);
    }
  };

  // Sprints breakdown
  const activeSprint = sprints.find((s) => s.status === "active");
  const plannedSprints = sprints.filter((s) => s.status === "planning");
  const completedSprints = sprints.filter((s) => s.status === "completed");

  // Product Backlog items (unassigned to any active or planning sprint)
  const productBacklogItems = items.filter((item) => {
    const isUnplanned = !item.sprint_id;
    const matchesSearch =
      item.title.toLowerCase().includes(backlogSearch.toLowerCase()) ||
      item.key.toLowerCase().includes(backlogSearch.toLowerCase());
    const matchesType = typeFilter === "all" || item.type === typeFilter;
    const matchesPriority = priorityFilter === "all" || item.priority === priorityFilter;

    return isUnplanned && matchesSearch && matchesType && matchesPriority;
  });

  const getStatusBadgeVariant = (st: string): StatusVariant => {
    switch (st) {
      case "done":
        return "success";
      case "in_progress":
        return "info";
      case "in_review":
        return "warning";
      case "blocked":
        return "danger";
      case "ready":
        return "neutral";
      default:
        return "neutral";
    }
  };

  return (
    <AppShell>
      <PageHeader
        title={`${project?.name || "Project"} — Backlog & Planning`}
        description="Perencanaan sprint, estimasi story points, alokasi kapasitas, dan inventaris Product Backlog ala Jira."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: project?.name || "Backlog" },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSprintModalOpen(true)}
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
            >
              + Buat Sprint Baru
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setTargetSprintForNewItem("");
                setIsCreateItemModalOpen(true);
              }}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              + Tambah Backlog Item
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs: Backlog Planning on Left, Kanban Board on Right */}
      <div className="flex items-center space-x-2 border-b border-borderBase-light dark:border-borderBase-dark pb-3">
        <Link
          href={`/projects/${projectId}/backlog`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent/10 text-accent border border-accent/20 transition-colors"
        >
          <ListTodo className="w-4 h-4" />
          <span>Backlog & Sprint Planning</span>
        </Link>
        <Link
          href={`/projects/${projectId}/board`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors"
        >
          <Kanban className="w-4 h-4" />
          <span>Papan Scrum (Board)</span>
        </Link>
      </div>

      {/* Error alert banner */}
      {actionError && (
        <div className="p-3 rounded-md bg-status-danger/10 border border-status-danger/30 flex items-start justify-between text-xs text-status-danger">
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="p-1 hover:bg-status-danger/20 rounded">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: ACTIVE & FUTURE SPRINTS (Jira Sprint Buckets) */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-accent" />
              <span>Sprint Buckets (Wadah Sprint Aktif & Mendatang)</span>
            </h2>

            {/* Active Sprint Bucket */}
            {activeSprint ? (
              (() => {
                const sprintItems = items.filter((i) => i.sprint_id === activeSprint.id);
                const totalPoints = sprintItems.reduce((acc, i) => acc + (i.estimate_points || 0), 0);
                const donePoints = sprintItems
                  .filter((i) => i.status === "done")
                  .reduce((acc, i) => acc + (i.estimate_points || 0), 0);

                return (
                  <div className="border border-accent/40 rounded-lg bg-surface-light dark:bg-surface-dark overflow-hidden shadow-xs">
                    {/* Sprint Header */}
                    <div className="p-3.5 bg-accent/5 dark:bg-accent/10 border-b border-borderBase-light dark:border-borderBase-dark flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-semibold text-sm text-textPrimary-light dark:text-textPrimary-dark">
                            {activeSprint.name}
                          </span>
                          <StatusBadge variant="success" label="Active Sprint" />
                        </div>
                        {activeSprint.goal && (
                          <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                            Goal: {activeSprint.goal}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center space-x-3 text-xs">
                        <span className="font-mono text-textMuted-light dark:text-textMuted-dark">
                          Beban: <strong>{totalPoints}</strong> / {activeSprint.capacity_points} SP
                        </span>
                        <span className="font-mono text-status-success font-semibold">
                          • Selesai: {donePoints} SP
                        </span>
                        <Link href={`/projects/${projectId}/board`}>
                          <Button size="sm" variant="outline" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                            Buka di Board
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCompleteSprint(activeSprint.id)}
                          leftIcon={<CheckCircle className="w-3.5 h-3.5" />}
                        >
                          Selesaikan Sprint
                        </Button>
                      </div>
                    </div>

                    {/* Sprint Items List */}
                    <div className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
                      {sprintItems.length === 0 ? (
                        <div className="p-4 text-center text-xs text-textMuted-light dark:text-textMuted-dark italic">
                          Belum ada task di sprint ini. Tarik atau pindahkan task dari Product Backlog di bawah.
                        </div>
                      ) : (
                        sprintItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 flex items-center justify-between hover:bg-surfaceSecondary-light/40 dark:hover:bg-surfaceSecondary-dark/40 transition-colors text-xs"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                              <span className="font-mono font-semibold text-accent text-[11px] flex-shrink-0">
                                {item.key}
                              </span>
                              <span className="uppercase text-[9px] font-semibold px-1 py-0.2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark flex-shrink-0">
                                {item.type}
                              </span>
                              <span
                                onClick={() => {
                                  setSelectedItem(item);
                                  fetchRecommendations(item.id);
                                }}
                                className="font-medium text-textPrimary-light dark:text-textPrimary-dark truncate hover:text-accent cursor-pointer"
                              >
                                {item.title}
                              </span>
                            </div>

                            <div className="flex items-center space-x-3 flex-shrink-0">
                              <StatusBadge
                                variant={getStatusBadgeVariant(item.status)}
                                label={item.status.replace("_", " ")}
                              />
                              <div className="flex items-center space-x-1 text-textMuted-light dark:text-textMuted-dark text-[11px] w-32 truncate">
                                <User className="w-3 h-3 flex-shrink-0" />
                                <span className="truncate">{item.assignee_name || "Unassigned"}</span>
                              </div>
                              <span className="font-mono text-textMuted-light dark:text-textMuted-dark text-[11px] w-12 text-right">
                                {item.estimate_points} SP
                              </span>
                              <button
                                onClick={() => handleMoveItemToSprint(item.id, null)}
                                title="Keluarkan dari sprint ini ke Backlog"
                                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-status-danger hover:bg-status-danger/10 transition-colors"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="p-4 rounded-lg border border-dashed border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark flex items-center justify-between text-xs">
                <span className="text-textMuted-light dark:text-textMuted-dark">
                  Tidak ada Sprint yang sedang aktif saat ini.
                </span>
                <Button size="sm" onClick={() => setIsSprintModalOpen(true)} leftIcon={<Play className="w-3.5 h-3.5" />}>
                  Mulai Sprint Baru
                </Button>
              </div>
            )}

            {/* Planned / Future Sprints */}
            {plannedSprints.map((sprint) => {
              const sprintItems = items.filter((i) => i.sprint_id === sprint.id);
              const totalPoints = sprintItems.reduce((acc, i) => acc + (i.estimate_points || 0), 0);

              return (
                <div
                  key={sprint.id}
                  className="border border-borderBase-light dark:border-borderBase-dark rounded-lg bg-surface-light dark:bg-surface-dark overflow-hidden shadow-xs"
                >
                  <div className="p-3.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-b border-borderBase-light dark:border-borderBase-dark flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-sm text-textPrimary-light dark:text-textPrimary-dark">
                          {sprint.name}
                        </span>
                        <StatusBadge variant="neutral" label="Future Sprint" />
                      </div>
                      {sprint.goal && (
                        <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                          Goal: {sprint.goal}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 text-xs">
                      <span className="font-mono text-textMuted-light dark:text-textMuted-dark">
                        Beban: <strong>{totalPoints}</strong> / {sprint.capacity_points} SP
                      </span>
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleStartSprint(sprint.id)}
                        leftIcon={<Play className="w-3.5 h-3.5" />}
                      >
                        Start Sprint
                      </Button>
                    </div>
                  </div>

                  <div className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
                    {sprintItems.length === 0 ? (
                      <div className="p-3 text-center text-xs text-textMuted-light dark:text-textMuted-dark italic">
                        Belum ada task yang direncanakan di sprint ini.
                      </div>
                    ) : (
                      sprintItems.map((item) => (
                        <div
                          key={item.id}
                          className="p-3 flex items-center justify-between hover:bg-surfaceSecondary-light/40 dark:hover:bg-surfaceSecondary-dark/40 transition-colors text-xs"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                            <span className="font-mono font-semibold text-accent text-[11px] flex-shrink-0">
                              {item.key}
                            </span>
                            <span className="uppercase text-[9px] font-semibold px-1 py-0.2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark flex-shrink-0">
                              {item.type}
                            </span>
                            <span
                              onClick={() => {
                                setSelectedItem(item);
                                fetchRecommendations(item.id);
                              }}
                              className="font-medium text-textPrimary-light dark:text-textPrimary-dark truncate hover:text-accent cursor-pointer"
                            >
                              {item.title}
                            </span>
                          </div>

                          <div className="flex items-center space-x-3 flex-shrink-0">
                            <PriorityIndicator level={item.priority as PriorityLevel} showLabel={false} />
                            <span className="font-mono text-textMuted-light dark:text-textMuted-dark text-[11px]">
                              {item.estimate_points} SP
                            </span>
                            <button
                              onClick={() => handleMoveItemToSprint(item.id, null)}
                              title="Keluarkan ke Backlog"
                              className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-status-danger hover:bg-status-danger/10 transition-colors"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SECTION 2: PRODUCT BACKLOG INVENTORY (Gudang Backlog Jira) */}
          <div className="space-y-3 pt-4 border-t border-borderBase-light dark:border-borderBase-dark">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
                  <ListTodo className="w-4 h-4 text-accent" />
                  <span>Product Backlog (Inventaris Ide & Kebutuhan Fitur)</span>
                  <span className="px-2 py-0.5 rounded-full text-xs font-mono bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark">
                    {productBacklogItems.length} items
                  </span>
                </h2>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Daftar seluruh kebutuhan proyek yang belum dijadwalkan ke sprint aktif.
                </p>
              </div>

              {/* Search and filters */}
              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Cari di backlog..."
                    value={backlogSearch}
                    onChange={(e) => setBacklogSearch(e.target.value)}
                    className="w-44 h-8 pl-8 pr-2.5 text-xs bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <select
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value)}
                  className="h-8 px-2 text-xs bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="all">Semua Tipe</option>
                  <option value="story">Story</option>
                  <option value="task">Task</option>
                  <option value="bug">Bug</option>
                  <option value="epic">Epic</option>
                </select>

                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="h-8 px-2 text-xs bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="all">Semua Prioritas</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
              </div>
            </div>

            {/* Backlog Items List */}
            <div className="border border-borderBase-light dark:border-borderBase-dark rounded-lg bg-surface-light dark:bg-surface-dark overflow-hidden shadow-xs divide-y divide-borderBase-light dark:divide-borderBase-dark">
              {productBacklogItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-textMuted-light dark:text-textMuted-dark">
                  Tidak ada item backlog yang cocok. Klik tombol <strong>"+ Tambah Backlog Item"</strong> untuk menambahkan ide atau kebutuhan baru.
                </div>
              ) : (
                productBacklogItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between hover:bg-surfaceSecondary-light/40 dark:hover:bg-surfaceSecondary-dark/40 transition-colors text-xs"
                  >
                    <div className="flex items-center space-x-3 flex-1 min-w-0 pr-4">
                      <span className="font-mono font-semibold text-accent text-[11px] flex-shrink-0">
                        {item.key}
                      </span>
                      <span className="uppercase text-[9px] font-semibold px-1 py-0.2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark flex-shrink-0">
                        {item.type}
                      </span>
                      <span
                        onClick={() => {
                          setSelectedItem(item);
                          fetchRecommendations(item.id);
                        }}
                        className="font-medium text-textPrimary-light dark:text-textPrimary-dark truncate hover:text-accent cursor-pointer"
                      >
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 flex-shrink-0">
                      <PriorityIndicator level={item.priority as PriorityLevel} showLabel={false} />
                      <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark font-mono">
                        {item.acceptance_criteria.length} AC
                      </span>
                      <span className="font-mono text-textMuted-light dark:text-textMuted-dark text-[11px] w-12 text-right">
                        {item.estimate_points} SP
                      </span>

                      {/* Dropdown to assign to a sprint */}
                      {sprints.filter((s) => s.status !== "completed").length > 0 && (
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleMoveItemToSprint(item.id, e.target.value);
                            }
                          }}
                          className="h-7 px-2 text-[11px] bg-accent/10 border border-accent/30 rounded text-accent focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer font-medium"
                        >
                          <option value="" disabled>
                            + Pindahkan ke Sprint...
                          </option>
                          {sprints
                            .filter((s) => s.status !== "completed")
                            .map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.status})
                              </option>
                            ))}
                        </select>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Inspect Item Modal */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono font-semibold text-accent text-xs">{selectedItem.key}</span>
                  <StatusBadge variant={getStatusBadgeVariant(selectedItem.status)} label={selectedItem.status} />
                </div>
                <h3 className="text-base font-semibold mt-1">{selectedItem.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs max-h-[60vh] overflow-y-auto pr-1">
              {selectedItem.description && (
                <div>
                  <span className="font-semibold block mb-1">Description:</span>
                  <p className="text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              {/* Acceptance Criteria */}
              <div>
                <span className="font-semibold block mb-1">Acceptance Criteria ({selectedItem.acceptance_criteria.length}):</span>
                {selectedItem.acceptance_criteria.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedItem.acceptance_criteria.map((c, i) => (
                      <li key={i} className="flex items-start space-x-2 text-textMuted-light dark:text-textMuted-dark">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent mt-1.5 flex-shrink-0" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-2 rounded bg-status-danger/10 border border-status-danger/20 text-status-danger text-[11px]">
                    Belum ada acceptance criteria. Item belum memenuhi syarat untuk Ready.
                  </div>
                )}
              </div>

              {/* Assignee & Concurrency */}
              <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">Assigned Agent:</span>
                    <span className="font-semibold">{selectedItem.assignee_name || "Belum Ditugaskan"}</span>
                  </div>
                  <div>
                    <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">Story Points:</span>
                    <span className="font-mono font-semibold">{selectedItem.estimate_points} SP</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div>
                    <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">Sprint Terjadwal:</span>
                    <span className="font-semibold text-accent">
                      {sprints.find((s) => s.id === selectedItem.sprint_id)?.name || "Product Backlog (Unassigned)"}
                    </span>
                  </div>
                  <div>
                    <select
                      value={selectedItem.sprint_id || ""}
                      onChange={async (e) => {
                        const newSprintId = e.target.value || null;
                        await handleMoveItemToSprint(selectedItem.id, newSprintId);
                        setSelectedItem({ ...selectedItem, sprint_id: newSprintId || undefined });
                      }}
                      className="h-7 px-2 text-[11px] bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                    >
                      <option value="">Simpan di Product Backlog</option>
                      {sprints
                        .filter((s) => s.status !== "completed")
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.status})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {/* Smart Recommendation List */}
                <div className="pt-2 border-t border-borderBase-light/60 dark:border-borderBase-dark/60 space-y-2">
                  <span className="font-semibold text-xs text-accent flex items-center space-x-1">
                    <Zap className="w-3.5 h-3.5" />
                    <span>Rekomendasi Agen Terbaik</span>
                  </span>

                  {loadingRecs ? (
                    <div className="p-2 text-center text-textMuted-light dark:text-textMuted-dark text-[11px]">
                      Menganalisis kecocokan skill agen...
                    </div>
                  ) : recommendations.length === 0 ? (
                    <div className="p-2 text-center text-textMuted-light dark:text-textMuted-dark text-[11px]">
                      Tidak ada agen aktif yang tersedia.
                    </div>
                  ) : (
                    recommendations.slice(0, 3).map((rec) => (
                      <div
                        key={rec.agent_id}
                        className="p-2 rounded border border-borderBase-light dark:border-borderBase-dark flex items-center justify-between"
                      >
                        <div>
                          <div className="flex items-center space-x-1.5 font-medium">
                            <span>{rec.name}</span>
                            <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                              ({rec.role_name})
                            </span>
                            <span className="px-1 py-0.2 rounded font-mono text-[9px] font-bold bg-status-success/15 text-status-success">
                              {rec.match_score}%
                            </span>
                          </div>
                          <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark font-mono block">
                            Slot: {rec.current_concurrency}/{rec.max_concurrency}
                          </span>
                        </div>
                        {selectedItem.assignee_agent_id === rec.agent_id ? (
                          <span className="text-[11px] font-semibold text-status-success flex items-center space-x-1">
                            <Check className="w-3 h-3" />
                            <span>Ditugaskan</span>
                          </span>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => handleAssignAgent(selectedItem.id, rec.agent_id)}
                            isLoading={assigningAgentId === rec.agent_id}
                          >
                            Pilih
                          </Button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end">
              <Button size="sm" onClick={() => setSelectedItem(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Sprint Modal */}
      {isSprintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateSprint}
            className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <h3 className="text-base font-semibold flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-accent" />
                  <span>Buat Wadah Sprint Baru</span>
                </h3>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Nomor urut otomatis: <strong>Sprint {sprints.length + 1}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSprintModalOpen(false)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium block mb-1">Topik / Sub-Judul Sprint</label>
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-1.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded font-mono font-semibold text-accent text-xs">
                    Sprint {sprints.length + 1}:
                  </span>
                  <input
                    type="text"
                    required
                    value={sprintTopic}
                    onChange={(e) => setSprintTopic(e.target.value)}
                    placeholder="e.g. Core API & Database Migration"
                    className="flex-1 h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium block mb-1">Goal Sprint</label>
                <input
                  type="text"
                  value={sprintGoal}
                  onChange={(e) => setSprintGoal(e.target.value)}
                  placeholder="Tujuan spesifik yang ingin dicapai tim"
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">Kapasitas Target (Story Points)</label>
                <input
                  type="number"
                  value={sprintCapacityPoints}
                  onChange={(e) => setSprintCapacityPoints(Number(e.target.value))}
                  className="w-28 h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <Button size="sm" variant="outline" type="button" onClick={() => setIsSprintModalOpen(false)}>
                Batal
              </Button>
              <Button size="sm" variant="primary" type="submit" isLoading={sprintSubmitting}>
                Buat Sprint →
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Create Work Item Modal */}
      {isCreateItemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateWorkItem}
            className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <h3 className="text-base font-semibold">Tambah Item Backlog</h3>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Tambah kebutuhan fitur, user story, atau bug baru ke dalam inventaris backlog.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateItemModalOpen(false)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium block mb-1">Judul Task *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement isolated Git worktree runner"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="font-medium block mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="task">Task</option>
                    <option value="story">Story</option>
                    <option value="bug">Bug</option>
                    <option value="epic">Epic</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium block mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as PriorityLevel)}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium block mb-1">Estimate (SP)</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={newPoints}
                    onChange={(e) => setNewPoints(parseFloat(e.target.value))}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium block mb-1">Target Sprint (Opsional)</label>
                <select
                  value={targetSprintForNewItem}
                  onChange={(e) => setTargetSprintForNewItem(e.target.value)}
                  className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Simpan di Product Backlog</option>
                  {sprints
                    .filter((s) => s.status !== "completed")
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="font-medium block mb-1">Acceptance Criteria (1 per baris)</label>
                <textarea
                  rows={3}
                  placeholder={"Path traversal blocked via resolve()\nSubprocess execution isolated"}
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  className="w-full p-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono text-[11px]"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <Button size="sm" variant="outline" type="button" onClick={() => setIsCreateItemModalOpen(false)}>
                Batal
              </Button>
              <Button size="sm" variant="primary" type="submit" isLoading={createSubmitting}>
                Simpan Item →
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
