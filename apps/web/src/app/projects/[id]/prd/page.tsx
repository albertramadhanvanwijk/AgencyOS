"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { AppShell } from "../../../../components/layout/AppShell";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { StatusBadge, StatusVariant } from "../../../../components/ui/StatusBadge";
import { Button } from "../../../../components/ui/Button";
import { TableSkeleton } from "../../../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../../../components/ui/ErrorState";
import {
  FileText,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Layers,
  Kanban,
  ListTodo,
  BarChart2,
  ExternalLink,
  Github,
  Compass,
  Users,
  Route,
  CheckSquare,
  ShieldAlert,
  Cpu,
  BookmarkCheck,
  Send
} from "lucide-react";

interface TargetUserPersona {
  persona: string;
  description: string;
  needs: string[];
}

interface UserJourney {
  title: string;
  actor: string;
  steps: string[];
}

interface FunctionalRequirement {
  id: string;
  module: string;
  title: string;
  description: string;
  priority: string;
  criteria: string[];
}

interface NonFunctionalRequirement {
  category: string;
  requirement: string;
}

interface ScopeBoundaries {
  in_scope: string[];
  out_of_scope: string[];
}

interface TechStackRecommendation {
  frontend: string;
  backend: string;
  database: string;
  tools: string[];
}

interface InterviewQA {
  question: string;
  answer: string;
}

interface ProjectPRD {
  id: string;
  project_id: string;
  version: number;
  status: "draft" | "in_review" | "approved";
  executive_summary?: string;
  target_users: TargetUserPersona[];
  user_journeys: UserJourney[];
  functional_requirements: FunctionalRequirement[];
  non_functional_requirements: NonFunctionalRequirement[];
  scope_boundaries: ScopeBoundaries;
  tech_stack_recommendation: TechStackRecommendation;
  interview_answers?: InterviewQA[];
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

interface Project {
  id: string;
  name: string;
  key: string;
  goal?: string;
  status: string;
  workspace_path: string;
  github_repo_url?: string;
  github_repo_name?: string;
}

interface DiscoveryQuestion {
  id: string;
  category: string;
  question: string;
  placeholder: string;
  default_hint: string;
}

export default function ProjectPRDPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<Project | null>(null);
  const [prd, setPrd] = useState<ProjectPRD | null>(null);
  const [questions, setQuestions] = useState<DiscoveryQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);

  const fetchPRDData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [projRes, prdRes, qRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/prd`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/prd/discovery`),
      ]);

      if (!projRes.ok || !prdRes.ok) {
        throw new Error("Gagal mengambil data proyek dan dokumen PRD.");
      }

      const projData = await projRes.json();
      const prdData = await prdRes.json();
      setProject(projData);
      setPrd(prdData);

      if (qRes.ok) {
        const qData: DiscoveryQuestion[] = await qRes.json();
        setQuestions(qData);
        // Pre-fill answers from saved interview if available
        if (prdData.interview_answers && Array.isArray(prdData.interview_answers)) {
          const map: Record<string, string> = {};
          prdData.interview_answers.forEach((item: InterviewQA) => {
            const foundQ = qData.find((q) => q.question === item.question);
            if (foundQ) map[foundQ.id] = item.answer;
          });
          setAnswers(map);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan memuat data PRD.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchPRDData();
  }, [fetchPRDData]);

  const handleGeneratePRD = async () => {
    try {
      setGenerating(true);
      setError(null);
      setActionSuccess(null);

      const formattedAnswers: InterviewQA[] = questions
        .filter((q) => answers[q.id] && answers[q.id].trim().length > 0)
        .map((q) => ({
          question: q.question,
          answer: answers[q.id].trim(),
        }));

      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/prd/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          interview_answers: formattedAnswers.length > 0 ? formattedAnswers : undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Gagal menghasilkan dokumen PRD.");
      }

      const updatedPRD = await res.json();
      setPrd(updatedPRD);
      setIsDiscoveryOpen(false);
      setActionSuccess("Dewi Lestari berhasil merumuskan Dokumen PRD resmi! Silakan tinjau kriteria teknis sebelum persetujuan.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyusun dokumen PRD.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApprovePRD = async () => {
    try {
      setApproving(true);
      setError(null);

      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/prd/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: "Albert (Project Owner)" }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Gagal menyetujui dokumen PRD.");
      }

      const approvedData = await res.json();
      setPrd(approvedData);
      setActionSuccess("Dokumen Kebutuhan Produk (PRD) resmi disetujui! Spesifikasi kini terkunci sebagai acuan baku proyek.");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal menyetujui PRD.");
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadgeVariant = (st: string): StatusVariant => {
    switch (st) {
      case "approved":
        return "success";
      case "in_review":
        return "warning";
      case "draft":
      default:
        return "neutral";
    }
  };

  const hasContent = prd && prd.functional_requirements && prd.functional_requirements.length > 0;

  return (
    <AppShell>
      <PageHeader
        title={project?.name || "Project PRD"}
        description={`Spesifikasi Kebutuhan Resmi (Product Requirement Document) • ${project?.key || "PROJ"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: project?.name || "Project", href: `/projects/${projectId}/prd` },
          { label: "Dokumen Kebutuhan (PRD)" },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            {project?.github_repo_url && (
              <a
                href={project.github_repo_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md text-xs font-mono font-semibold bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark hover:border-accent text-accent transition-colors"
              >
                <Github className="w-3.5 h-3.5" />
                <span>{project.github_repo_name || "Repo"}</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
            <Button variant="outline" size="sm" onClick={fetchPRDData} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDiscoveryOpen(true)}
              leftIcon={<HelpCircle className="w-3.5 h-3.5 text-accent" />}
            >
              Interview Tanya-Jawab
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGeneratePRD}
              isLoading={generating}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              {hasContent ? "Generate Ulang PRD" : "AI Susun PRD (Dewi)"}
            </Button>
          </div>
        }
      />

      {/* Modern Unified 5-Stage Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-borderBase-light dark:border-borderBase-dark pb-3 overflow-x-auto">
        <Link
          href={`/projects/${projectId}/prd`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent/10 text-accent border border-accent/20 transition-colors shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>1. Dokumen PRD</span>
        </Link>
        <Link
          href={`/projects/${projectId}/architecture`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
        >
          <Layers className="w-4 h-4" />
          <span>2. Arsitektur & Desain</span>
        </Link>
        <Link
          href={`/projects/${projectId}/backlog`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
        >
          <ListTodo className="w-4 h-4" />
          <span>3. Backlog & Sprints</span>
        </Link>
        <Link
          href={`/projects/${projectId}/board`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
        >
          <Kanban className="w-4 h-4" />
          <span>4. Papan Scrum (Board)</span>
        </Link>
        <Link
          href={`/projects/${projectId}/analytics`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
        >
          <BarChart2 className="w-4 h-4" />
          <span>5. Analitik & Retro</span>
        </Link>
      </div>

      {/* Notifications */}
      {error && (
        <div className="p-3.5 rounded-lg bg-status-danger/10 border border-status-danger/30 text-xs text-status-danger flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="font-semibold underline ml-2">Tutup</button>
        </div>
      )}

      {actionSuccess && (
        <div className="p-3.5 rounded-lg bg-status-success/10 border border-status-success/30 text-xs text-status-success flex items-center justify-between animate-in fade-in">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="font-semibold underline ml-2">Tutup</button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={6} />
      ) : !hasContent ? (
        /* Empty / Draft State: Prompt for Discovery & Generation */
        <div className="p-8 sm:p-12 rounded-xl border border-dashed border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark text-center space-y-5 max-w-2xl mx-auto my-6">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 text-accent flex items-center justify-center mx-auto shadow-inner">
            <FileText className="w-7 h-7" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark">
              Dokumen Spesifikasi Kebutuhan (PRD) Belum Dirumuskan
            </h3>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark leading-relaxed max-w-lg mx-auto">
              Sesuai standar SDLC & Scrum, proyek tidak boleh langsung dikoding tanpa spesifikasi baku.
              Biarkan <strong>Dewi Lestari (Technical Product Owner)</strong> menyusun Dokumen PRD resmi lengkap dengan kriteria fungsional, batasan ruang lingkup, dan acceptance criteria.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setIsDiscoveryOpen(true)}
              leftIcon={<HelpCircle className="w-4 h-4 text-accent" />}
            >
              Buka Tanya-Jawab Discovery
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={handleGeneratePRD}
              isLoading={generating}
              leftIcon={<Sparkles className="w-4 h-4" />}
            >
              Generate Dokumen PRD Otomatis →
            </Button>
          </div>
        </div>
      ) : (
        /* Render Full Professional PRD Document */
        <div className="space-y-6 max-w-5xl mx-auto pb-12">
          {/* Document Header Card */}
          <div className="p-5 sm:p-6 rounded-xl bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <div className="flex items-center space-x-3">
                  <h1 className="text-xl font-bold text-textPrimary-light dark:text-textPrimary-dark">
                    Product Requirement Document (PRD)
                  </h1>
                  <StatusBadge
                    variant={getStatusBadgeVariant(prd.status)}
                    label={
                      prd.status === "approved"
                        ? "Approved (Signed Off)"
                        : prd.status === "in_review"
                        ? "In Review"
                        : "Draft"
                    }
                  />
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark">
                    v{prd.version}.0
                  </span>
                </div>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark mt-1">
                  Spesifikasi resmi proyek <strong>{project?.name}</strong> • Diperbarui pada{" "}
                  {new Date(prd.updated_at).toLocaleDateString("id-ID", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              {/* Approval Action Button */}
              {prd.status !== "approved" ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={handleApprovePRD}
                  isLoading={approving}
                  leftIcon={<ShieldCheck className="w-4 h-4" />}
                >
                  Setujui Dokumen PRD (Sign-Off) →
                </Button>
              ) : (
                <div className="flex items-center space-x-2 text-xs font-mono text-status-success bg-status-success/10 border border-status-success/30 px-3 py-1.5 rounded-lg">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    Disetujui oleh <strong>{prd.approved_by || "Project Owner"}</strong>
                  </span>
                </div>
              )}
            </div>

            {/* Executive Summary */}
            <div className="space-y-1.5 text-xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark block">
                1. Ringkasan Eksekutif & Sasaran Bisnis
              </span>
              <p className="text-textPrimary-light dark:text-textPrimary-dark leading-relaxed p-3.5 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark">
                {prd.executive_summary}
              </p>
            </div>
          </div>

          {/* Section 2: Target Users & Personas */}
          <div className="p-5 sm:p-6 rounded-xl bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark">
              <Users className="w-4 h-4 text-accent" />
              <span>2. Target Pengguna & Karakter Persona</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {prd.target_users.map((u, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark space-y-2 text-xs"
                >
                  <span className="font-semibold text-accent block">{u.persona}</span>
                  <p className="text-textMuted-light dark:text-textMuted-dark leading-relaxed">{u.description}</p>
                  <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark block">
                      Kebutuhan Kunci:
                    </span>
                    <ul className="list-disc list-inside space-y-0.5 text-textPrimary-light dark:text-textPrimary-dark text-[11px]">
                      {u.needs.map((need, nIdx) => (
                        <li key={nIdx}>{need}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: User Journeys */}
          <div className="p-5 sm:p-6 rounded-xl bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark shadow-xs space-y-4">
            <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark">
              <Route className="w-4 h-4 text-accent" />
              <span>3. Alur Pengguna (User Journeys)</span>
            </div>
            <div className="space-y-3">
              {prd.user_journeys.map((j, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">{j.title}</span>
                    <span className="font-mono text-[11px] text-accent font-medium">Aktor: {j.actor}</span>
                  </div>
                  <div className="space-y-1.5 pl-2 border-l-2 border-accent/40">
                    {j.steps.map((st, sIdx) => (
                      <div key={sIdx} className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                        <span className="font-mono font-semibold text-accent mr-2">{sIdx + 1}.</span>
                        {st}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 4: Functional Requirements (Core Table) */}
          <div className="p-5 sm:p-6 rounded-xl bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                <CheckSquare className="w-4 h-4 text-accent" />
                <span>4. Kebutuhan Fungsional (Functional Requirements)</span>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                {prd.functional_requirements.length} Spesifikasi Fungsional
              </span>
            </div>

            <div className="space-y-3">
              {prd.functional_requirements.map((fr) => (
                <div
                  key={fr.id}
                  className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-accent bg-accent/15 px-2 py-0.5 rounded text-[11px]">
                        {fr.id}
                      </span>
                      <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                        {fr.title}
                      </span>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.2 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark">
                        {fr.module}
                      </span>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded ${
                        fr.priority === "critical"
                          ? "bg-status-danger/15 text-status-danger border border-status-danger/25"
                          : "bg-status-warning/15 text-status-warning border border-status-warning/25"
                      }`}
                    >
                      {fr.priority}
                    </span>
                  </div>
                  <p className="text-textMuted-light dark:text-textMuted-dark leading-relaxed pl-1">
                    {fr.description}
                  </p>
                  <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark space-y-1 pl-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark block">
                      Acceptance Criteria (DoD Checkpoint):
                    </span>
                    <div className="space-y-1">
                      {fr.criteria.map((cr, cIdx) => (
                        <div key={cIdx} className="flex items-start gap-2 text-[11px]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-status-success shrink-0 mt-0.5" />
                          <span className="text-textPrimary-light dark:text-textPrimary-dark">{cr}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 5: Non-Functional & Scope Boundaries Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Non-Functional Specs */}
            <div className="p-5 rounded-xl bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark shadow-xs space-y-3 text-xs">
              <div className="flex items-center space-x-2 font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                <ShieldAlert className="w-4 h-4 text-accent" />
                <span>5. Kebutuhan Non-Fungsional (NFR)</span>
              </div>
              <div className="space-y-2">
                {prd.non_functional_requirements.map((nfr, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark space-y-0.5"
                  >
                    <span className="font-semibold text-accent block text-[11px]">{nfr.category}</span>
                    <span className="text-textMuted-light dark:text-textMuted-dark text-[11px] leading-relaxed block">
                      {nfr.requirement}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Scope Boundaries */}
            <div className="p-5 rounded-xl bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark shadow-xs space-y-3 text-xs">
              <div className="flex items-center space-x-2 font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                <BookmarkCheck className="w-4 h-4 text-accent" />
                <span>6. Batasan Ruang Lingkup (Scope)</span>
              </div>
              <div className="space-y-2">
                <div className="p-2.5 rounded bg-status-success/10 border border-status-success/25 space-y-1">
                  <span className="font-bold text-status-success block text-[11px]">✓ Dalam Ruang Lingkup (In Scope):</span>
                  <ul className="list-disc list-inside space-y-0.5 text-textPrimary-light dark:text-textPrimary-dark text-[11px]">
                    {prd.scope_boundaries.in_scope.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="p-2.5 rounded bg-status-danger/10 border border-status-danger/25 space-y-1">
                  <span className="font-bold text-status-danger block text-[11px]">✗ Di Luar Ruang Lingkup (Out of Scope):</span>
                  <ul className="list-disc list-inside space-y-0.5 text-textMuted-light dark:text-textMuted-dark text-[11px]">
                    {prd.scope_boundaries.out_of_scope.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>

          {/* Section 7: Recommended Tech Stack */}
          <div className="p-5 rounded-xl bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark shadow-xs space-y-3 text-xs">
            <div className="flex items-center space-x-2 font-semibold text-textPrimary-light dark:text-textPrimary-dark">
              <Cpu className="w-4 h-4 text-accent" />
              <span>7. Rekomendasi Arsitektur & Tech Stack</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark">
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark uppercase block font-mono">Frontend</span>
                <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark text-[11px] mt-0.5 block">
                  {prd.tech_stack_recommendation.frontend}
                </span>
              </div>
              <div className="p-3 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark">
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark uppercase block font-mono">Backend API</span>
                <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark text-[11px] mt-0.5 block">
                  {prd.tech_stack_recommendation.backend}
                </span>
              </div>
              <div className="p-3 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark">
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark uppercase block font-mono">Database</span>
                <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark text-[11px] mt-0.5 block">
                  {prd.tech_stack_recommendation.database}
                </span>
              </div>
              <div className="p-3 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark">
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark uppercase block font-mono">Quality & CI/CD</span>
                <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark text-[11px] mt-0.5 block">
                  {prd.tech_stack_recommendation.tools.join(", ")}
                </span>
              </div>
            </div>
          </div>

          {/* Next Step Transition Banner */}
          {prd.status === "approved" && (
            <div className="p-4 rounded-xl bg-status-success/10 border border-status-success/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="w-5 h-5 text-status-success shrink-0" />
                <span className="text-textPrimary-light dark:text-textPrimary-dark font-medium">
                  PRD telah disetujui. Langkah selanjutnya: Masuk ke tahap <strong>Backlog & Sprints</strong> untuk meninjau dekomposisi cerita pengguna!
                </span>
              </div>
              <Link href={`/projects/${projectId}/backlog`}>
                <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                  Lanjut ke Backlog & Sprints →
                </Button>
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Discovery Interview Modal */}
      {isDiscoveryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in overflow-hidden">
            <div className="flex items-start justify-between p-5 pb-3 border-b border-borderBase-light dark:border-borderBase-dark shrink-0">
              <div className="flex items-center space-x-2.5">
                <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold shrink-0">
                  <Compass className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                    Wawancara Discovery Kebutuhan (Dewi Lestari)
                  </h3>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Bantu Technical Product Owner memahami sasaran proyek Anda secara presisi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsDiscoveryOpen(false)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                ✕
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="p-3 rounded-lg bg-accent/10 border border-accent/25 text-accent text-[11px] leading-relaxed">
                💡 <em>Tips:</em> Jawaban Anda akan digunakan Dewi Lestari untuk merumuskan Persona, Kebutuhan Fungsional (FR), kriteria pengujian mutu, dan batasan ruang lingkup secara otomatis.
              </div>

              {questions.map((q, idx) => (
                <div key={q.id} className="space-y-1.5 p-3 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      {idx + 1}. {q.category}
                    </span>
                    <span className="text-[10px] font-mono text-textMuted-light dark:text-textMuted-dark">Opsional / Hint</span>
                  </div>
                  <p className="text-textMuted-light dark:text-textMuted-dark text-[11px] leading-relaxed">
                    {q.question}
                  </p>
                  <textarea
                    rows={2}
                    value={answers[q.id] || ""}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder={q.placeholder}
                    className="w-full p-2.5 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-xs text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between shrink-0 bg-surface-light dark:bg-surface-dark">
              <Button size="sm" variant="outline" onClick={() => setIsDiscoveryOpen(false)}>
                Batal
              </Button>
              <Button
                size="sm"
                variant="primary"
                onClick={handleGeneratePRD}
                isLoading={generating}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Simpan & Generate PRD →
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
