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
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  Kanban,
  ListTodo,
  BarChart2,
  ExternalLink,
  Github,
  Database,
  Server,
  Layers,
  Code2,
  Shield,
  Network,
  Cpu,
  Workflow,
  Check,
  Info
} from "lucide-react";

interface DatabaseField {
  name: string;
  type: string;
  constraints: string;
  description: string;
}

interface DatabaseEntity {
  name: string;
  table_name: string;
  description: string;
  fields: DatabaseField[];
  relationships: string[];
}

interface ApiEndpoint {
  module: string;
  method: string;
  path: string;
  description: string;
  request_body?: string;
  response_body?: string;
  auth_required: boolean;
}

interface ComponentModule {
  name: string;
  type: string;
  responsibilities: string[];
  dependencies: string[];
}

interface SecuritySpec {
  category: string;
  mechanism: string;
  description: string;
}

interface TechStack {
  frontend: string;
  backend: string;
  database: string;
  caching: string;
  ci_cd: string;
  tools: string[];
}

interface ProjectArchitecture {
  id: string;
  project_id: string;
  version: number;
  status: "draft" | "in_review" | "approved";
  system_overview?: string;
  tech_stack: TechStack;
  database_entities: DatabaseEntity[];
  api_endpoints: ApiEndpoint[];
  component_modules: ComponentModule[];
  security_specs: SecuritySpec[];
  data_flow_diagram?: string;
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
  github_repo_url?: string;
  github_repo_name?: string;
}

const API_BASE = "http://127.0.0.1:8000/api/v1";

export default function ProjectArchitecturePage({
  params: paramsPromise,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(paramsPromise);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState<Project | null>(null);
  const [architecture, setArchitecture] = useState<ProjectArchitecture | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Active section tab
  const [activeSection, setActiveSection] = useState<"overview" | "erd" | "apis" | "components" | "security">("overview");

  // Sign-off modal state
  const [isSignOffOpen, setIsSignOffOpen] = useState(false);
  const [signOffName, setSignOffName] = useState("Lead Software Architect");

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projRes, archRes] = await Promise.all([
        fetch(`${API_BASE}/projects/${projectId}`),
        fetch(`${API_BASE}/projects/${projectId}/architecture`),
      ]);

      if (!projRes.ok) throw new Error("Gagal memuat profil proyek");
      const projData = await projRes.json();
      setProject(projData);

      if (archRes.ok) {
        const archData = await archRes.json();
        setArchitecture(archData);
      }
    } catch (err: any) {
      setError(err.message || "Terjadi kesalahan saat memuat spesifikasi arsitektur.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleGenerateArchitecture = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/architecture/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_notes: null }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Gagal merancang cetak biru arsitektur.");
      }
      const data = await res.json();
      setArchitecture(data);
      setSuccessMsg("Arsitektur sistem & skema teknis berhasil disintesis oleh Lead Software Architect!");
    } catch (err: any) {
      setError(err.message || "Gagal membuat arsitektur.");
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveArchitecture = async () => {
    setApproving(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/projects/${projectId}/architecture/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved_by: signOffName.trim() || "Lead Software Architect" }),
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Gagal menyetujui dokumen arsitektur.");
      }
      const updated = await res.json();
      setArchitecture(updated);
      setIsSignOffOpen(false);
      setSuccessMsg(`Cetak biru arsitektur resmi disetujui oleh ${updated.approved_by}!`);
    } catch (err: any) {
      setError(err.message || "Gagal menyetujui dokumen arsitektur.");
    } finally {
      setApproving(false);
    }
  };

  const getStatusBadgeVariant = (status?: string): StatusVariant => {
    switch (status) {
      case "approved":
        return "success";
      case "in_review":
        return "info";
      default:
        return "warning";
    }
  };

  const getMethodBadgeClass = (method: string) => {
    switch (method.toUpperCase()) {
      case "GET":
        return "bg-status-success/15 text-status-success border-status-success/30";
      case "POST":
        return "bg-status-info/15 text-status-info border-status-info/30";
      case "PUT":
      case "PATCH":
        return "bg-status-warning/15 text-status-warning border-status-warning/30";
      case "DELETE":
        return "bg-status-danger/15 text-status-danger border-status-danger/30";
      default:
        return "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark";
    }
  };

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <TableSkeleton rows={4} />
        </div>
      </AppShell>
    );
  }

  const isApproved = architecture?.status === "approved";
  const entities = architecture?.database_entities || [];
  const endpoints = architecture?.api_endpoints || [];
  const modules = architecture?.component_modules || [];
  const security = architecture?.security_specs || [];
  const tech = architecture?.tech_stack;

  return (
    <AppShell>
      <PageHeader
        title={project?.name || "Project Architecture"}
        description={`Cetak Biru Arsitektur & Desain Sistem (Technical Design Document) • ${project?.key || "PROJ"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: project?.name || "Project", href: `/projects/${projectId}/architecture` },
          { label: "Arsitektur & Desain Sistem" },
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
            <Button variant="outline" size="sm" onClick={fetchData} leftIcon={<RotateCcw className="w-3.5 h-3.5" />}>
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleGenerateArchitecture}
              isLoading={generating}
              leftIcon={<Sparkles className="w-3.5 h-3.5" />}
            >
              AI Rancang Arsitektur (Budi)
            </Button>
          </div>
        }
      />

      {/* Modern Unified 5-Stage SDLC Navigation Tabs */}
      <div className="flex items-center space-x-2 border-b border-borderBase-light dark:border-borderBase-dark pb-3 overflow-x-auto">
        <Link
          href={`/projects/${projectId}/prd`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>1. Dokumen PRD</span>
        </Link>
        <Link
          href={`/projects/${projectId}/architecture`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent/10 text-accent border border-accent/20 transition-colors shrink-0"
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

      {successMsg && (
        <div className="p-3.5 rounded-lg bg-status-success/10 border border-status-success/30 text-xs text-status-success flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Check className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="font-semibold underline ml-2">Tutup</button>
        </div>
      )}

      {/* Status & Sign-off Banner */}
      <div className="p-4 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 rounded-lg bg-accent/10 border border-accent/20 text-accent">
            <Cpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                Technical Design Document (TDD) v{architecture?.version || 1}
              </h2>
              <StatusBadge
                variant={getStatusBadgeVariant(architecture?.status)}
                label={
                  architecture?.status === "approved"
                    ? "Approved (Signed Off)"
                    : architecture?.status === "in_review"
                    ? "In Review"
                    : "Draft"
                }
              />
            </div>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark mt-0.5">
              {isApproved
                ? `Telah disetujui secara resmi oleh ${architecture?.approved_by} pada ${new Date(architecture?.approved_at || "").toLocaleString("id-ID")}`
                : "Dokumen rancangan arsitektur teknis sistem sebelum User Story dipecah ke Backlog."}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {!isApproved ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSignOffOpen(true)}
              className="border-accent text-accent hover:bg-accent/10"
              leftIcon={<ShieldCheck className="w-4 h-4" />}
            >
              Sign-Off & Setujui Arsitektur
            </Button>
          ) : (
            <Link href={`/projects/${projectId}/backlog`}>
              <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-4 h-4" />}>
                Lanjut ke Backlog & Sprints
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Secondary Sub-Tabs for Architecture Spec */}
      <div className="flex items-center space-x-2 border-b border-borderBase-light dark:border-borderBase-dark">
        <button
          onClick={() => setActiveSection("overview")}
          className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeSection === "overview"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
          }`}
        >
          <Server className="w-4 h-4" />
          <span>Ringkasan & Tech Stack</span>
        </button>
        <button
          onClick={() => setActiveSection("erd")}
          className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeSection === "erd"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Skema Database ({entities.length} Tabel)</span>
        </button>
        <button
          onClick={() => setActiveSection("apis")}
          className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeSection === "apis"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
          }`}
        >
          <Network className="w-4 h-4" />
          <span>Kontrak REST API ({endpoints.length} Endpoints)</span>
        </button>
        <button
          onClick={() => setActiveSection("components")}
          className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeSection === "components"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Modul Komponen ({modules.length})</span>
        </button>
        <button
          onClick={() => setActiveSection("security")}
          className={`flex items-center space-x-2 px-3.5 py-2.5 text-xs font-medium border-b-2 transition-colors ${
            activeSection === "security"
              ? "border-accent text-accent font-semibold"
              : "border-transparent text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Protokol Keamanan ({security.length})</span>
        </button>
      </div>

      {/* TAB 1: System Overview & Tech Stack */}
      {activeSection === "overview" && (
        <div className="space-y-6">
          {/* Narrative Overview */}
          <div className="p-5 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark space-y-3">
            <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
              <Server className="w-4 h-4 text-accent" />
              <span>Prinsip Desain & Gambaran Umum Sistem</span>
            </h3>
            <p className="text-xs sm:text-sm text-textSecondary-light dark:text-textSecondary-dark leading-relaxed whitespace-pre-line">
              {architecture?.system_overview || "Belum ada gambaran arsitektur sistem. Klik 'AI Rancang Arsitektur' untuk mensintesis."}
            </p>
          </div>

          {/* Tech Stack Grid */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-accent" />
              <span>Standar Tumpukan Teknologi (Technology Stack)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark">
                <span className="text-[11px] font-mono uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">Frontend Web</span>
                <p className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark mt-1">
                  {tech?.frontend || "Next.js 15 (React 19, Tailwind CSS)"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark">
                <span className="text-[11px] font-mono uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">Backend API Service</span>
                <p className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark mt-1">
                  {tech?.backend || "FastAPI (Python, SQLAlchemy, Pydantic)"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark">
                <span className="text-[11px] font-mono uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">Database Relasional</span>
                <p className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark mt-1">
                  {tech?.database || "PostgreSQL / SQLite"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark">
                <span className="text-[11px] font-mono uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">Caching & Rate Limiting</span>
                <p className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark mt-1">
                  {tech?.caching || "Redis (In-Memory Cache)"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark">
                <span className="text-[11px] font-mono uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">CI/CD Pipeline</span>
                <p className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark mt-1">
                  {tech?.ci_cd || "GitHub Actions (Tests, Linter, Build)"}
                </p>
              </div>
              <div className="p-4 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark">
                <span className="text-[11px] font-mono uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">Alat Rekayasa & Tools</span>
                <p className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark mt-1">
                  {tech?.tools?.join(", ") || "Docker, Pytest, Alembic"}
                </p>
              </div>
            </div>
          </div>

          {/* Data Flow Diagram Card */}
          {architecture?.data_flow_diagram && (
            <div className="p-5 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark space-y-3">
              <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
                <Workflow className="w-4 h-4 text-accent" />
                <span>Diagram Aliran Data & Perutean (Data Flow)</span>
              </h3>
              <div className="p-4 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-mono text-xs overflow-x-auto text-textPrimary-light dark:text-textPrimary-dark">
                <pre>{architecture.data_flow_diagram}</pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Database Schema (ERD) */}
      {activeSection === "erd" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
              <Database className="w-4 h-4 text-accent" />
              <span>Entitas Database & Skema Relasional</span>
            </h3>
            <span className="text-xs text-textMuted-light dark:text-textMuted-dark font-mono">
              Total {entities.length} Tabel Terdefinisi
            </span>
          </div>

          <div className="grid grid-cols-1 gap-5">
            {entities.map((entity, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-borderBase-light dark:border-borderBase-dark">
                  <div className="flex items-center space-x-2.5">
                    <Database className="w-4 h-4 text-accent" />
                    <span className="text-sm font-bold text-textPrimary-light dark:text-textPrimary-dark">{entity.name}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark">
                      tabel: {entity.table_name}
                    </span>
                  </div>
                  <span className="text-xs text-textMuted-light dark:text-textMuted-dark italic">
                    {entity.description}
                  </span>
                </div>

                {/* Fields Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark">
                        <th className="pb-2 font-mono uppercase text-[11px]">Nama Kolom</th>
                        <th className="pb-2 font-mono uppercase text-[11px]">Tipe Data</th>
                        <th className="pb-2 font-mono uppercase text-[11px]">Aturan / Constraint</th>
                        <th className="pb-2 font-mono uppercase text-[11px]">Deskripsi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
                      {entity.fields.map((f, fIdx) => (
                        <tr key={fIdx} className="hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors">
                          <td className="py-2 font-mono font-semibold text-accent">{f.name}</td>
                          <td className="py-2 font-mono text-textPrimary-light dark:text-textPrimary-dark">{f.type}</td>
                          <td className="py-2 text-[11px] font-mono text-textMuted-light dark:text-textMuted-dark">{f.constraints}</td>
                          <td className="py-2 text-textSecondary-light dark:text-textSecondary-dark">{f.description}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {entity.relationships.length > 0 && (
                  <div className="pt-2 text-[11px] text-textMuted-light dark:text-textMuted-dark flex items-center space-x-2">
                    <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">Relasi:</span>
                    <span>{entity.relationships.join(" • ")}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: REST API Contracts */}
      {activeSection === "apis" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
              <Network className="w-4 h-4 text-accent" />
              <span>Kontrak Antarmuka Pemrograman Aplikasi (REST API Specs)</span>
            </h3>
            <span className="text-xs text-textMuted-light dark:text-textMuted-dark font-mono">
              Total {endpoints.length} Endpoints
            </span>
          </div>

          <div className="space-y-3">
            {endpoints.map((ep, idx) => (
              <div
                key={idx}
                className="p-4 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark space-y-2.5"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex items-center space-x-2.5">
                    <span className={`px-2.5 py-0.5 rounded text-[11px] font-mono font-bold border ${getMethodBadgeClass(ep.method)}`}>
                      {ep.method}
                    </span>
                    <span className="font-mono text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      {ep.path}
                    </span>
                    <span className="text-[11px] px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark border border-borderBase-light dark:border-borderBase-dark">
                      Modul: {ep.module}
                    </span>
                  </div>
                  {ep.auth_required ? (
                    <span className="text-[11px] flex items-center space-x-1 text-accent font-medium">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Bearer JWT Auth</span>
                    </span>
                  ) : (
                    <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">Publik (No Auth)</span>
                  )}
                </div>

                <p className="text-xs text-textSecondary-light dark:text-textSecondary-dark">
                  {ep.description}
                </p>

                {(ep.request_body || ep.response_body) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                    {ep.request_body && (
                      <div className="p-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-mono text-[11px]">
                        <span className="text-textMuted-light dark:text-textMuted-dark block text-[10px] uppercase font-semibold">Request Payload</span>
                        <code className="text-textPrimary-light dark:text-textPrimary-dark">{ep.request_body}</code>
                      </div>
                    )}
                    {ep.response_body && (
                      <div className="p-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-mono text-[11px]">
                        <span className="text-textMuted-light dark:text-textMuted-dark block text-[10px] uppercase font-semibold">Response Contract</span>
                        <code className="text-textPrimary-light dark:text-textPrimary-dark">{ep.response_body}</code>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Component Modules */}
      {activeSection === "components" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
              <Layers className="w-4 h-4 text-accent" />
              <span>Dekomposisi Modul & Tanggung Jawab Sistem</span>
            </h3>
            <span className="text-xs text-textMuted-light dark:text-textMuted-dark font-mono">
              Total {modules.length} Komponen
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {modules.map((mod, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Code2 className="w-4 h-4 text-accent" />
                    <span className="text-sm font-bold text-textPrimary-light dark:text-textPrimary-dark">{mod.name}</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark uppercase text-textMuted-light dark:text-textMuted-dark">
                    {mod.type}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-semibold text-textMuted-light dark:text-textMuted-dark uppercase tracking-wider block">
                    Tanggung Jawab Utama
                  </span>
                  <ul className="space-y-1 text-xs text-textSecondary-light dark:text-textSecondary-dark list-disc list-inside">
                    {mod.responsibilities.map((r, rIdx) => (
                      <li key={rIdx}>{r}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark text-[11px] text-textMuted-light dark:text-textMuted-dark">
                  <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">Dependensi: </span>
                  <span>{mod.dependencies.join(", ")}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Security Specs */}
      {activeSection === "security" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
              <Shield className="w-4 h-4 text-accent" />
              <span>Protokol Keamanan, Kepatuhan & Perlindungan Data</span>
            </h3>
            <span className="text-xs text-textMuted-light dark:text-textMuted-dark font-mono">
              Total {security.length} Kebijakan
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {security.map((sec, idx) => (
              <div
                key={idx}
                className="p-5 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark space-y-2.5"
              >
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-accent" />
                  <span className="text-xs font-bold text-textPrimary-light dark:text-textPrimary-dark">{sec.category}</span>
                </div>
                <div className="p-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-xs font-mono font-semibold text-accent">
                  {sec.mechanism}
                </div>
                <p className="text-xs text-textSecondary-light dark:text-textSecondary-dark leading-relaxed">
                  {sec.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sign-Off Modal */}
      {isSignOffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-borderBase-light dark:border-borderBase-dark bg-surfacePrimary-light dark:bg-surfacePrimary-dark p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-accent/10 border border-accent/20 text-accent">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-textPrimary-light dark:text-textPrimary-dark">
                  Persetujuan Arsitektur Sistem
                </h3>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Human-in-the-Loop Architect Sign-Off Gate
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                Nama / Jabatan Penanggung Jawab Arsitektur:
              </label>
              <input
                type="text"
                value={signOffName}
                onChange={(e) => setSignOffName(e.target.value)}
                placeholder="Contoh: Budi Santoso (Lead Architect)"
                className="w-full px-3 py-2 rounded-lg text-xs bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent"
              />
            </div>

            <p className="text-xs text-textMuted-light dark:text-textMuted-dark leading-relaxed">
              Dengan menandatangani cetak biru ini, seluruh entitas database, skema endpoint REST API,
              dan dekomposisi modul sistem dinyatakan sah untuk diimplementasikan ke dalam Backlog & Sprint.
            </p>

            <div className="flex items-center justify-end space-x-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setIsSignOffOpen(false)}>
                Batal
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleApproveArchitecture}
                isLoading={approving}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Tandatangani & Sahkan
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
