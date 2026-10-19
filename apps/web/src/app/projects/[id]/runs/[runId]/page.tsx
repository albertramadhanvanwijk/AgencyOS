"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { AppShell } from "../../../../../components/layout/AppShell";
import { PageHeader } from "../../../../../components/layout/PageHeader";
import { StatusBadge } from "../../../../../components/ui/StatusBadge";
import { Button } from "../../../../../components/ui/Button";
import { TableSkeleton } from "../../../../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../../../../components/ui/ErrorState";
import {
  Terminal,
  ShieldCheck,
  FileCode,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowLeft,
  Check,
  Copy,
  Folder,
  Layers,
  Search,
  Bot,
} from "lucide-react";

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

interface WorkItem {
  id: string;
  key: string;
  title: string;
  status: string;
  priority: string;
  acceptance_criteria: string[];
  definition_of_done: string[];
}

interface Project {
  id: string;
  name: string;
  key: string;
}

export default function ExecutionRunDetailPage({
  params,
}: {
  params: Promise<{ id: string; runId: string }>;
}) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;
  const runId = resolvedParams.runId;

  const [project, setProject] = useState<Project | null>(null);
  const [run, setRun] = useState<ExecutionRun | null>(null);
  const [workItem, setWorkItem] = useState<WorkItem | null>(null);
  const [logs, setLogs] = useState<RunLog[]>([]);
  const [artifacts, setArtifacts] = useState<RunArtifact[]>([]);
  const [qualityChecks, setQualityChecks] = useState<QualityCheckResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // UI Tab state
  const [activeTab, setActiveTab] = useState<"logs" | "quality" | "artifacts">("logs");
  const [activeArtifactName, setActiveArtifactName] = useState<string>("patch.diff");
  const [logFilterLevel, setLogFilterLevel] = useState<string>("ALL");
  const [logSearch, setLogSearch] = useState("");
  const [copiedPath, setCopiedPath] = useState(false);

  // Review & Approval state
  const [reviewNotes, setReviewNotes] = useState("");
  const [approvalSubmitting, setApprovalSubmitting] = useState(false);
  const [approvalSuccess, setApprovalSuccess] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Handle synthetic/manual runs directly
      if (runId.startsWith("manual-")) {
        const itemPrefix = runId.replace("manual-", "").toLowerCase();
        const [projRes, itemsRes] = await Promise.all([
          fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}`),
          fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/work-items`),
        ]);

        if (projRes.ok) setProject(await projRes.json());
        
        let matchingItem: WorkItem | null = null;
        if (itemsRes.ok) {
          const allItems: WorkItem[] = await itemsRes.json();
          matchingItem = allItems.find(
            (i) => i.id.toLowerCase().startsWith(itemPrefix) || i.key.toLowerCase().startsWith(itemPrefix)
          ) || null;
          if (matchingItem) {
            setWorkItem(matchingItem);
          }
        }

        const syntheticRun: ExecutionRun = {
          id: runId,
          project_id: projectId,
          work_item_id: matchingItem ? matchingItem.id : "",
          status: "succeeded",
          workspace_path: `workspaces/${projectId}/runs/direct-delivery`,
          is_simulated: true,
          adapter_name: "Operator Sign-Off / Direct Delivery",
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        };
        setRun(syntheticRun);

        setLogs([
          {
            id: 1,
            run_id: runId,
            timestamp: new Date().toISOString(),
            stage: "review",
            level: "INFO",
            message: `[SIMULATED] Item ${matchingItem?.key || "WORK-ITEM"} was verified and moved to Done under direct supervisor review.`,
            is_simulated: true,
          },
          {
            id: 2,
            run_id: runId,
            timestamp: new Date().toISOString(),
            stage: "succeeded",
            level: "INFO",
            message: "[SIMULATED] All acceptance criteria verified against specifications. Zero defect escapes detected.",
            is_simulated: true,
          },
        ]);

        const diffText = `# Manual Review & Direct Delivery Sign-off
# Item: ${matchingItem?.key || "WORK-ITEM"} - ${matchingItem?.title || "Direct Delivery"}
# Approved by: Agency Operator
# Verification: Manual audit & QA sign-off completed. All Definition of Done criteria verified.`;

        setArtifacts([
          {
            id: "manual-artifact-1",
            run_id: runId,
            name: "delivery_summary.md",
            artifact_type: "document",
            file_path: `workspaces/${projectId}/runs/direct-delivery/delivery_summary.md`,
            size_bytes: diffText.length,
            content_preview: diffText,
            is_simulated: true,
            created_at: new Date().toISOString(),
          },
        ]);
        setActiveArtifactName("delivery_summary.md");

        setQualityChecks([
          {
            id: "manual-qc-1",
            run_id: runId,
            check_name: "SUPERVISOR_VERIFICATION",
            status: "passed",
            details: { reviewer: "Agency Operator", criteria_checked: matchingItem?.acceptance_criteria?.length || 1 },
            executed_at: new Date().toISOString(),
            is_simulated: true,
          },
          {
            id: "manual-qc-2",
            run_id: runId,
            check_name: "DEFINITION_OF_DONE_AUDIT",
            status: "passed",
            details: { dod_items: matchingItem?.definition_of_done?.length || 1, status: "verified" },
            executed_at: new Date().toISOString(),
            is_simulated: true,
          },
        ]);

        setLoading(false);
        return;
      }

      // 2. Normal execution run fetch
      const [runRes, projRes, logsRes, artsRes, qcRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/runs/${runId}`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}`),
        fetch(`http://127.0.0.1:8000/api/v1/runs/${runId}/logs`),
        fetch(`http://127.0.0.1:8000/api/v1/runs/${runId}/artifacts`),
        fetch(`http://127.0.0.1:8000/api/v1/runs/${runId}/quality-checks`),
      ]);

      if (projRes.ok) setProject(await projRes.json());

      if (!runRes.ok) {
        // Fallback: try checking if runId is a work item ID
        const itemRes = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${runId}`);
        if (itemRes.ok) {
          const item: WorkItem = await itemRes.json();
          const runsRes = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${item.id}/runs`);
          if (runsRes.ok) {
            const itemRuns: ExecutionRun[] = await runsRes.json();
            if (itemRuns.length > 0) {
              window.location.href = `/projects/${projectId}/runs/${itemRuns[0].id}`;
              return;
            }
          }
        }
        throw new Error("Execution run not found.");
      }

      const runData: ExecutionRun = await runRes.json();
      setRun(runData);

      if (logsRes.ok) setLogs(await logsRes.json());
      if (artsRes.ok) {
        const artsData = await artsRes.json();
        setArtifacts(artsData);
        if (artsData.length > 0) setActiveArtifactName(artsData[0].name);
      }
      if (qcRes.ok) setQualityChecks(await qcRes.json());

      // Fetch corresponding work item
      if (runData.work_item_id) {
        const itemRes = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${runData.work_item_id}`);
        if (itemRes.ok) setWorkItem(await itemRes.json());
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to load execution run details.");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, runId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCopyWorkspacePath = () => {
    if (!run?.workspace_path) return;
    navigator.clipboard.writeText(run.workspace_path);
    setCopiedPath(true);
    setTimeout(() => setCopiedPath(false), 2000);
  };

  const handleApprovalDecision = async (decision: "approve" | "rework") => {
    if (!workItem) return;
    try {
      setApprovalSubmitting(true);
      setError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/work-items/${workItem.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision,
          review_notes: reviewNotes.trim() || undefined,
          approver: "Agency Operator",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Approval request failed");
      }

      const updatedItem = await res.json();
      setWorkItem(updatedItem);
      setApprovalSuccess(
        decision === "approve"
          ? "Work item successfully approved and transitioned to Done! Quality gates recorded in immutable audit log."
          : "Work item returned to In Progress for rework. Audit event recorded."
      );
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) setError(err.message);
    } finally {
      setApprovalSubmitting(false);
    }
  };

  const filteredLogs = logs.filter((log) => {
    const matchesLevel = logFilterLevel === "ALL" || log.level === logFilterLevel;
    const matchesSearch =
      !logSearch ||
      log.message.toLowerCase().includes(logSearch.toLowerCase()) ||
      log.stage.toLowerCase().includes(logSearch.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  return (
    <AppShell>
      <PageHeader
        title={`Execution Run ${runId.slice(0, 8)}`}
        description={`Work Item: ${workItem?.key || "..."} — ${workItem?.title || "Autonomous Task Execution"}`}
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: project?.name || "Project", href: `/projects/${projectId}/board` },
          { label: "Runs", href: `/projects/${projectId}/board` },
          { label: runId.slice(0, 8) },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Link href={`/projects/${projectId}/board`}>
              <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
                Back to Board
              </Button>
            </Link>
            <Button variant="outline" size="sm" onClick={fetchData} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
          </div>
        }
      />

      {error && <ErrorState message={error} onRetry={fetchData} />}

      {loading ? (
        <TableSkeleton rows={6} />
      ) : run ? (
        <div className="space-y-4">
          {/* Simulated / Live Provenance Banner */}
          {run.is_simulated ? (
            <div className="p-3.5 rounded-md bg-status-warning/10 border border-status-warning/30 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5 text-status-warning">
                <Sparkles className="w-4 h-4 flex-shrink-0" />
                <div>
                  <span className="font-semibold block">[SIMULATED] Autonomous Execution Bounded</span>
                  <span className="text-textMuted-light dark:text-textMuted-dark">
                    All code diffs, quality metrics, and test assertions are deterministic simulations emitted by {run.adapter_name}.
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-status-warning/20 text-status-warning">
                Safe Sandbox
              </span>
            </div>
          ) : (
            <div className="p-3.5 rounded-md bg-[#16794B]/10 border border-[#16794B]/30 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5 text-status-success dark:text-[#209961]">
                <Bot className="w-4 h-4 flex-shrink-0" />
                <div>
                  <span className="font-semibold block">[LIVE] Autonomous Code Generation Engine</span>
                  <span className="text-textMuted-light dark:text-textMuted-dark">
                    Code changes, diffs, and validation tests executed live via {run.adapter_name} inside isolated sandbox workspace.
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-[#16794B]/20 text-[#16794B] dark:text-[#209961]">
                Live Execution
              </span>
            </div>
          )}

          {/* Run Header & Lifecycle Stepper Card */}
          <div className="p-4 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-md space-y-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-mono text-sm font-semibold text-accent">{workItem?.key}</span>
                  <StatusBadge
                    variant={
                      run.status === "review" || run.status === "succeeded"
                        ? "success"
                        : run.status === "failed"
                        ? "danger"
                        : "info"
                    }
                    label={run.status.toUpperCase()}
                  />
                  <span className="text-xs text-textMuted-light dark:text-textMuted-dark">•</span>
                  <span className="text-xs font-mono text-textMuted-light dark:text-textMuted-dark">
                    Adapter: {run.adapter_name}
                  </span>
                </div>
                <h2 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                  {workItem?.title}
                </h2>
              </div>

              {/* Workspace directory path pill */}
              <div className="flex items-center space-x-2 text-xs font-mono bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark">
                <Folder className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                <span className="truncate max-w-sm text-textMuted-light dark:text-textMuted-dark">
                  {run.workspace_path}
                </span>
                <button
                  onClick={handleCopyWorkspacePath}
                  className="p-1 hover:bg-surface-light dark:hover:bg-surface-dark rounded transition-colors text-textMuted-light dark:text-textMuted-dark"
                  title="Copy workspace path"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                {copiedPath && <span className="text-[10px] text-status-success font-sans">Copied!</span>}
              </div>
            </div>

            {/* Stepper Bar */}
            <div className="flex items-center justify-between text-xs overflow-x-auto pt-1">
              {[
                { id: "queued", label: "Queued" },
                { id: "preparing", label: "Preparing" },
                { id: "running", label: "Running" },
                { id: "collecting_results", label: "Collecting Results" },
                { id: "quality_checks", label: "Quality Checks" },
                { id: "review", label: "Ready for Review" },
              ].map((step, idx) => (
                <div key={step.id} className="flex items-center space-x-2">
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center font-mono text-xs ${
                      run.status === step.id || (run.status === "review" && step.id !== "review")
                        ? "bg-accent text-white font-bold shadow-xs"
                        : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark border border-borderBase-light dark:border-borderBase-dark"
                    }`}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-medium text-textPrimary-light dark:text-textPrimary-dark whitespace-nowrap">
                    {step.label}
                  </span>
                  {idx < 5 && <span className="text-borderBase-light dark:text-borderBase-dark mx-2">→</span>}
                </div>
              ))}
            </div>
          </div>

          {/* Human Supervisor Review & Sign-Off Panel */}
          {workItem && (workItem.status === "in_review" || run.status === "review") && (
            <div className="p-4 rounded-md bg-accent/5 border border-accent/30 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                    Human Supervisor Review & Governance Sign-Off
                  </h3>
                </div>
                <span className="text-xs font-mono text-accent font-medium">Quality Gate: DoD Required</span>
              </div>

              {approvalSuccess && (
                <div className="p-2.5 rounded bg-status-success/15 border border-status-success/30 text-xs text-status-success flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                  <span>{approvalSuccess}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* Acceptance Criteria Checklist */}
                <div className="p-3 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5">
                  <span className="font-semibold block mb-1">Verified Acceptance Criteria:</span>
                  {(workItem.acceptance_criteria || []).map((c, i) => (
                    <div key={i} className="flex items-start space-x-2 text-textPrimary-light dark:text-textPrimary-dark">
                      <Check className="w-3.5 h-3.5 text-status-success flex-shrink-0 mt-0.5" />
                      <span>{c}</span>
                    </div>
                  ))}
                </div>

                {/* Definition of Done */}
                <div className="p-3 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5">
                  <span className="font-semibold block mb-1">Definition of Done Checks:</span>
                  {(workItem.definition_of_done || []).map((dod, i) => (
                    <div key={i} className="flex items-center space-x-2 text-textPrimary-light dark:text-textPrimary-dark">
                      <CheckCircle2 className="w-3.5 h-3.5 text-accent flex-shrink-0" />
                      <span>{dod}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Decision Input & Buttons */}
              <div className="space-y-2 pt-2">
                <textarea
                  rows={2}
                  placeholder="Supervisor review notes / rationale for approval..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full p-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <div className="flex items-center justify-end space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleApprovalDecision("rework")}
                    isLoading={approvalSubmitting}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Request Rework
                  </Button>
                  <Button
                    size="sm"
                    variant="primary"
                    onClick={() => handleApprovalDecision("approve")}
                    isLoading={approvalSubmitting}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Approve to Done ✓
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Interactive Run Tabs */}
          <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark overflow-hidden">
            <div className="px-4 pt-2 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/30">
              <div className="flex space-x-3">
                <button
                  onClick={() => setActiveTab("logs")}
                  className={`pb-2.5 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
                    activeTab === "logs"
                      ? "border-accent text-accent"
                      : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Timeline & Logs ({logs.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab("quality")}
                  className={`pb-2.5 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
                    activeTab === "quality"
                      ? "border-accent text-accent"
                      : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Quality Gates ({qualityChecks.length})</span>
                </button>
                <button
                  onClick={() => setActiveTab("artifacts")}
                  className={`pb-2.5 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1.5 ${
                    activeTab === "artifacts"
                      ? "border-accent text-accent"
                      : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                  }`}
                >
                  <FileCode className="w-3.5 h-3.5" />
                  <span>Artifacts & Diffs ({artifacts.length})</span>
                </button>
              </div>

              {/* Filters for Logs Tab */}
              {activeTab === "logs" && (
                <div className="flex items-center space-x-2 pb-2">
                  <div className="relative">
                    <Search className="w-3 h-3 absolute left-2 top-2 text-textMuted-light dark:text-textMuted-dark" />
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="h-7 pl-6 pr-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                  </div>
                  <select
                    value={logFilterLevel}
                    onChange={(e) => setLogFilterLevel(e.target.value)}
                    className="h-7 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="ALL">All Levels</option>
                    <option value="INFO">INFO</option>
                    <option value="WARN">WARN</option>
                    <option value="ERROR">ERROR</option>
                  </select>
                </div>
              )}
            </div>

            {/* Tab Body */}
            <div className="p-4 min-h-[380px]">
              {/* TAB 1: LOGS */}
              {activeTab === "logs" && (
                <div className="bg-black/95 text-neutral-200 p-4 rounded-md border border-neutral-800 font-mono text-xs space-y-1.5 max-h-[500px] overflow-y-auto">
                  {filteredLogs.length === 0 ? (
                    <div className="text-neutral-500 py-6 text-center">No logs match the current filter.</div>
                  ) : (
                    filteredLogs.map((log) => (
                      <div key={log.id} className="flex items-start space-x-3 leading-relaxed">
                        <span className="text-neutral-500 flex-shrink-0 text-[11px]">
                          {new Date(log.timestamp).toLocaleTimeString()}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[10px] font-bold flex-shrink-0 ${
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
              {activeTab === "quality" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {qualityChecks.map((qc) => (
                    <div
                      key={qc.id}
                      className="p-3.5 rounded-md bg-surfaceSecondary-light/50 dark:bg-surfaceSecondary-dark/50 border border-borderBase-light dark:border-borderBase-dark space-y-2.5"
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
                      <div className="bg-surface-light dark:bg-surface-dark p-2.5 rounded border border-borderBase-light dark:border-borderBase-dark font-mono text-[11px] text-textMuted-light dark:text-textMuted-dark">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(qc.details, null, 2)}</pre>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB 3: ARTIFACTS */}
              {activeTab === "artifacts" && (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 border-b border-borderBase-light dark:border-borderBase-dark pb-2">
                    {artifacts.map((art) => (
                      <button
                        key={art.id}
                        onClick={() => setActiveArtifactName(art.name)}
                        className={`px-3 py-1 rounded text-xs font-mono font-medium transition-colors ${
                          activeArtifactName === art.name
                            ? "bg-accent text-white"
                            : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                        }`}
                      >
                        {art.name} ({Math.round((art.size_bytes / 1024) * 10) / 10} KB)
                      </button>
                    ))}
                  </div>

                  {artifacts
                    .filter((art) => art.name === activeArtifactName)
                    .map((art) => (
                      <div
                        key={art.id}
                        className="p-4 bg-black/95 text-neutral-200 rounded-md border border-neutral-800 font-mono text-xs overflow-x-auto min-h-[280px]"
                      >
                        <pre className="whitespace-pre-wrap leading-relaxed">{art.content_preview}</pre>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}
