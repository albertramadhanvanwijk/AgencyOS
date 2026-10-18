"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge, StatusVariant } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { TableSkeleton } from "../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  UserPlus,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Play,
  FileText,
  Check,
  X,
  ArrowRight,
  Sparkles,
  RefreshCw,
  Layers,
  Cpu,
  Award,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";

interface SkillBottleneck {
  skill: string;
  demand_items_count: number;
  active_agents_count: number;
  severity: "low" | "medium" | "high" | "critical";
  affected_work_items: string[];
}

interface RecruitmentRecommendation {
  action: "RECRUIT_NEW_AGENT" | "REASSIGN_EXISTING" | "CAPACITY_SUFFICIENT";
  target_role_id?: string;
  target_role_name?: string;
  suggested_skills: string[];
  rationale: string;
  confidence_score: number;
}

interface DemandAnalysis {
  total_active_projects: number;
  total_active_work_items: number;
  unassigned_work_items: number;
  total_workforce_agents: number;
  active_workforce_agents: number;
  bottlenecks: SkillBottleneck[];
  recommendations: RecruitmentRecommendation[];
}

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

interface JobRole {
  id: string;
  name: string;
  code: string;
  department_id: string;
}

interface Department {
  id: string;
  name: string;
  code: string;
}

export default function RecruitmentPage() {
  const [requests, setRequests] = useState<RecruitmentRequest[]>([]);
  const [demand, setDemand] = useState<DemandAnalysis | null>(null);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals & Drawers
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isScorecardOpen, setIsScorecardOpen] = useState(false);
  const [scorecardLoading, setScorecardLoading] = useState(false);
  const [activeScorecard, setActiveScorecard] = useState<ScorecardData | null>(null);

  const [isActivationModalOpen, setIsActivationModalOpen] = useState(false);
  const [selectedCandidate, setSelectedCandidate] = useState<RecruitmentRequest | null>(null);

  // Qualification Running State
  const [qualifyingId, setQualifyingId] = useState<string | null>(null);

  // New Request Form State
  const [newRoleId, setNewRoleId] = useState("");
  const [newName, setNewName] = useState("");
  const [newRationale, setNewRationale] = useState("");
  const [newSkills, setNewSkills] = useState("");
  const [newRequestedBy, setNewRequestedBy] = useState("Engineering Supervisor");
  const [submittingCreate, setSubmittingCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Activation Form State
  const [approverName, setApproverName] = useState("Technical Director");
  const [customTitle, setCustomTitle] = useState("");
  const [maxConcurrency, setMaxConcurrency] = useState(2);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [submittingActivation, setSubmittingActivation] = useState(false);
  const [activationError, setActivationError] = useState<string | null>(null);
  const [activationSuccess, setActivationSuccess] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [reqRes, demandRes, rolesRes, deptsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/v1/recruitment/requests"),
        fetch("http://127.0.0.1:8000/api/v1/recruitment/demand-analysis"),
        fetch("http://127.0.0.1:8000/api/v1/organization/roles"),
        fetch("http://127.0.0.1:8000/api/v1/organization/departments"),
      ]);

      if (!reqRes.ok || !demandRes.ok) {
        throw new Error("Failed to load recruitment data from service.");
      }

      const reqData = await reqRes.json();
      const demandData = await demandRes.json();
      const rolesData = rolesRes.ok ? await rolesRes.json() : [];
      const deptsData = deptsRes.ok ? await deptsRes.json() : [];

      setRequests(reqData);
      setDemand(demandData);
      setRoles(rolesData);
      setDepartments(deptsData);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered requests
  const filteredRequests = requests.filter((r) => {
    const matchesStatus =
      statusFilter === "all" ? true : r.status === statusFilter;
    const matchesSearch =
      searchTerm === "" ||
      r.proposed_agent_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.role_name && r.role_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.required_skills.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesStatus && matchesSearch;
  });

  // Action: Trigger Sandbox Qualification
  const handleRunQualification = async (requestId: string) => {
    try {
      setQualifyingId(requestId);
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/recruitment/requests/${requestId}/qualify`,
        { method: "POST" }
      );
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Sandbox qualification run failed.");
      }
      // Refresh list to update status and scores
      await fetchData();
      // Automatically open scorecard
      await handleOpenScorecard(requestId);
    } catch (err: any) {
      alert(`Qualification Error: ${err.message}`);
    } finally {
      setQualifyingId(null);
    }
  };

  // Action: Open Scorecard Modal
  const handleOpenScorecard = async (requestId: string) => {
    try {
      setIsScorecardOpen(true);
      setScorecardLoading(true);
      const res = await fetch(
        `http://127.0.0.1:8000/api/v1/recruitment/requests/${requestId}/scorecard`
      );
      if (!res.ok) {
        throw new Error("Unable to retrieve candidate scorecard.");
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

  // Action: Open Activation Modal
  const handleOpenActivation = (candidate: RecruitmentRequest) => {
    setSelectedCandidate(candidate);
    setCustomTitle(candidate.role_name || "Specialist");
    setApprovalNotes(`Approved activation after passing sandbox benchmark ${candidate.benchmark_score || ""}%`);
    setActivationError(null);
    setIsActivationModalOpen(true);
  };

  // Action: Submit Activation
  const handleSubmitActivation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCandidate) return;

    try {
      setSubmittingActivation(true);
      setActivationError(null);

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
        throw new Error(errData.detail || "Activation approval failed.");
      }

      const activatedData = await res.json();
      setActivationSuccess(
        `Agent "${activatedData.agent_name}" has been successfully provisioned and activated into the active workforce!`
      );
      setIsActivationModalOpen(false);
      setIsScorecardOpen(false);
      await fetchData();
    } catch (err: any) {
      setActivationError(err.message || "Activation failed.");
    } finally {
      setSubmittingActivation(false);
    }
  };

  // Action: Submit New Request
  const handleSubmitNewRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoleId || !newName.trim() || !newRationale.trim()) {
      setCreateError("Please fill in all required fields.");
      return;
    }

    try {
      setSubmittingCreate(true);
      setCreateError(null);

      const skillsArray = newSkills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("http://127.0.0.1:8000/api/v1/recruitment/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role_id: newRoleId,
          proposed_agent_name: newName.trim(),
          rationale: newRationale.trim(),
          requested_by: newRequestedBy.trim() || "Engineering Supervisor",
          required_skills: skillsArray,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to create recruitment request.");
      }

      setIsCreateModalOpen(false);
      setNewName("");
      setNewRationale("");
      setNewSkills("");
      await fetchData();
    } catch (err: any) {
      setCreateError(err.message || "Submission failed.");
    } finally {
      setSubmittingCreate(false);
    }
  };

  const getStatusBadge = (status: string, score?: number) => {
    switch (status) {
      case "pending_approval":
        return <StatusBadge variant="warning" label="Pending Sandbox Qualification" />;
      case "qualifying":
        return <StatusBadge variant="info" label="Running Sandbox Benchmark..." />;
      case "qualified":
        return (
          <StatusBadge
            variant="success"
            label={`Qualified (${score ? score.toFixed(1) : "Pass"}%)`}
          />
        );
      case "activated":
        return <StatusBadge variant="neutral" label="Active Workforce" />;
      case "rejected":
        return <StatusBadge variant="danger" label="Rejected" />;
      default:
        return <StatusBadge variant="neutral" label={status} />;
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Recruitment Center"
        description="Demand analysis, automated sandbox qualification benchmarks, and dual-key supervisor activation."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Recruitment" },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(true);
                setCreateError(null);
              }}
              leftIcon={<UserPlus className="w-3.5 h-3.5" />}
            >
              New Recruitment Request
            </Button>
          </div>
        }
      />

      {activationSuccess && (
        <div className="mb-4 p-4 rounded-md bg-[#16794B]/10 border border-[#16794B]/30 text-status-success flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            <span className="text-xs font-medium">{activationSuccess}</span>
          </div>
          <button
            onClick={() => setActivationSuccess(null)}
            className="text-textMuted-light hover:text-textPrimary-light text-xs font-semibold ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Demand Analysis Banner & Metrics */}
      {demand && (
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-4">
              <span className="text-xs text-textMuted-light dark:text-textMuted-dark block">
                Active Projects
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-mono">
                  {demand.total_active_projects}
                </span>
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                  in Scrum delivery
                </span>
              </div>
            </div>

            <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-4">
              <span className="text-xs text-textMuted-light dark:text-textMuted-dark block">
                Active Work Items
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-mono">
                  {demand.total_active_work_items}
                </span>
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                  {demand.unassigned_work_items} unassigned
                </span>
              </div>
            </div>

            <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-4">
              <span className="text-xs text-textMuted-light dark:text-textMuted-dark block">
                Current Workforce
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className="text-2xl font-bold font-mono">
                  {demand.active_workforce_agents}
                </span>
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                  / {demand.total_workforce_agents} total agents
                </span>
              </div>
            </div>

            <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-4">
              <span className="text-xs text-textMuted-light dark:text-textMuted-dark block">
                Skill Bottlenecks
              </span>
              <div className="flex items-baseline space-x-2 mt-1">
                <span className={`text-2xl font-bold font-mono ${demand.bottlenecks.length > 0 ? "text-status-warning" : "text-status-success"}`}>
                  {demand.bottlenecks.length}
                </span>
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                  critical skill gaps
                </span>
              </div>
            </div>
          </div>

          {/* Explainable Demand Recommendations */}
          <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-accent" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-textPrimary-light dark:text-textPrimary-dark">
                  Workforce Demand Intelligence & Staffing Advice
                </h3>
              </div>
              <span className="text-[11px] font-mono text-textMuted-light dark:text-textMuted-dark">
                Policy Basis: POL-AGENT-RECRUITMENT-V1
              </span>
            </div>

            {demand.recommendations.map((rec, idx) => (
              <div
                key={idx}
                className="p-3 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-accent font-mono uppercase text-[11px] px-1.5 py-0.5 rounded bg-accent/10 border border-accent/20">
                      {rec.action.replace(/_/g, " ")}
                    </span>
                    {rec.target_role_name && (
                      <span className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                        Target Role: {rec.target_role_name}
                      </span>
                    )}
                    <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                      Confidence: {(rec.confidence_score * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                    {rec.rationale}
                  </p>
                  {rec.suggested_skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {rec.suggested_skills.map((s, sIdx) => (
                        <span
                          key={sIdx}
                          className="px-1.5 py-0.5 rounded text-[10px] bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {rec.action === "RECRUIT_NEW_AGENT" && rec.target_role_id && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-shrink-0"
                    onClick={() => {
                      setNewRoleId(rec.target_role_id || "");
                      setNewSkills(rec.suggested_skills.join(", "));
                      setNewRationale(rec.rationale);
                      setIsCreateModalOpen(true);
                    }}
                  >
                    Draft Request for {rec.target_role_name}
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Requests Management Section */}
      <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark overflow-hidden">
        {/* Controls Toolbar */}
        <div className="p-4 border-b border-borderBase-light dark:border-borderBase-dark flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <h2 className="text-sm font-semibold">Candidate Pipeline & Qualification Benchmarks</h2>
            <span className="text-xs px-2 py-0.5 rounded-full bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-mono text-textMuted-light dark:text-textMuted-dark">
              {filteredRequests.length}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search candidate or skill..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-2.5 py-1 text-xs rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent w-48"
            />

            <div className="flex items-center border border-borderBase-light dark:border-borderBase-dark rounded overflow-hidden text-xs">
              {["all", "pending_approval", "qualified", "activated", "rejected"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1 transition-colors ${
                    statusFilter === st
                      ? "bg-accent text-white font-medium"
                      : "bg-surface-light dark:bg-surface-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light"
                  }`}
                >
                  {st === "all"
                    ? "All"
                    : st === "pending_approval"
                    ? "Pending"
                    : st === "qualified"
                    ? "Qualified"
                    : st === "activated"
                    ? "Activated"
                    : "Rejected"}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* List / Table */}
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={4} />
          </div>
        ) : error ? (
          <div className="p-6">
            <ErrorState
              title="Unable to load recruitment requests"
              message={error}
              onRetry={fetchData}
            />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No recruitment requests found"
              description={
                searchTerm || statusFilter !== "all"
                  ? "No candidate matches the selected filters."
                  : "Submit a new candidate request to begin sandbox benchmark qualification."
              }
              actionLabel="Create Request"
              onAction={() => setIsCreateModalOpen(true)}
            />
          </div>
        ) : (
          <div className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
            {filteredRequests.map((req) => (
              <div
                key={req.id}
                className="p-4 hover:bg-canvas-light dark:hover:bg-canvas-dark transition-colors flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Candidate Overview */}
                <div className="space-y-1.5 max-w-xl">
                  <div className="flex items-center space-x-2">
                    <span className="font-mono text-xs px-1.5 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
                      {req.id}
                    </span>
                    <span className="font-semibold text-sm text-textPrimary-light dark:text-textPrimary-dark">
                      {req.proposed_agent_name}
                    </span>
                    <span className="text-xs text-textMuted-light dark:text-textMuted-dark">
                      • {req.role_name || "Specialist Role"} ({req.department_name || "Engineering"})
                    </span>
                  </div>

                  <p className="text-xs text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                    {req.rationale}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {req.required_skills.map((skill, sIdx) => (
                      <span
                        key={sIdx}
                        className="px-2 py-0.5 rounded text-[11px] bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textPrimary-light dark:text-textPrimary-dark"
                      >
                        {skill}
                      </span>
                    ))}
                    <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark ml-2">
                      Requested by {req.requested_by} • {new Date(req.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Status & Actions */}
                <div className="flex flex-col md:items-end space-y-2 flex-shrink-0">
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(req.status, req.benchmark_score)}
                  </div>

                  <div className="flex items-center space-x-2 pt-1">
                    {req.status === "pending_approval" && (
                      <Button
                        size="sm"
                        variant="primary"
                        isLoading={qualifyingId === req.id}
                        onClick={() => handleRunQualification(req.id)}
                        leftIcon={<Play className="w-3 h-3" />}
                      >
                        Run Sandbox Benchmark
                      </Button>
                    )}

                    {req.qualification_run_id && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenScorecard(req.id)}
                        leftIcon={<Award className="w-3 h-3" />}
                      >
                        Scorecard ({req.benchmark_score ? req.benchmark_score.toFixed(1) : "0"}%)
                      </Button>
                    )}

                    {req.status === "qualified" && (
                      <Button
                        size="sm"
                        variant="primary"
                        onClick={() => handleOpenActivation(req)}
                        leftIcon={<Check className="w-3 h-3" />}
                      >
                        Approve & Activate
                      </Button>
                    )}

                    {req.status === "activated" && (
                      <Link href="/workforce">
                        <Button
                          size="sm"
                          variant="ghost"
                          leftIcon={<ExternalLink className="w-3 h-3" />}
                        >
                          View in Workforce
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Qualification Scorecard Modal */}
      {isScorecardOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark rounded-lg max-w-2xl w-full shadow-xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Award className="w-5 h-5 text-accent" />
                <div>
                  <h3 className="text-sm font-semibold">
                    Sandbox Qualification Scorecard
                  </h3>
                  <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Automated 4-stage empirical verification & provenance
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

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {scorecardLoading ? (
                <div className="py-12 text-center text-textMuted-light">
                  <div className="animate-spin text-accent text-xl mb-2">◓</div>
                  Evaluating qualification sandbox run...
                </div>
              ) : activeScorecard ? (
                <>
                  {/* Candidate Summary */}
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
                      <div className="flex items-baseline space-x-1 justify-end">
                        <span className={`text-2xl font-bold font-mono ${activeScorecard.is_passed ? "text-status-success" : "text-status-danger"}`}>
                          {activeScorecard.overall_score.toFixed(1)}%
                        </span>
                      </div>
                      <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                        Threshold: {activeScorecard.passing_threshold}% (
                        {activeScorecard.is_passed ? "PASSED" : "FAILED"})
                      </span>
                    </div>
                  </div>

                  {/* Stage-by-Stage Breakdown */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">
                      Qualification Stage Results
                    </h4>

                    <div className="space-y-2">
                      {activeScorecard.stages.map((st, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              {st.status === "passed" ? (
                                <CheckCircle2 className="w-4 h-4 text-status-success" />
                              ) : (
                                <AlertCircle className="w-4 h-4 text-status-danger" />
                              )}
                              <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                                {st.stage_name}
                              </span>
                              <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                                (Weight: {(st.weight * 100).toFixed(0)}%)
                              </span>
                            </div>
                            <span className="font-mono font-bold text-accent">
                              {st.score.toFixed(1)}%
                            </span>
                          </div>

                          <div className="pl-6 text-[11px] text-textMuted-light dark:text-textMuted-dark">
                            {st.stage_name === "Deterministic Contract Validation" && (
                              <span>
                                Schema: {st.details.schema_valid ? "Valid" : "Invalid"} • Concurrency check: {st.details.max_concurrency_safe ? "Safe" : "Unsafe"}
                              </span>
                            )}
                            {st.stage_name === "Sandboxed Test Execution" && (
                              <span>
                                Automated tests: {st.details.tests_passed} passed, {st.details.tests_failed} failed • Duration: {st.details.execution_duration_sec}s
                              </span>
                            )}
                            {st.stage_name === "Domain Integrity Audit" && (
                              <span>
                                Invariant violations: {st.details.invariant_violations} • Security audit checks: {st.details.scanned_checkpoints} passed
                              </span>
                            )}
                            {st.stage_name === "Security & Policy Sandbox Check" && (
                              <span>
                                Tool isolation: {st.details.tool_execution_isolated ? "Enforced" : "Leaked"} • Policy basis: {st.details.policy_basis}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recommendation & Policy Notice */}
                  <div className="p-3 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-[11px] space-y-1">
                    <div className="flex items-center space-x-1.5 font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      <ShieldCheck className="w-3.5 h-3.5 text-accent" />
                      <span>Governance Recommendation</span>
                    </div>
                    <p className="text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                      {activeScorecard.recommendation}
                    </p>
                    <span className="text-[10px] font-mono text-textMuted-light dark:text-textMuted-dark block pt-1">
                      Policy Basis: {activeScorecard.policy_basis} • Run ID: {activeScorecard.qualification_run_id}
                    </span>
                  </div>
                </>
              ) : null}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScorecardOpen(false)}
              >
                Close
              </Button>

              {activeScorecard && activeScorecard.is_passed && (
                <Button
                  size="sm"
                  onClick={() => {
                    const req = requests.find((r) => r.id === activeScorecard.request_id);
                    if (req) {
                      setIsScorecardOpen(false);
                      handleOpenActivation(req);
                    }
                  }}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Proceed to Activation
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Supervisor Dual-Key Activation Modal */}
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
                {activationError && (
                  <div className="p-3 rounded bg-status-danger/10 border border-status-danger/30 text-status-danger flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{activationError}</span>
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
                  <div className="flex flex-wrap gap-1 pt-1">
                    {selectedCandidate.required_skills.map((s, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.5 rounded text-[10px] bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
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

                <p className="text-[10px] text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                  Notice: Activation creates an official <code className="font-mono">AIAgent</code> entity, registers Profile Version 1 with snapshot configuration, stamps verified skills with empirical test evidence, and logs an immutable audit event under policy <code className="font-mono text-accent">POL-AGENT-ACTIVATION-V1</code>.
                </p>
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

      {/* New Recruitment Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark rounded-lg max-w-lg w-full shadow-xl overflow-hidden">
            <form onSubmit={handleSubmitNewRequest}>
              <div className="p-4 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <UserPlus className="w-5 h-5 text-accent" />
                  <div>
                    <h3 className="text-sm font-semibold">
                      Submit Agent Recruitment Request
                    </h3>
                    <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                      Initiate candidate pipeline and qualification sandbox
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="text-textMuted-light hover:text-textPrimary-light p-1 rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-6 space-y-4 text-xs">
                {createError && (
                  <div className="p-3 rounded bg-status-danger/10 border border-status-danger/30 text-status-danger flex items-center space-x-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{createError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Job Role *
                  </label>
                  <select
                    required
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs"
                  >
                    <option value="">Select organizational role...</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name} ({r.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Proposed Agent Identity Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs"
                    placeholder="e.g. Apex, Cipher, Sentinel, Aegis"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Staffing Rationale & Business Justification *
                  </label>
                  <textarea
                    required
                    rows={3}
                    value={newRationale}
                    onChange={(e) => setNewRationale(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs"
                    placeholder="Describe workload bottleneck, sprint deliverables, or capacity requirement (min 5 chars)..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Required Candidate Skills (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newSkills}
                    onChange={(e) => setNewSkills(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs"
                    placeholder="e.g. FastAPI, SQLAlchemy, SQLite WAL, Threat Modeling"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-medium text-textPrimary-light dark:text-textPrimary-dark">
                    Requested By
                  </label>
                  <input
                    type="text"
                    value={newRequestedBy}
                    onChange={(e) => setNewRequestedBy(e.target.value)}
                    className="w-full px-3 py-1.5 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent text-xs"
                  />
                </div>
              </div>

              <div className="p-4 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={submittingCreate}
                  leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                >
                  Submit Recruitment Request
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
