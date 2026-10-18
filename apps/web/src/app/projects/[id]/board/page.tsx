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
  CheckCircle2,
  Clock,
  User,
  ShieldAlert,
  Flame,
  Check,
  RotateCcw,
  GitBranch,
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
  blocker_reason?: string;
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

interface Agent {
  id: string;
  name: string;
  title: string;
}

const COLUMNS = [
  { id: "backlog", label: "Backlog", description: "Unrefined or awaiting criteria" },
  { id: "ready", label: "Ready", description: "Criteria verified, ready for sprint" },
  { id: "in_progress", label: "In Progress", description: "Active execution in workspace" },
  { id: "in_review", label: "In Review", description: "Quality gates & human review" },
  { id: "done", label: "Done", description: "Verified & audited delivery" },
];

export default function ScrumBoardPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<WorkItem[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [transitionError, setTransitionError] = useState<string | null>(null);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newType, setNewType] = useState("task");
  const [newPriority, setNewPriority] = useState<PriorityLevel>("medium");
  const [newPoints, setNewPoints] = useState(2.0);
  const [newCriteria, setNewCriteria] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState("");

  // Inspect Modal
  const [selectedItem, setSelectedItem] = useState<WorkItem | null>(null);

  const fetchBoardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [projRes, itemsRes, agentsRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/work-items`),
        fetch(`http://127.0.0.1:8000/api/v1/workforce/agents`),
      ]);

      if (!projRes.ok || !itemsRes.ok) {
        throw new Error("Failed to load project board data.");
      }

      const projData = await projRes.json();
      const itemsData = await itemsRes.json();
      const agentsData = agentsRes.ok ? await agentsRes.json() : [];

      setProject(projData);
      setItems(itemsData);
      setAgents(agentsData);
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
  }, [projectId]);

  useEffect(() => {
    fetchBoardData();
  }, [fetchBoardData]);

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
        throw new Error(errJson.detail || `Failed to transition item to ${targetStatus}`);
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

  const handleCreateItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      setCreateSubmitting(true);
      setTransitionError(null);
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
        assignee_agent_id: newAssigneeId || undefined,
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

      setIsCreateModalOpen(false);
      setNewTitle("");
      setNewDesc("");
      setNewCriteria("");
      await fetchBoardData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setTransitionError(err.message);
      } else {
        setTransitionError("Failed to create work item");
      }
    } finally {
      setCreateSubmitting(false);
    }
  };

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
              onClick={fetchBoardData}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              New Work Item
            </Button>
          </div>
        }
      />

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

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchBoardData} />
      ) : (
        /* Kanban Columns Grid */
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 min-h-[550px] items-start">
          {COLUMNS.map((col) => {
            const colItems = items.filter((item) => item.status === col.id);

            return (
              <div
                key={col.id}
                className="flex flex-col bg-surfaceSecondary-light/60 dark:bg-surfaceSecondary-dark/60 rounded-md border border-borderBase-light dark:border-borderBase-dark overflow-hidden min-h-[480px]"
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
                    <div className="h-28 border border-dashed border-borderBase-light dark:border-borderBase-dark rounded flex items-center justify-center text-[11px] text-textMuted-light dark:text-textMuted-dark">
                      No items
                    </div>
                  ) : (
                    colItems.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-2 shadow-xs hover:border-accent/40 transition-colors"
                      >
                        {/* Card Header */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-mono font-semibold text-accent">{item.key}</span>
                          <span className="uppercase text-[9px] font-semibold px-1 py-0.2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark">
                            {item.type}
                          </span>
                        </div>

                        {/* Title */}
                        <h4
                          onClick={() => setSelectedItem(item)}
                          className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark hover:text-accent cursor-pointer line-clamp-2"
                        >
                          {item.title}
                        </h4>

                        {/* Metadata row */}
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-borderBase-light dark:border-borderBase-dark">
                          <PriorityIndicator level={item.priority as PriorityLevel} showLabel={false} />
                          <div className="flex items-center space-x-1 font-mono text-[10px] text-textMuted-light dark:text-textMuted-dark">
                            <span>{item.estimate_points} pts</span>
                            <span>•</span>
                            <span>{item.acceptance_criteria.length} AC</span>
                          </div>
                        </div>

                        {/* Assignee */}
                        <div className="flex items-center justify-between text-[11px] pt-1">
                          <div className="flex items-center space-x-1 text-textMuted-light dark:text-textMuted-dark truncate">
                            <User className="w-3 h-3 flex-shrink-0" />
                            <span className="truncate">{item.assignee_name || "Unassigned"}</span>
                          </div>
                        </div>

                        {/* Transition Buttons */}
                        <div className="pt-2 flex items-center justify-end space-x-1 border-t border-borderBase-light dark:border-borderBase-dark">
                          {col.id === "backlog" && (
                            <button
                              onClick={() => handleTransition(item.id, "ready")}
                              title="Move to Ready (Requires criteria)"
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                            >
                              Ready →
                            </button>
                          )}
                          {col.id === "ready" && (
                            <button
                              onClick={() => handleTransition(item.id, "in_progress")}
                              title="Start execution in workspace"
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-accent/10 text-accent hover:bg-accent/20 transition-colors"
                            >
                              Start →
                            </button>
                          )}
                          {col.id === "in_progress" && (
                            <button
                              onClick={() => handleTransition(item.id, "in_review")}
                              title="Submit for review"
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-status-info/10 text-status-info hover:bg-status-info/20 transition-colors"
                            >
                              Review →
                            </button>
                          )}
                          {col.id === "in_review" && (
                            <button
                              onClick={() => handleTransition(item.id, "done")}
                              title="Approve & Complete"
                              className="px-2 py-0.5 rounded text-[10px] font-medium bg-status-success/10 text-status-success hover:bg-status-success/20 transition-colors"
                            >
                              Approve Done ✓
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-xs px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                    {selectedItem.key}
                  </span>
                  <StatusBadge variant="info" label={selectedItem.status.toUpperCase()} />
                  <PriorityIndicator level={selectedItem.priority as PriorityLevel} />
                </div>
                <h3 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark mt-1">
                  {selectedItem.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
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
                <span className="font-semibold block mb-1">Acceptance Criteria (Enforced by Ready Guard):</span>
                {selectedItem.acceptance_criteria && selectedItem.acceptance_criteria.length > 0 ? (
                  <ul className="space-y-1">
                    {selectedItem.acceptance_criteria.map((c, i) => (
                      <li key={i} className="flex items-start space-x-2 text-textPrimary-light dark:text-textPrimary-dark">
                        <Check className="w-3.5 h-3.5 text-status-success flex-shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="p-2 rounded bg-status-danger/10 border border-status-danger/20 text-status-danger text-[11px]">
                    No acceptance criteria attached. Item cannot transition to Ready.
                  </div>
                )}
              </div>

              {/* Definition of Done */}
              <div>
                <span className="font-semibold block mb-1">Definition of Done:</span>
                <ul className="space-y-1">
                  {selectedItem.definition_of_done.map((dod, i) => (
                    <li key={i} className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark text-[11px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span>{dod}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Assignee & Workspace */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-borderBase-light dark:border-borderBase-dark">
                <div>
                  <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">Assigned Agent:</span>
                  <span className="font-semibold">{selectedItem.assignee_name || "None"}</span>
                </div>
                <div>
                  <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">Estimate:</span>
                  <span className="font-mono font-semibold">{selectedItem.estimate_points} Story Points</span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <Button size="sm" variant="outline" onClick={() => setSelectedItem(null)}>
                Close
              </Button>
              <div className="flex space-x-1.5">
                {selectedItem.status === "backlog" && (
                  <Button size="sm" onClick={() => handleTransition(selectedItem.id, "ready")}>
                    Move to Ready →
                  </Button>
                )}
                {selectedItem.status === "ready" && (
                  <Button size="sm" onClick={() => handleTransition(selectedItem.id, "in_progress")}>
                    Start In Progress →
                  </Button>
                )}
                {selectedItem.status === "in_progress" && (
                  <Button size="sm" onClick={() => handleTransition(selectedItem.id, "in_review")}>
                    Submit for Review →
                  </Button>
                )}
                {selectedItem.status === "in_review" && (
                  <Button size="sm" variant="primary" onClick={() => handleTransition(selectedItem.id, "done")}>
                    Approve Done ✓
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Work Item Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateItem}
            className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <h3 className="text-base font-semibold">Create Work Item</h3>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  New Scrum work item in project {project?.key}.
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

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium block mb-1">Title *</label>
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
                  <label className="font-medium block mb-1">Points</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value={newPoints}
                    onChange={(e) => setNewPoints(parseFloat(e.target.value))}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium block mb-1">Assigned Agent</label>
                <select
                  value={newAssigneeId}
                  onChange={(e) => setNewAssigneeId(e.target.value)}
                  className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Unassigned</option>
                  {agents.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.title})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium block mb-1">Acceptance Criteria (1 per line)</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Subprocess execution bounds verified&#10;Path traversal test passes"
                  value={newCriteria}
                  onChange={(e) => setNewCriteria(e.target.value)}
                  className="w-full p-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Context and implementation details..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full p-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs"
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
    </AppShell>
  );
}
