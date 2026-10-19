"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { Button } from "../../components/ui/Button";
import { TableSkeleton } from "../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../components/ui/ErrorState";
import {
  Building2,
  Plus,
  ShieldCheck,
  CheckCircle2,
  X,
  Briefcase,
  Users,
  Crown,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Bot,
  ExternalLink,
  Search,
  Check,
  Cpu,
  Layers,
  FileText,
  Filter,
  Code2,
  Palette,
  Terminal,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  roles_count: number;
  agents_count: number;
}

interface JobRole {
  id: string;
  name: string;
  code: string;
  department_id: string;
  department_name?: string;
  description?: string;
  responsibilities: string[];
  skills: string[];
  capability_categories: string[];
  qualification_criteria: string[];
  is_official: boolean;
  version: number;
  agents_count: number;
}

interface AgentSkill {
  id: string;
  name: string;
  is_verified: boolean;
  verified_evidence?: string;
}

interface Agent {
  id: string;
  name: string;
  title: string;
  role_id: string;
  role_name?: string;
  department_id: string;
  department_name?: string;
  lifecycle_state: string;
  availability_state: string;
  qualification_state: string;
  max_concurrency: number;
  current_concurrency: number;
  engine_adapter: string;
  llm_profile_id?: string | null;
  llm_profile_name?: string | null;
  llm_model?: string | null;
  instructions?: string;
  current_profile_version: number;
  skills: AgentSkill[];
}

interface DirectorateConfig {
  id: string;
  code: string;
  name: string;
  deptCodes: string[];
  deptIds: string[];
  description: string;
  badgeBg: string;
  borderTheme: string;
  icon: React.ReactNode;
}

export default function OrganizationPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected agent for inspect modal
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  // Sync Agency Structure State
  const [syncingStructure, setSyncingStructure] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Filter division state & search query
  const [selectedDivisionFilter, setSelectedDivisionFilter] = useState<string>("all");
  const [searchAgentQuery, setSearchAgentQuery] = useState<string>("");

  // Propose Role Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [roleDeptId, setRoleDeptId] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleSkills, setRoleSkills] = useState("");
  const [roleResp, setRoleResp] = useState("");

  const directorates: DirectorateConfig[] = useMemo(
    () => [
      {
        id: "dir-prod",
        code: "PROD_DESIGN",
        name: "Direktorat Produk, Riset & Desain",
        deptCodes: ["PROD", "DESIGN"],
        deptIds: ["dept-prod", "dept-des"],
        description:
          "Bertanggung jawab atas riset kebutuhan bisnis, penyusunan dokumen PRD/SRS formal, user journey mapping, dan arsitektur token UI/UX WCAG 2.1.",
        badgeBg: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30",
        borderTheme: "border-blue-500/30",
        icon: <Palette className="w-5 h-5 text-blue-500" />,
      },
      {
        id: "dir-eng",
        code: "ENG_ARCH",
        name: "Direktorat Rekayasa Perangkat Lunak & Arsitektur Teknis",
        deptCodes: ["ENG", "SEC_INFRA"],
        deptIds: ["dept-eng", "a4f06779-8b92-4250-8268-48a437be580c"],
        description:
          "Bertanggung jawab atas arsitektur modular Clean Architecture, perancangan skema database ERD, kontrak REST API OpenAPI, dan pertahanan siber OWASP Top 10.",
        badgeBg: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30",
        borderTheme: "border-emerald-500/30",
        icon: <Code2 className="w-5 h-5 text-emerald-500" />,
      },
      {
        id: "dir-delivery",
        code: "QA_DEVOPS",
        name: "Direktorat Mutu, DevOps & Delivery Operasional",
        deptCodes: ["OPS", "QA"],
        deptIds: ["dept-delivery", "dept-qa"],
        description:
          "Bertanggung jawab atas ritme Scrum, verifikasi gerbang mutu Definition of Done (DoD Gate), isolasi Git Worktree, pipeline CI/CD, dan publikasi rilis.",
        badgeBg: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30",
        borderTheme: "border-amber-500/30",
        icon: <Terminal className="w-5 h-5 text-amber-500" />,
      },
    ],
    []
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [deptsRes, rolesRes, agentsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/v1/organization/departments"),
        fetch("http://127.0.0.1:8000/api/v1/organization/roles"),
        fetch("http://127.0.0.1:8000/api/v1/workforce/agents"),
      ]);

      if (!deptsRes.ok || !rolesRes.ok) {
        throw new Error("Gagal memuat data struktur organisasi.");
      }

      const deptsData = await deptsRes.json();
      const rolesData = await rolesRes.json();
      const agentsData = agentsRes.ok ? await agentsRes.json() : [];

      setDepartments(deptsData);
      setRoles(rolesData);
      setAgents(agentsData);
      if (deptsData.length > 0) setRoleDeptId(deptsData[0].id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan saat memuat data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEnterpriseStructure = async () => {
    try {
      setSyncingStructure(true);
      setSyncSuccess(null);
      const res = await fetch("http://127.0.0.1:8000/api/v1/organization/sync-agency-structure", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Gagal mensinkronkan struktur agency.");
      }
      const data = await res.json();
      setSyncSuccess(data.message || "Struktur organisasi agency berhasil disinkronkan.");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal sinkronisasi.");
    } finally {
      setSyncingStructure(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProposeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim() || !roleCode.trim() || !roleDeptId) return;

    try {
      setSubmitting(true);
      setModalError(null);
      const skillsArray = roleSkills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const respArray = roleResp
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload = {
        name: roleName.trim(),
        code: roleCode.trim().toUpperCase(),
        department_id: roleDeptId,
        description: roleDesc.trim() || undefined,
        skills: skillsArray,
        responsibilities: respArray,
        capability_categories: ["general"],
      };

      const res = await fetch("http://127.0.0.1:8000/api/v1/organization/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Gagal mengusulkan jabatan baru.");
      }

      setIsModalOpen(false);
      setRoleName("");
      setRoleCode("");
      setRoleDesc("");
      setRoleSkills("");
      setRoleResp("");
      await fetchData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Gagal mengajukan jabatan.");
    } finally {
      setSubmitting(false);
    }
  };

  // Helper to get agents belonging to a directorate
  const getAgentsForDirectorate = (dir: DirectorateConfig) => {
    return agents.filter((ag) => {
      const matchDeptId = dir.deptIds.includes(ag.department_id);
      const matchDeptCode = dir.deptCodes.some((code) => {
        const d = departments.find((dept) => dept.code === code);
        return d && d.id === ag.department_id;
      });
      const matchName = ag.department_name && dir.deptCodes.some((code) => {
        if (code === "PROD") return ag.department_name?.toLowerCase().includes("product");
        if (code === "DESIGN") return ag.department_name?.toLowerCase().includes("design");
        if (code === "ENG") return ag.department_name?.toLowerCase().includes("engineer");
        if (code === "OPS") return ag.department_name?.toLowerCase().includes("operation");
        if (code === "QA") return ag.department_name?.toLowerCase().includes("quality");
        return false;
      });

      const matchesDirectorate = matchDeptId || matchDeptCode || matchName;

      if (!searchAgentQuery.trim()) return matchesDirectorate;

      const q = searchAgentQuery.toLowerCase();
      const matchQuery =
        ag.name.toLowerCase().includes(q) ||
        ag.title.toLowerCase().includes(q) ||
        (ag.role_name && ag.role_name.toLowerCase().includes(q)) ||
        ag.skills.some((s) => s.name.toLowerCase().includes(q));

      return matchesDirectorate && matchQuery;
    });
  };

  // Helper to get roles belonging to a directorate
  const getRolesForDirectorate = (dir: DirectorateConfig) => {
    return roles.filter((r) => {
      const matchDeptId = dir.deptIds.includes(r.department_id);
      const matchDeptCode = dir.deptCodes.some((code) => {
        const d = departments.find((dept) => dept.code === code);
        return d && d.id === r.department_id;
      });
      return matchDeptId || matchDeptCode;
    });
  };

  const filteredDirectorates = useMemo(() => {
    if (selectedDivisionFilter === "all") return directorates;
    return directorates.filter((d) => d.id === selectedDivisionFilter);
  }, [directorates, selectedDivisionFilter]);

  return (
    <AppShell>
      <PageHeader
        title="Struktur Organisasi & Personel per Divisi"
        description="Peta hierarki divisi digital agency, rincian personel agen AI yang bertugas di tiap direktorat, serta spesifikasi peran terstandar."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Organization" },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncEnterpriseStructure}
              isLoading={syncingStructure}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Sinkronkan Struktur
            </Button>
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Tambah Jabatan Baru
            </Button>
          </div>
        }
      />

      {syncSuccess && (
        <div className="p-3 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncSuccess}</span>
          </div>
          <button onClick={() => setSyncSuccess(null)} className="font-semibold underline text-[11px]">
            Tutup
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <div className="space-y-6">
          {/* 1. EXECUTIVE LEADERSHIP APEX CARD (OWNER & MANAGING DIRECTOR) */}
          <div className="p-4 sm:p-5 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
                  <Crown className="w-6 h-6 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-textPrimary-light dark:text-textPrimary-dark">
                      ANDA (Agency Owner & Managing Director)
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                      Supreme Decision Maker
                    </span>
                  </div>
                  <p className="text-xs text-textMuted-light dark:text-textMuted-dark mt-0.5">
                    Pemegang otoritas tertinggi, penentu visi bisnis agency, dan pemegang hak tanda tangan persetujuan gerbang SDLC (*Gated Approvals*).
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs shrink-0">
                <div className="px-2.5 py-1.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textSecondary-light dark:text-textSecondary-dark flex items-center space-x-1.5 shadow-xs">
                  <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
                  <span>3 Direktorat Utama</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textSecondary-light dark:text-textSecondary-dark flex items-center space-x-1.5 shadow-xs">
                  <Bot className="w-3.5 h-3.5 text-accent" />
                  <span>{agents.length} Personel Agen</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textSecondary-light dark:text-textSecondary-dark flex items-center space-x-1.5 shadow-xs">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  <span>{roles.length} Jabatan Spesialis</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-borderBase-light/40 dark:border-borderBase-dark/40 text-xs">
              <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Sign-off PRD & Scope (Gerbang Tahap 1)</span>
              </div>
              <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Persetujuan Memulai Sprint (Gerbang Tahap 3)</span>
              </div>
              <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Pengesahan Rilis ke Produksi (Gerbang Tahap 5)</span>
              </div>
            </div>
          </div>

          {/* 2. FILTER & SEARCH TOOLBAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-xl bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark shadow-xs">
            {/* Division Filter Buttons */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-textMuted-light dark:text-textMuted-dark mr-1 text-[11px] font-semibold flex items-center">
                <Filter className="w-3 h-3 mr-1" /> Tampilkan:
              </span>
              <button
                onClick={() => setSelectedDivisionFilter("all")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  selectedDivisionFilter === "all"
                    ? "bg-accent text-white shadow-xs"
                    : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                }`}
              >
                Semua Divisi ({directorates.length})
              </button>
              {directorates.map((dir) => (
                <button
                  key={dir.id}
                  onClick={() => setSelectedDivisionFilter(dir.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center space-x-1.5 ${
                    selectedDivisionFilter === dir.id
                      ? "bg-accent text-white shadow-xs"
                      : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                  }`}
                >
                  <span>{dir.name.split(" ")[1] || dir.name}</span>
                </button>
              ))}
            </div>

            {/* Agent Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-textMuted-light dark:text-textMuted-dark" />
              <input
                type="text"
                placeholder="Cari nama agen atau skill..."
                value={searchAgentQuery}
                onChange={(e) => setSearchAgentQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-xs focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* 3. DIVISION-BY-DIVISION SECTIONS (DETAIL AGENTS PER DIVISI) */}
          <div className="space-y-8">
            {filteredDirectorates.map((dir) => {
              const dirAgents = getAgentsForDirectorate(dir);
              const dirRoles = getRolesForDirectorate(dir);

              return (
                <div
                  key={dir.id}
                  className={`rounded-2xl border ${dir.borderTheme} bg-surface-light dark:bg-surface-dark shadow-sm overflow-hidden`}
                >
                  {/* Division Header Banner */}
                  <div className="p-4 sm:p-5 border-b border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/40 dark:bg-surfaceSecondary-dark/40 flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-start space-x-3.5">
                      <div className="p-2.5 rounded-xl bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark shadow-xs shrink-0">
                        {dir.icon}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${dir.badgeBg}`}>
                            {dir.code}
                          </span>
                          <h3 className="text-base font-bold text-textPrimary-light dark:text-textPrimary-dark">
                            {dir.name}
                          </h3>
                        </div>
                        <p className="text-xs text-textMuted-light dark:text-textMuted-dark mt-1 max-w-3xl leading-relaxed">
                          {dir.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 text-xs shrink-0">
                      <span className="px-2.5 py-1 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textPrimary-light dark:text-textPrimary-dark font-semibold flex items-center space-x-1.5 shadow-xs">
                        <Bot className="w-3.5 h-3.5 text-accent" />
                        <span>{dirAgents.length} Personel Agen</span>
                      </span>
                      <span className="px-2.5 py-1 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textPrimary-light dark:text-textPrimary-dark font-semibold flex items-center space-x-1.5 shadow-xs">
                        <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{dirRoles.length} Jabatan Resmi</span>
                      </span>
                    </div>
                  </div>

                  {/* Section A: Assigned Agents in This Division */}
                  <div className="p-4 sm:p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <Bot className="w-4 h-4 text-accent" />
                        <h4 className="text-sm font-bold text-textPrimary-light dark:text-textPrimary-dark">
                          Personel Agen Bertugas ({dirAgents.length})
                        </h4>
                      </div>
                      <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                        Klik kartu agen untuk melihat mandat & spesifikasi detail
                      </span>
                    </div>

                    {dirAgents.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {dirAgents.map((ag) => (
                          <div
                            key={ag.id}
                            onClick={() => setSelectedAgent(ag)}
                            className="p-3.5 rounded-xl border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/30 hover:border-accent hover:bg-accent/5 dark:hover:bg-accent/10 transition-all cursor-pointer shadow-xs flex flex-col justify-between space-y-3 group"
                          >
                            <div className="space-y-2">
                              {/* Header info */}
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center space-x-2.5 min-w-0">
                                  <div className="w-9 h-9 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 group-hover:scale-105 transition-transform">
                                    <Bot className="w-4 h-4" />
                                  </div>
                                  <div className="truncate">
                                    <h5 className="text-xs font-bold text-textPrimary-light dark:text-textPrimary-dark group-hover:text-accent transition-colors truncate">
                                      {ag.name}
                                    </h5>
                                    <div className="text-[11px] text-textMuted-light dark:text-textMuted-dark truncate">
                                      {ag.title}
                                    </div>
                                  </div>
                                </div>

                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold uppercase shrink-0 ${
                                    ag.lifecycle_state === "active"
                                      ? "bg-status-success/15 text-status-success border border-status-success/30"
                                      : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark"
                                  }`}
                                >
                                  {ag.lifecycle_state}
                                </span>
                              </div>

                              {/* Badges */}
                              <div className="flex flex-wrap gap-1 text-[10px]">
                                <span className="px-2 py-0.5 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark font-mono text-textSecondary-light dark:text-textSecondary-dark">
                                  {ag.role_name || ag.role_id}
                                </span>
                                {ag.qualification_state === "passed" && (
                                  <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center space-x-1">
                                    <ShieldCheck className="w-3 h-3" />
                                    <span>Passed QA</span>
                                  </span>
                                )}
                              </div>

                              {/* Instructions excerpt */}
                              {ag.instructions && (
                                <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark line-clamp-2 italic bg-surface-light dark:bg-surface-dark p-2 rounded-lg border border-borderBase-light/50 dark:border-borderBase-dark/50">
                                  &ldquo;{ag.instructions}&rdquo;
                                </p>
                              )}

                              {/* Skills chips */}
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {ag.skills.slice(0, 3).map((sk) => (
                                  <span
                                    key={sk.id}
                                    className="px-1.5 py-0.5 rounded text-[10px] bg-surface-light dark:bg-surface-dark border border-borderBase-light/60 dark:border-borderBase-dark/60 font-mono text-textSecondary-light dark:text-textSecondary-dark flex items-center space-x-1"
                                  >
                                    <Check className="w-2.5 h-2.5 text-status-success shrink-0" />
                                    <span className="truncate max-w-[120px]">{sk.name}</span>
                                  </span>
                                ))}
                                {ag.skills.length > 3 && (
                                  <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark self-center">
                                    +{ag.skills.length - 3} lagi
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Footer info */}
                            <div className="pt-2 border-t border-borderBase-light/50 dark:border-borderBase-dark/50 flex items-center justify-between text-[11px]">
                              <span className="text-textMuted-light dark:text-textMuted-dark flex items-center space-x-1 font-mono">
                                <Cpu className="w-3 h-3 text-accent" />
                                <span className="truncate max-w-[140px]">{ag.llm_model || ag.engine_adapter}</span>
                              </span>
                              <span className="text-accent font-semibold flex items-center space-x-1 group-hover:translate-x-0.5 transition-transform">
                                <span>Lihat Profil</span>
                                <ArrowRight className="w-3 h-3" />
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-textMuted-light dark:text-textMuted-dark bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/30 rounded-xl border border-dashed border-borderBase-light dark:border-borderBase-dark">
                        Tidak ada agen yang sesuai dengan pencarian di divisi ini.
                      </div>
                    )}

                    {/* Section B: Roles Catalog in This Division */}
                    <div className="pt-4 border-t border-borderBase-light dark:border-borderBase-dark space-y-2.5">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-textSecondary-light dark:text-textSecondary-dark flex items-center space-x-1.5">
                          <Briefcase className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Katalog Jabatan di Divisi Ini ({dirRoles.length})</span>
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
                        {dirRoles.map((r) => {
                          const assigned = agents.filter(
                            (a) => a.role_id === r.id || (a.role_name && a.role_name.toLowerCase().includes(r.code.toLowerCase()))
                          );

                          return (
                            <div
                              key={r.id}
                              className="p-2.5 rounded-lg border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-[10px] font-bold text-accent px-1.5 py-0.5 rounded bg-accent/10">
                                  {r.code}
                                </span>
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold ${
                                    assigned.length > 0
                                      ? "bg-status-success/15 text-status-success"
                                      : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark"
                                  }`}
                                >
                                  {assigned.length > 0 ? `${assigned.length} Agen` : "Lowong"}
                                </span>
                              </div>

                              <div className="font-semibold text-textPrimary-light dark:text-textPrimary-dark truncate">
                                {r.name}
                              </div>

                              {assigned.length > 0 ? (
                                <div className="flex items-center space-x-1 pt-1 border-t border-borderBase-light/40 dark:border-borderBase-dark/40">
                                  <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                                    Diisi:
                                  </span>
                                  {assigned.slice(0, 2).map((ag) => (
                                    <button
                                      key={ag.id}
                                      onClick={() => setSelectedAgent(ag)}
                                      className="text-[10px] font-semibold text-accent hover:underline truncate max-w-[120px]"
                                    >
                                      {ag.name}
                                    </button>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-[10px] text-textMuted-light dark:text-textMuted-dark italic pt-1 border-t border-borderBase-light/40 dark:border-borderBase-dark/40">
                                  Belum ada agen terdaftar
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. AGENT DETAIL MODAL (INSPECT AGENT ROSTER) */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-2xl max-w-2xl w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-borderBase-light dark:border-borderBase-dark">
              <div className="flex items-center space-x-3.5">
                <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-bold text-base shadow-md">
                  <Bot className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-base font-bold text-textPrimary-light dark:text-textPrimary-dark">
                      {selectedAgent.name}
                    </h3>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold uppercase ${
                        selectedAgent.lifecycle_state === "active"
                          ? "bg-status-success/15 text-status-success border border-status-success/30"
                          : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark"
                      }`}
                    >
                      {selectedAgent.lifecycle_state}
                    </span>
                  </div>
                  <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                    {selectedAgent.title} • {selectedAgent.department_name}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedAgent(null)}
                className="p-1.5 rounded-lg hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Stats & Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
              <div className="p-2.5 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark space-y-0.5">
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark block uppercase font-mono">
                  Divisi Kerja
                </span>
                <span className="font-semibold truncate block">
                  {selectedAgent.department_name || selectedAgent.department_id}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark space-y-0.5">
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark block uppercase font-mono">
                  Jabatan Spesialis
                </span>
                <span className="font-semibold truncate block">
                  {selectedAgent.role_name || selectedAgent.role_id}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark space-y-0.5">
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark block uppercase font-mono">
                  Status Kualifikasi
                </span>
                <span className="font-semibold text-status-success flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span className="capitalize">{selectedAgent.qualification_state}</span>
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark space-y-0.5">
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark block uppercase font-mono">
                  Kapasitas Beban
                </span>
                <span className="font-semibold font-mono">
                  {selectedAgent.current_concurrency} / {selectedAgent.max_concurrency} Task
                </span>
              </div>
            </div>

            {/* Engine & Model */}
            <div className="p-3 rounded-xl bg-surfaceSecondary-light/70 dark:bg-surfaceSecondary-dark/70 border border-borderBase-light dark:border-borderBase-dark flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-accent" />
                <div>
                  <div className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                    Mesin Eksekusi: {selectedAgent.engine_adapter.toUpperCase()}
                  </div>
                  <div className="text-[11px] text-textMuted-light dark:text-textMuted-dark font-mono">
                    Model LLM: {selectedAgent.llm_model || "Default Model"} ({selectedAgent.llm_profile_name || "Built-in"})
                  </div>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] bg-accent/10 text-accent font-mono font-semibold">
                Profile v{selectedAgent.current_profile_version}
              </span>
            </div>

            {/* System Persona / Instructions */}
            <div className="space-y-1.5 text-xs">
              <div className="font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-1.5">
                <FileText className="w-3.5 h-3.5 text-accent" />
                <span>Instruksi Sistem & Mandat Peran (System Persona)</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-mono text-[11px] leading-relaxed text-textSecondary-light dark:text-textSecondary-dark whitespace-pre-wrap">
                {selectedAgent.instructions || "Tidak ada instruksi khusus."}
              </div>
            </div>

            {/* Verified Skills */}
            <div className="space-y-2 text-xs">
              <div className="font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-accent" />
                <span>Matriks Kompetensi Terverifikasi ({selectedAgent.skills.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {selectedAgent.skills.map((sk) => (
                  <div
                    key={sk.id}
                    className="p-2.5 rounded-lg bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark flex items-start space-x-2"
                  >
                    <CheckCircle2 className="w-4 h-4 text-status-success shrink-0 mt-0.5" />
                    <div>
                      <div className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                        {sk.name}
                      </div>
                      <div className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                        {sk.verified_evidence || "Lulus Uji Kompetensi SDLC"}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <Link
                href="/workforce"
                className="text-xs text-accent hover:underline flex items-center space-x-1.5 font-medium"
              >
                <span>Buka Pengaturan Lengkap di Workforce Hub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>
              <Button size="sm" onClick={() => setSelectedAgent(null)}>
                Tutup
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Propose Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <h3 className="text-sm font-semibold">Usulkan Jabatan Baru</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleProposeRole} className="space-y-3 text-xs">
              <div>
                <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                  Nama Jabatan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Senior Security Auditor"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                    Kode Unik Jabatan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SEC_AUDITOR"
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-mono uppercase focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                    Divisi *
                  </label>
                  <select
                    value={roleDeptId}
                    onChange={(e) => setRoleDeptId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                  Deskripsi Jabatan
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsikan peran dan output tugas spesialis ini..."
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                  Keahlian Utama (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  placeholder="OWASP, Penetration Testing, Python, Kali Linux"
                  value={roleSkills}
                  onChange={(e) => setRoleSkills(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                  Tanggung Jawab Utama (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  placeholder="Audit kode keamanan, Scanning kerentanan, Validasi enkripsi"
                  value={roleResp}
                  onChange={(e) => setRoleResp(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Simpan Jabatan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
