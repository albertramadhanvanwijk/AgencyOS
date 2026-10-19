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
  Plus,
  FolderKanban,
  GitBranch,
  ArrowRight,
  X,
  Target,
  Layers,
  FileText,
  ListTodo,
  CheckCircle2,
  Github,
  ExternalLink,
  Lock,
  Globe,
  Sparkles,
  ShieldCheck,
  Bot,
  Clock,
  Users,
  Check,
  RotateCcw,
} from "lucide-react";

interface Project {
  id: string;
  name: string;
  key: string;
  goal?: string;
  status: string;
  workspace_path: string;
  item_counter: number;
  github_repo_url?: string;
  github_repo_name?: string;
  github_repo_mode?: string;
  github_branch?: string;
  active_sprint_name?: string;
  total_items: number;
  done_items: number;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GitHub Integration State
  const [githubStatus, setGithubStatus] = useState<{
    authenticated: boolean;
    username?: string;
    avatar_url?: string;
  } | null>(null);

  // Create Project Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectGoal, setProjectGoal] = useState("");

  // Workflow & AI Planning State
  const [planningMode, setPlanningMode] = useState<"sdlc_full" | "auto_fast">("sdlc_full");
  const [pipelineStage, setPipelineStage] = useState<"form" | "pipeline" | "completed">("form");
  const [pipelineStep, setPipelineStep] = useState<number>(0);
  const [createdProject, setCreatedProject] = useState<Project | null>(null);
  const [pipelineResult, setPipelineResult] = useState<any>(null);

  // GitHub repo options
  const [repoMode, setRepoMode] = useState<"auto_create" | "existing" | "local">("auto_create");
  const [customRepoName, setCustomRepoName] = useState("");
  const [existingRepoUrl, setExistingRepoUrl] = useState("");
  const [isPrivateRepo, setIsPrivateRepo] = useState(true);
  const [createCiWorkflow, setCreateCiWorkflow] = useState(true);

  const resetModal = () => {
    setIsModalOpen(false);
    setPipelineStage("form");
    setPipelineStep(0);
    setCreatedProject(null);
    setPipelineResult(null);
    setProjectName("");
    setProjectKey("");
    setProjectGoal("");
    setCustomRepoName("");
    setExistingRepoUrl("");
    setModalError(null);
  };

  const fetchGithubStatus = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/v1/projects/integrations/github/status");
      if (res.ok) {
        const data = await res.json();
        setGithubStatus(data);
        if (!data.authenticated) {
          setRepoMode("local");
        }
      }
    } catch {
      setRepoMode("local");
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://127.0.0.1:8000/api/v1/projects");
      if (!res.ok) throw new Error("Failed to load projects.");
      const data = await res.json();
      setProjects(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchGithubStatus();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectKey.trim()) return;

    try {
      setSubmitting(true);
      setModalError(null);
      const payload: Record<string, any> = {
        name: projectName.trim(),
        key: projectKey.trim().toUpperCase(),
        goal: projectGoal.trim() || undefined,
        status: "active",
        github_repo_mode: repoMode,
      };

      if (repoMode === "auto_create") {
        if (customRepoName.trim()) payload.github_repo_name = customRepoName.trim();
        payload.is_private_repo = isPrivateRepo;
        payload.create_ci_workflow = createCiWorkflow;
      } else if (repoMode === "existing") {
        payload.github_repo_url = existingRepoUrl.trim();
        payload.github_repo_name = customRepoName.trim() || existingRepoUrl.trim().replace(/^https?:\/\/github\.com\//, "").replace(/\.git$/, "");
      }

      const res = await fetch("http://127.0.0.1:8000/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to create project");
      }

      const newProj = await res.json();
      setCreatedProject(newProj);

      if (planningMode === "sdlc_full") {
        // SDLC Full Discovery Flow: guide user to PRD & Discovery
        setPipelineStage("completed");
        await fetchProjects();
        return;
      }

      // Enter Fast-Track Auto-Plan Pipeline Stage
      setPipelineStage("pipeline");
      setPipelineStep(1);

      // Trigger progressive step animation
      setTimeout(() => setPipelineStep(2), 700);
      setTimeout(() => setPipelineStep(3), 1500);
      setTimeout(() => setPipelineStep(4), 2200);

      const planRes = await fetch(`http://127.0.0.1:8000/api/v1/projects/${newProj.id}/pm/auto-plan`, {
        method: "POST",
      });

      if (!planRes.ok) {
        const planErr = await planRes.json();
        throw new Error(planErr.detail || "Gagal menjalankan auto-planning.");
      }

      const planData = await planRes.json();
      setPipelineResult(planData);

      setTimeout(() => {
        setPipelineStep(5);
        setTimeout(() => {
          setPipelineStage("completed");
          fetchProjects();
        }, 700);
      }, 3000);

    } catch (err: unknown) {
      if (err instanceof Error) {
        setModalError(err.message);
      } else {
        setModalError("Failed to create project");
      }
      setPipelineStage("form");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Projects & Scrum"
        description="Project repositories, isolated workspaces, Scrum backlogs, and sprint execution."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Projects" },
        ]}
        actions={
          <Button size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            New Project
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProjects} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects configured"
          description="Create your first project workspace to begin managing sprints and backlog items."
          actionLabel="Create Project"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const completionPercent =
              proj.total_items > 0
                ? Math.round((proj.done_items / proj.total_items) * 100)
                : 0;

            return (
              <div
                key={proj.id}
                className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-semibold text-accent">
                        {proj.key}
                      </span>
                      <StatusBadge
                        variant={proj.status === "active" ? "success" : "neutral"}
                        label={proj.active_sprint_name || "Planning"}
                      />
                      {proj.github_repo_url && (
                        <a
                          href={proj.github_repo_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-[11px] font-mono text-textPrimary-light dark:text-textPrimary-dark hover:text-accent hover:border-accent transition-colors"
                          title="Buka repository di GitHub"
                        >
                          <Github className="w-3 h-3 text-textPrimary-light dark:text-textPrimary-dark" />
                          <span className="truncate max-w-[130px]">
                            {proj.github_repo_name || proj.github_repo_url.replace("https://github.com/", "")}
                          </span>
                          <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                        </a>
                      )}
                    </div>
                    <h2 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      {proj.name}
                    </h2>
                  </div>
                </div>

                <p className="text-xs text-textMuted-light dark:text-textMuted-dark line-clamp-2">
                  {proj.goal || "No specific mission goal defined."}
                </p>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-textMuted-light dark:text-textMuted-dark text-[11px]">Sprint Progress</span>
                    <span className="font-mono tabular-nums text-textPrimary-light dark:text-textPrimary-dark text-[11px]">
                      {proj.done_items} of {proj.total_items} items Done ({completionPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark rounded-full overflow-hidden border border-borderBase-light dark:border-borderBase-dark">
                    <div
                      className="h-full bg-status-success transition-all duration-300"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between text-xs flex-wrap gap-2">
                  <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span className="font-mono text-[11px] truncate max-w-[140px]">
                      {proj.workspace_path}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-1.5">
                    <Link
                      href={`/projects/${proj.id}/prd`}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark hover:border-accent hover:text-accent transition-colors"
                      title="Tahap 1: Dokumen PRD & Wawancara Discovery"
                    >
                      1. PRD
                    </Link>
                    <Link
                      href={`/projects/${proj.id}/architecture`}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark hover:border-accent hover:text-accent transition-colors"
                      title="Tahap 2: Arsitektur & Desain Sistem"
                    >
                      2. Arsitek
                    </Link>
                    <Link
                      href={`/projects/${proj.id}/backlog`}
                      className="px-2 py-1 rounded text-[11px] font-medium bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark hover:border-accent hover:text-accent transition-colors"
                      title="Tahap 3: Dekomposisi Backlog"
                    >
                      3. Backlog
                    </Link>
                    <Link href={`/projects/${proj.id}/board`}>
                      <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                        Board
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal with GitHub Integration */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          {pipelineStage === "form" ? (
            /* --- STAGE 1: PROJECT CONFIGURATION FORM --- */
            <form
              onSubmit={handleCreateProject}
              className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl max-h-[92vh] flex flex-col animate-in fade-in"
            >
              <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
                <div>
                  <h2 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                    Tambah Project Baru
                  </h2>
                  <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                    Inisialisasi workspace terisolasi, Git repository, dan perencanaan Agile.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {modalError && (
                <div className="p-2.5 rounded-lg bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs animate-in fade-in">
                  {modalError}
                </div>
              )}

              <div className="space-y-3.5 text-xs overflow-y-auto pr-1 flex-1">
                <div>
                  <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                    Nama Project *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. E-Commerce Customer Portal"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                    Project Key (Prefix Unik) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ECOM"
                    value={projectKey}
                    onChange={(e) => setProjectKey(e.target.value.replace(/[^a-zA-Z0-9-]/g, ""))}
                    className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono uppercase"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1 text-textPrimary-light dark:text-textPrimary-dark">
                    Target & Misi Strategis Proyek
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Tech stack, batasan arsitektur, dan objektif utama tim agen..."
                    value={projectGoal}
                    onChange={(e) => setProjectGoal(e.target.value)}
                    className="w-full p-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                  />
                </div>

                {/* SDLC Planning Strategy Selection */}
                <div className="space-y-2">
                  <label className="font-semibold block text-textPrimary-light dark:text-textPrimary-dark">
                    Metode Perencanaan Proyek
                  </label>

                  {/* Mode 1: Full SDLC & Discovery (Recommended) */}
                  <label className={`block p-3 rounded-lg border transition-all cursor-pointer text-xs ${
                    planningMode === "sdlc_full"
                      ? "border-accent bg-accent/5 dark:bg-accent/10 ring-1 ring-accent/30"
                      : "border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark"
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="planningMode"
                        checked={planningMode === "sdlc_full"}
                        onChange={() => setPlanningMode("sdlc_full")}
                        className="mt-0.5 text-accent focus:ring-accent"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-accent" />
                            <span>Alur Lengkap SDLC: Discovery PRD &amp; Arsitektur Desain</span>
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent text-white font-medium">Rekomendasi ⭐</span>
                        </div>
                        <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                          <strong>Maya Indrawati</strong> (UX Researcher &amp; Empathy) &amp; <strong>Satria Pratama</strong> (Business Analyst) akan memandu sesi discovery kebutuhan &amp; menyusun PRD. Selanjutnya diteruskan ke <strong>Aditya Pratama</strong> (Arsitek) &amp; <strong>Siti Rahma</strong> (Lead UI) sebelum dipecah ke Scrum Backlog.
                        </p>
                      </div>
                    </div>
                  </label>

                  {/* Mode 2: Fast-Track Auto-Plan */}
                  <label className={`block p-3 rounded-lg border transition-all cursor-pointer text-xs ${
                    planningMode === "auto_fast"
                      ? "border-accent bg-accent/5 dark:bg-accent/10 ring-1 ring-accent/30"
                      : "border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark"
                  }`}>
                    <div className="flex items-start gap-2.5">
                      <input
                        type="radio"
                        name="planningMode"
                        checked={planningMode === "auto_fast"}
                        onChange={() => setPlanningMode("auto_fast")}
                        className="mt-0.5 text-accent focus:ring-accent"
                      />
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                            Fast-Track Planning (Instan ke Board)
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">Instan</span>
                        </div>
                        <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                          Dewi Lestari langsung mendekomposisi 3 Sprint ke Papan Scrum tanpa sesi wawancara PRD &amp; Arsitektur mendalam terlebih dahulu.
                        </p>
                      </div>
                    </div>
                  </label>
                </div>

                {/* GitHub Repository Integration Section */}
                <div className="p-3.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs flex items-center gap-1.5 text-textPrimary-light dark:text-textPrimary-dark">
                      <Github className="w-4 h-4" />
                      <span>Integrasi GitHub Repository</span>
                    </span>
                    {githubStatus?.authenticated ? (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-success/15 text-status-success border border-status-success/30 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>@{githubStatus.username}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                        Mode Lokal (Tanpa Token)
                      </span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {/* Mode 1: Auto create */}
                    <label className={`block p-2.5 rounded-lg border transition-all cursor-pointer text-xs ${
                      repoMode === "auto_create"
                        ? "border-accent bg-accent/5 dark:bg-accent/10"
                        : "border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark"
                    }`}>
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="repoMode"
                          checked={repoMode === "auto_create"}
                          onChange={() => setRepoMode("auto_create")}
                          className="mt-0.5 text-accent focus:ring-accent"
                        />
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                              1. Buat Repository Baru Otomatis di GitHub
                            </span>
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-accent text-white font-medium">Auto-Push</span>
                          </div>
                          <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                            AgencyOS akan membuat repo baru di akun GitHub Anda dan melakukan inisialisasi commit pertama.
                          </p>

                          {repoMode === "auto_create" && (
                            <div className="pt-2 space-y-2 animate-in fade-in">
                              <div>
                                <label className="text-[10px] text-textMuted-light dark:text-textMuted-dark block mb-0.5">
                                  Nama Repository di GitHub (Opsional)
                                </label>
                                <input
                                  type="text"
                                  placeholder={projectKey ? `${projectKey.toLowerCase()}-${(projectName || "app").toLowerCase().replace(/\s+/g, "-")}` : "e.g. ecom-customer-portal"}
                                  value={customRepoName}
                                  onChange={(e) => setCustomRepoName(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                                  className="w-full h-7 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs font-mono text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                                />
                              </div>
                              <div className="flex items-center gap-4 text-[11px] text-textMuted-light dark:text-textMuted-dark pt-1">
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={isPrivateRepo}
                                    onChange={(e) => setIsPrivateRepo(e.target.checked)}
                                    className="rounded text-accent focus:ring-accent"
                                  />
                                  <Lock className="w-3 h-3" />
                                  <span>Private Repository</span>
                                </label>
                                <label className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={createCiWorkflow}
                                    onChange={(e) => setCreateCiWorkflow(e.target.checked)}
                                    className="rounded text-accent focus:ring-accent"
                                  />
                                  <Sparkles className="w-3 h-3 text-accent" />
                                  <span>Template CI GitHub Actions</span>
                                </label>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </label>

                    {/* Mode 2: Existing Repo */}
                    <label className={`block p-2.5 rounded-lg border transition-all cursor-pointer text-xs ${
                      repoMode === "existing"
                        ? "border-accent bg-accent/5 dark:bg-accent/10"
                        : "border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark"
                    }`}>
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="repoMode"
                          checked={repoMode === "existing"}
                          onChange={() => setRepoMode("existing")}
                          className="mt-0.5 text-accent focus:ring-accent"
                        />
                        <div className="flex-1 space-y-1">
                          <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                            2. Hubungkan ke Repository GitHub yang Sudah Ada
                          </span>
                          <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                            Gunakan codebase yang sudah ada di akun GitHub Anda untuk dikembangkan oleh agen.
                          </p>
                          {repoMode === "existing" && (
                            <div className="pt-2 space-y-1.5 animate-in fade-in">
                              <input
                                type="text"
                                required={repoMode === "existing"}
                                placeholder="https://github.com/username/repository.git"
                                value={existingRepoUrl}
                                onChange={(e) => setExistingRepoUrl(e.target.value)}
                                className="w-full h-7 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs font-mono text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </label>

                    {/* Mode 3: Local Only */}
                    <label className={`block p-2.5 rounded-lg border transition-all cursor-pointer text-xs ${
                      repoMode === "local"
                        ? "border-accent bg-accent/5 dark:bg-accent/10"
                        : "border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark"
                    }`}>
                      <div className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="repoMode"
                          checked={repoMode === "local"}
                          onChange={() => setRepoMode("local")}
                          className="mt-0.5 text-accent focus:ring-accent"
                        />
                        <div className="flex-1">
                          <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                            3. Simpan di Lokal Saja (Tanpa GitHub Remote)
                          </span>
                          <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark mt-0.5">
                            Inisialisasi git lokal di disk server untuk uji coba atau pengerjaan offline.
                          </p>
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
                <Button type="button" variant="outline" size="sm" onClick={resetModal}>
                  Batal
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  isLoading={submitting}
                  leftIcon={planningMode === "sdlc_full" ? <FileText className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
                >
                  {planningMode === "sdlc_full" ? "Buat Project & Mulai PRD →" : "Inisialisasi & Fast-Track ke Board →"}
                </Button>
              </div>
            </form>
          ) : pipelineStage === "pipeline" ? (
            /* --- STAGE 2: LIVE AI AUTO-PLANNING PIPELINE --- */
            <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in">
              <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-lg bg-accent/15 text-accent flex items-center justify-center font-bold animate-pulse">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center gap-2">
                      <span>Dewi Lestari sedang Merancang Backlog</span>
                      <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
                    </h3>
                    <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                      Technical Product Owner & Agile Delivery Lead
                    </p>
                  </div>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent font-semibold">
                  Step {Math.min(pipelineStep, 5)} / 5
                </span>
              </div>

              {/* Progress Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-textMuted-light dark:text-textMuted-dark">
                  <span>Progres Perencanaan Otomatis:</span>
                  <span className="font-mono font-semibold text-accent">{Math.min(100, pipelineStep * 20)}%</span>
                </div>
                <div className="w-full h-1.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark rounded-full overflow-hidden border border-borderBase-light dark:border-borderBase-dark">
                  <div
                    className="h-full bg-accent transition-all duration-500 rounded-full"
                    style={{ width: `${Math.min(100, pipelineStep * 20)}%` }}
                  />
                </div>
              </div>

              {/* 5-Step Pipeline Stepper */}
              <div className="space-y-2 text-xs">
                {[
                  {
                    step: 1,
                    title: "Dekomposisi Sasaran & Arsitektur Roadmap",
                    actor: "Dewi Lestari",
                    desc: `Menganalisis tujuan '${projectName}': membedah sasaran strategis menjadi 3 fase progresif.`,
                  },
                  {
                    step: 2,
                    title: "Penyusunan 3 Progressive Sprints",
                    actor: "Dewi Lestari",
                    desc: "Menyusun Sprint 1 (Foundation & Setup), Sprint 2 (Core Features & UI), dan Sprint 3 (SEO & Launch).",
                  },
                  {
                    step: 3,
                    title: "Perumusan Backlog & Acceptance Criteria",
                    actor: "Dewi Lestari",
                    desc: "Merumuskan ~9 User Stories dengan Fibonacci Story Points, kriteria pengujian terukur, dan DoD.",
                  },
                  {
                    step: 4,
                    title: "Smart Staffing & Alokasi Agen",
                    actor: "Capability Matcher",
                    desc: "Memadankan skill agen terbaik: Frontend Specialist (Bayu), QA Sentinel (Fajar), Backend Architect.",
                  },
                  {
                    step: 5,
                    title: "Penyiapan Gerbang Persetujuan Sprint 1",
                    actor: "AgencyOS Governance Engine",
                    desc: "Sprint 1 disiapkan dalam status 'Pending Approval' menunggu persetujuan kickoff dari Anda.",
                  },
                ].map((st) => {
                  const isDone = pipelineStep > st.step;
                  const isCurrent = pipelineStep === st.step;

                  return (
                    <div
                      key={st.step}
                      className={`p-3 rounded-lg border transition-all space-y-1 ${
                        isDone
                          ? "border-status-success/30 bg-status-success/5"
                          : isCurrent
                          ? "border-accent/50 bg-accent/5 dark:bg-accent/10 shadow-xs ring-1 ring-accent/30"
                          : "border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark opacity-50"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isDone ? (
                            <CheckCircle2 className="w-4 h-4 text-status-success shrink-0" />
                          ) : isCurrent ? (
                            <Clock className="w-4 h-4 text-accent shrink-0 animate-pulse" />
                          ) : (
                            <div className="w-4 h-4 rounded-full border border-textMuted-light/40 dark:border-textMuted-dark/40 shrink-0 flex items-center justify-center text-[9px] font-mono">
                              {st.step}
                            </div>
                          )}
                          <span className={`font-semibold ${isCurrent ? "text-accent" : "text-textPrimary-light dark:text-textPrimary-dark"}`}>
                            {st.title}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-textMuted-light dark:text-textMuted-dark">
                          {st.actor}
                        </span>
                      </div>
                      <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark pl-6 leading-relaxed">
                        {st.desc}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="p-2.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark flex items-center justify-center gap-2 text-xs text-textMuted-light dark:text-textMuted-dark">
                <Sparkles className="w-3.5 h-3.5 text-accent animate-spin" />
                <span>Menghubungkan ke workforce agent registry &amp; mengalokasikan workspace...</span>
              </div>
            </div>
          ) : planningMode === "sdlc_full" ? (
            /* --- STAGE 3A: SDLC DISCOVERY KICKOFF SUMMARY --- */
            <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in">
              <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-lg bg-status-success/15 text-status-success flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      Project &amp; Workspace Berhasil Dibuat!
                    </h3>
                    <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                      Workspace terisolasi siap. Memasuki Tahap 1: Dokumen PRD &amp; Wawancara Discovery.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Discovery Workflow Steps Preview */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark block">
                  Tahapan Rekayasa Produk (SDLC):
                </span>

                <div className="p-3 rounded-lg border border-accent/40 bg-accent/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-accent flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5" />
                      <span>Tahap 1: Dokumen PRD &amp; Wawancara Discovery</span>
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-accent text-white font-bold uppercase">
                      Langkah Pertama →
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    <strong>Maya Indrawati</strong> (UX Researcher &amp; Empathy) &amp; <strong>Satria Pratama</strong> (Business Analyst) akan memandu sesi discovery kebutuhan &amp; menyusun draf PRD resmi.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-1 opacity-70">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5" />
                      <span>Tahap 2: Arsitektur Sistem &amp; Desain UI/UX</span>
                    </span>
                    <span className="text-[10px] font-mono text-textMuted-light dark:text-textMuted-dark">Menunggu PRD</span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    <strong>Aditya Pratama</strong> (System Architect) &amp; <strong>Siti Rahma</strong> (Lead UI Designer) menyusun ERD, API Contract &amp; Token Desain.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-1 opacity-70">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center gap-1.5">
                      <ListTodo className="w-3.5 h-3.5" />
                      <span>Tahap 3: Dekomposisi Backlog &amp; Papan Scrum</span>
                    </span>
                    <span className="text-[10px] font-mono text-textMuted-light dark:text-textMuted-dark">Menunggu Arsitektur</span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    <strong>Dewi Lestari</strong> memecah cetak biru menjadi User Stories &amp; Sprint Backlog terverifikasi.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={resetModal}>
                  Lihat Daftar Project
                </Button>
                {createdProject ? (
                  <Link href={`/projects/${createdProject.id}/prd`}>
                    <Button size="sm" variant="primary" rightIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Mulai Tahap 1: Dokumen PRD →
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" variant="primary" onClick={resetModal}>
                    Selesai
                  </Button>
                )}
              </div>
            </div>
          ) : (
            /* --- STAGE 3B: FAST-TRACK PIPELINE COMPLETED SUMMARY --- */
            <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl animate-in fade-in">
              <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-lg bg-status-success/15 text-status-success flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      Perencanaan Project Selesai!
                    </h3>
                    <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                      Dewi Lestari telah membedah sasaran dan menyusun 3 Progressive Sprints.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={resetModal}
                  className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Sprints Overview */}
              <div className="space-y-2 text-xs">
                <span className="text-[10px] font-bold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark block">
                  Struktur Sprints yang Dihasilkan:
                </span>

                <div className="p-3 rounded-lg border border-status-warning/40 bg-status-warning/10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      Sprint 1: Foundation, Architecture & Setup
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-status-warning/20 text-status-warning font-bold uppercase">
                      Pending Approval ⚠️
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    3 Stories • Setup AppShell, Hero Section & CI/CD • Siap ditinjau &amp; disetujui untuk mulai bekerja.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      Sprint 2: Core Features, Services & Engagement
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
                      Planning
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    3 Stories • Service Cards, Contact Form, Testimonials Carousel.
                  </p>
                </div>

                <div className="p-3 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/20 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      Sprint 3: SEO Optimization, Performance & Launch
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
                      Planning
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    3 Stories • Footer & Legal, OpenGraph & JSON-LD, Lighthouse 90+ Audit.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
                <Button size="sm" variant="outline" onClick={resetModal}>
                  Lihat Daftar Project
                </Button>
                {createdProject ? (
                  <Link href={`/projects/${createdProject.id}/board`}>
                    <Button size="sm" variant="primary" leftIcon={<ArrowRight className="w-3.5 h-3.5" />}>
                      Buka Board &amp; Tinjau Sprint 1 →
                    </Button>
                  </Link>
                ) : (
                  <Button size="sm" variant="primary" onClick={resetModal}>
                    Selesai
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
