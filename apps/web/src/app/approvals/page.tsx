"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { TableSkeleton } from "../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  CheckSquare,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Award,
  Check,
  X,
  RefreshCw,
  ExternalLink,
  History,
  FileCheck,
  Sparkles,
} from "lucide-react";

interface RecruitmentRequest {
  id: string;
  role_id: string;
  department_id: string;
  proposed_agent_name: string;
  rationale: string;
  requested_by: string;
  required_skills: string[];
  status: "pending_approval" | "qualifying" | "qualified" | "activated" | "rejected";
  benchmark_score?: number;
  qualification_run_id?: string;
  rejection_reason?: string;
  policy_basis: string;
  created_at: string;
  updated_at: string;
  role_name?: string;
  department_name?: string;
}

interface QualificationStage {
  stage_name: string;
  status: string;
  score: number;
  weight: number;
  details: Record<string, any>;
}

interface ScorecardData {
  request_id: string;
  candidate_name: string;
  role_name: string;
  department_name: string;
  qualification_run_id: string;
  workspace_path: string;
  overall_score: number;
  is_passed: boolean;
  passing_threshold: number;
  evaluated_at: string;
  stages: QualificationStage[];
  recommendation: string;
  policy_basis: string;
}

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<RecruitmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tabs: 'pending' (qualified/pending) vs 'history' (activated/rejected)
  const [activeTab, setActiveTab] = useState<"pending" | "history">("pending");

  // Scorecard modal state
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [activeScorecard, setActiveScorecard] = useState<ScorecardData | null>(null);

  // Activation modal state
  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<RecruitmentRequest | null>(null);
  const [approverName, setApproverName] = useState("Technical Director");
  const [customTitle, setCustomTitle] = useState("");
  const [maxConcurrency, setMaxConcurrency] = useState(2);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [submittingActivation, setSubmittingActivation] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Rejection modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [candidateToReject, setCandidateToReject] = useState<RecruitmentRequest | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submittingReject, setSubmittingReject] = useState(false);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://127.0.0.1:8000/api/v1/recruitment/requests");
      if (!res.ok) {
        throw new Error("Failed to load approval requests from server.");
      }
      const data = await res.json();
      setRequests(data);
    } catch (err: any) {
      setError(err.message || "Failed to load approval items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, []);

  const pendingItems = requests.filter(
    (r) => r.status === "qualified" || r.status === "pending_approval"
  );

  const historyItems = requests.filter(
    (r) => r.status === "activated" || r.status === "rejected"
  );

  // Handle Scorecard view
  const handleOpenScorecard = async (requestId: string) => {
    try {
      setIsScorecardOpen(true);
      setScorecardLoading(true);
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/recruitment/requests/${requestId}/scorecard`
      );
      if (!res.ok) {
        throw new Error("Scorecard artifact not found or candidate not yet qualified.");
      }
      const data = await res.json();
      setActiveScorecard(data);
    } catch (err: any) {
      alert(`Scorecard Error: ${err.message}`);
      setIsScorecardOpen(false);
    } finally {
      setScorecardLoading(false);
    }
  };

  // Open activation modal
  const handleOpenActivation = (candidate: RecruitmentRequest) => {
    setSelectedCandidate(candidate);
    setCustomTitle(candidate.role_name || "Specialist");
    setApprovalNotes(`Human supervisor gate approved following sandbox qualification benchmark (${candidate.benchmark_score || "N/A"}%).`);
    setActionError(null);
    setIsActivationModalOpen(true);
  };

  // Submit activation
  const handleSubmitActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      setSubmittingActivation(true);
      setActionError(null);

      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/recruitment/requests/${selectedCandidate.id}/approve-activation`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            approver: approverName.trim(),
            custom_title: customTitle.trim() || undefined,
            max_concurrency: Number(maxConcurrency),
            approval_notes: approvalNotes.trim() || undefined,
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Activation sign-off rejected.");
      }

      const activatedData = await res.json();
      setActionSuccess(
        `Agent identity "${activatedData.agent_name}" activated successfully with policy basis ${activatedData.policy_basis}.`
      );
      setIsActivationModalOpen(false);
      await fetchApprovals();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("approvals-updated"));
      }
    } catch (err: any) {
      setActionError(err.message || "Failed to activate agent.");
    } finally {
      setSubmittingActivation(false);
    }
  };

  // Open rejection modal
  const handleOpenReject = (candidate: RecruitmentRequest) => {
    setCandidateToReject(candidate);
    setRejectionReason("Candidate failed to meet supervisor qualification expectations or workload requirements changed.");
    setIsRejectModalOpen(true);
  };

  // Submit rejection
  const handleSubmitReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateToReject) return;

    try {
      setSubmittingReject(true);
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/recruitment/requests/${candidateToReject.id}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: "rejected",
            rejection_reason: rejectionReason.trim(),
            approver: approverName.trim(),
          }),
        }
      );

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Rejection update failed.");
      }

      setActionSuccess(`Candidate "${candidateToReject.proposed_agent_name}" has been rejected.`);
      setIsRejectModalOpen(false);
      await fetchApprovals();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("approvals-updated"));
      }
    } catch (err: any) {
      alert(`Error rejecting request: ${err.message}`);
    } finally {
      setSubmittingReject(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Human Approval Queue"
        description="Traceable, policy-backed approvals for agent activations, role creations, and Done state transitions."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Approvals" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchApprovals}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh Queue
          </Button>
        }
      />

      {actionSuccess && (
        <div className="mb-4 p-4 rounded-md bg-[#16794B]/10 border border-[#16794B]/30 text-status-success flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-medium">{actionSuccess}</span>
          </div>
          <button
            onClick={() => setActionSuccess(null)}
            className="text-textMuted-light hover:text-textPrimary-light text-xs font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Container */}
      <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark overflow-hidden">
        {/* Header Bar */}
        <div className="p-4 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold">Governance Sign-Off Gates</h2>
            </div>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-accent/10 border border-accent/20 text-accent font-semibold">
              {pendingItems.length} Pending
            </span>
          </div>

          {/* Tab Selector */}
          <div className="flex items-center border border-borderBase-light dark:border-borderBase-dark rounded overflow-hidden text-xs">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-3 py-1 font-medium transition-colors ${
                activeTab === "pending"
                  ? "bg-accent text-white"
                  : "bg-surface-light dark:bg-surface-dark text-textMuted-light hover:text-textPrimary-light"
              }`}
            >
              Pending Approval ({pendingItems.length})
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`px-3 py-1 font-medium transition-colors ${
                activeTab === "history"
                  ? "bg-accent text-white"
                  : "bg-surface-light dark:bg-surface-dark text-textMuted-light hover:text-textPrimary-light"
              }`}
            >
              Sign-Off History ({historyItems.length})
            </button>
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={3} />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title="Unable to load approvals"
              message={error}
              onRetry={fetchApprovals}
            />
          </div>
        ) : activeTab === "pending" ? (
          pendingItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="All Approvals Satisfied"
                description="There are currently no pending agent activations or governance gates requiring human review."
                icon={<CheckCircle2 className="w-6 h-6 text-status-success" />}
              />
            </div>
          ) : (
            <div className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="p-5 hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark font-semibold text-accent">
                          {item.id}
                        </span>
                        <span className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                          Activate Agent Identity: {item.proposed_agent_name} ({item.role_name || "Specialist"})
                        </span>
                      </div>
                      <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                        Requested by: <span className="font-medium text-textPrimary-light dark:text-textPrimary-dark">{item.requested_by}</span> • Policy Basis: <span className="font-mono text-accent">{item.policy_basis}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.status === "qualified" ? (
                        <StatusBadge
                          variant="success"
                          label={`Sandbox Passed (${item.benchmark_score ? item.benchmark_score.toFixed(1) : "Pass"}%)`}
                        />
                      ) : (
                        <StatusBadge
                          variant="warning"
                          label="Pending Qualification"
                        />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-textMuted-light dark:text-textMuted-dark bg-canvas-light dark:bg-canvas-dark p-3 rounded border border-borderBase-light dark:border-borderBase-dark leading-relaxed">
                    {item.status === "qualified" ? (
                      <>
                        Candidate has successfully satisfied all automated qualification benchmarks in run <code className="font-mono text-accent">{item.qualification_run_id}</code> with a cumulative score of <strong className="text-status-success">{item.benchmark_score ? item.benchmark_score.toFixed(1) : ""}%</strong>. Dual-key supervisor authorization is required to provision the agent into the production workforce registry.
                      </>
                    ) : (
                      <>
                        Staffing justification: &quot;{item.rationale}&quot;. Candidate must execute the automated sandbox qualification benchmark before activation can be approved.
                      </>
                    )}
                  </p>

                  <div className="pt-1 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {item.required_skills.map((skill, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-2 py-0.5 rounded text-[10px] bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center space-x-2">
                      {item.qualification_run_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenScorecard(item.id)}
                          leftIcon={<Award className="w-3.5 h-3.5" />}
                        >
                          Scorecard
                        </Button>
                      )}

                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleOpenReject(item)}
                        leftIcon={<X className="w-3.5 h-3.5" />}
                      >
                        Reject
                      </Button>

                      {item.status === "qualified" ? (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleOpenActivation(item)}
                          leftIcon={<Check className="w-3.5 h-3.5" />}
                        >
                          Approve & Activate
                        </Button>
                      ) : (
                        <Link href="/recruitment">
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Award className="w-3.5 h-3.5" />}
                          >
                            Go to Qualification
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* Sign-Off History Tab */
          historyItems.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No History Records"
                description="No previous activation or rejection sign-offs have been recorded yet."
              />
            </div>
          ) : (
            <div className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
              {historyItems.map((hist) => (
                <div
                  key={hist.id}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-medium">
                        {hist.id}
                      </span>
                      <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                        {hist.proposed_agent_name}
                      </span>
                      <span className="text-textMuted-light dark:text-textMuted-dark">
                        • {hist.role_name} ({hist.department_name})
                      </span>
                    </div>
                    {hist.status === "rejected" ? (
                      <p className="text-status-danger text-[11px]">
                        Rejection reason: {hist.rejection_reason || "Rejected by supervisor."}
                      </p>
                    ) : (
                      <p className="text-textMuted-light dark:text-textMuted-dark text-[11px]">
                        Activated into workforce registry • Benchmark: {hist.benchmark_score ? hist.benchmark_score.toFixed(1) : "Pass"}%
                      </p>
                    )}
                  </div>

                  <div className="flex items-center space-x-3">
                    <StatusBadge
                      variant={hist.status === "activated" ? "success" : "danger"}
                      label={hist.status === "activated" ? "Activated" : "Rejected"}
                    />
                    {hist.status === "activated" && (
                      <Link href="/workforce">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<ExternalLink className="w-3 h-3" />}
                        >
                          View Agent
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* Qualification Scorecard Modal */}
      {isScorecardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="text-sm font-semibold">
                    Sandbox Qualification Scorecard
                  </h3>
                  <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Automated empirical verification for supervisor sign-off
                  </span>
                </div>
              </div>
              <button
                onClick={() => setIsScorecardOpen(false)}
                className="text-textMuted-light hover:text-textPrimary-light p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              {scorecardLoading ? (
                <div className="py-12 text-center text-textMuted-light">
                  <div className="animate-spin text-accent text-xl mb-2">◓</div>
                  Retrieving scorecard artifact...
                </div>
              ) : activeScorecard ? (
                <>
                  <div className="p-4 rounded-md border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark flex items-center justify-between">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-base font-bold">
                          {activeScorecard.candidate_name}
                        </span>
                        <span className="text-xs text-textMuted-light dark:text-textMuted-dark">
                          • {activeScorecard.role_name}
                        </span>
                      </div>
                      <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark mt-1">
                        Workspace: <code className="font-mono text-accent">{activeScorecard.workspace_path}</code>
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`text-2xl font-bold font-mono ${activeScorecard.is_passed ? "text-status-success" : "text-status-danger"}`}>
                        {activeScorecard.overall_score.toFixed(1)}%
                      </span>
                      <span className="text-[10px] text-textMuted-light block">
                        Threshold: {activeScorecard.passing_threshold}% ({activeScorecard.is_passed ? "PASSED" : "FAILED"})
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-textMuted-light">
                      Stage Verification Breakdown
                    </h4>

                    {activeScorecard.stages.map((st, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark flex items-center justify-between text-xs"
                      >
                        <div className="flex items-center space-x-2">
                          {st.status === "passed" ? (
                            <CheckCircle2 className="w-4 h-4 text-status-success" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-status-danger" />
                          )}
                          <span className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                            {st.stage_name}
                          </span>
                          <span className="text-[10px] text-textMuted-light">
                            (Weight: {(st.weight * 100).toFixed(0)}%)
                          </span>
                        </div>
                        <span className="font-mono font-bold text-accent">
                          {st.score.toFixed(1)}%
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="p-3 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-[11px] space-y-1">
                    <div className="flex items-center space-x-1.5 font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                      <span>Recommendation</span>
                    </div>
                    <p className="text-textMuted-light leading-relaxed">
                      {activeScorecard.recommendation}
                    </p>
                  </div>
                </>
              ) : null}
            </div>

            <div className="p-4 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScorecardOpen(false)}
              >
                Close Scorecard
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Dual-Key Activation Modal */}
      {isActivationModalOpen && selectedCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark rounded-lg max-w-lg w-full shadow-xl overflow-hidden">
            <form onSubmit={handleSubmitActivation}>
              <div className="p-4 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-accent" />
                  <div>
                    <h3 className="text-sm font-semibold">
                      Dual-Key Supervisor Activation Gate
                    </h3>
                    <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                      Provision new AI agent identity and verified skill profile
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsActivationModalOpen(false)}
                  className="text-textMuted-light hover:text-textPrimary-light p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {actionError && (
                  <div className="p-3 rounded bg-status-danger/10 border border-status-danger/30 text-status-danger flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{actionError}</span>
                  </div>
                )}

                <div className="p-3 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      Candidate: {selectedCandidate.proposed_agent_name}
                    </span>
                    <span className="font-mono text-status-success font-bold">
                      {selectedCandidate.benchmark_score ? selectedCandidate.benchmark_score.toFixed(1) : "Pass"}% Score
                    </span>
                  </div>
                  <span className="text-textMuted-light dark:text-textMuted-dark block">
                    Role: {selectedCandidate.role_name} ({selectedCandidate.department_name})
                  </span>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Supervisor Approver Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs"
                    placeholder="e.g. Technical Director / Lead Architect"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Agent Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs"
                    placeholder="e.g. Database Reliability Specialist"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Max Parallel Concurrency
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={maxConcurrency}
                    onChange={(e) => setMaxConcurrency(Number(e.target.value))}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Supervisor Approval Notes / Sign-Off Justification
                  </label>
                  <textarea
                    rows={2}
                    value={approvalNotes}
                    onChange={(e) => setApprovalNotes(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs"
                    placeholder="Provide justification recorded to immutable audit trail..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsActivationModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={submittingActivation}
                  leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}
                >
                  Confirm & Provision Agent
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {isRejectModalOpen && candidateToReject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark rounded-lg max-w-md w-full shadow-xl overflow-hidden">
            <form onSubmit={handleSubmitReject}>
              <div className="p-4 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
                <div className="flex items-center space-x-2 text-status-danger">
                  <ShieldAlert className="w-5 h-5" />
                  <h3 className="text-sm font-semibold">Reject Candidate Request</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsRejectModalOpen(false)}
                  className="text-textMuted-light hover:text-textPrimary-light p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                <p className="text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                  Are you sure you want to reject candidate <strong>{candidateToReject.proposed_agent_name}</strong>? This decision will be permanently logged to the audit provenance register.
                </p>

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Rejection Reason *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs"
                    placeholder="Provide specific reason for rejection..."
                  />
                </div>
              </div>

              <div className="p-4 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsRejectModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="danger"
                  size="sm"
                  isLoading={submittingReject}
                  leftIcon={<X className="w-3.5 h-3.5" />}
                >
                  Confirm Rejection
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
