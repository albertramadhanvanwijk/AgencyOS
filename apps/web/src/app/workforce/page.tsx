"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge, StatusVariant } from "../../components/ui/StatusBadge";
import { CapacityIndicator } from "../../components/ui/CapacityIndicator";
import { Button } from "../../components/ui/Button";
import { TableSkeleton } from "../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  Plus,
  Filter,
  Search,
  X,
  ShieldCheck,
  Check,
  Cpu,
  Layers,
  Sparkles,
  Info,
  Dices,
} from "lucide-react";
import { generateIndonesianName } from "../../utils/nameGenerator";

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

interface LLMConfig {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  model: string;
  is_default: boolean;
  status: string;
  available_models: string[];
}

interface Department {
  id: string;
  name: string;
  code: string;
}

interface JobRole {
  id: string;
  name: string;
  code: string;
  department_id: string;
}

export default function WorkforcePage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [llms, setLlms] = useState<LLMConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");

  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newDeptId, setNewDeptId] = useState("");
  const [newRoleId, setNewRoleId] = useState("");
  const [newLLMProfileId, setNewLLMProfileId] = useState("");
  const [newLLMModel, setNewLLMModel] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newSkills, setNewSkills] = useState("");

  // Inspect Drawer State
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [drawerLLMProfileId, setDrawerLLMProfileId] = useState("");
  const [drawerLLMModel, setDrawerLLMModel] = useState("");
  const [updatingLLM, setUpdatingLLM] = useState(false);

  // Active default LLM
  const defaultLLM = llms.find((l) => l.is_default) || llms[0];

  // Helper to get active models for a profile or default
  const getAvailableModelsForProfile = (profileId: string): string[] => {
    const prof = llms.find((l) => l.id === profileId) || defaultLLM;
    if (!prof) return [];
    const set = new Set<string>();
    if (prof.model) set.add(prof.model);
    if (Array.isArray(prof.available_models)) {
      prof.available_models.forEach((m) => {
        if (m && typeof m === "string") set.add(m);
      });
    }
    return Array.from(set);
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [agentsRes, deptsRes, rolesRes, llmsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/v1/workforce/agents"),
        fetch("http://127.0.0.1:8000/api/v1/organization/departments"),
        fetch("http://127.0.0.1:8000/api/v1/organization/roles"),
        fetch("http://127.0.0.1:8000/api/v1/system/llms"),
      ]);

      if (!agentsRes.ok || !deptsRes.ok || !rolesRes.ok) {
        throw new Error("Failed to load workforce data from API.");
      }

      const agentsData = await agentsRes.json();
      const deptsData = await deptsRes.json();
      const rolesData = await rolesRes.json();
      const llmsData = llmsRes.ok ? await llmsRes.json() : [];

      setAgents(agentsData);
      setDepartments(deptsData);
      setRoles(rolesData);
      setLlms(llmsData);
      if (deptsData.length > 0) setNewDeptId(deptsData[0].id);
      if (rolesData.length > 0) setNewRoleId(rolesData[0].id);
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
    fetchData();
  }, []);

  const handleCreateAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newDeptId || !newRoleId) return;

    try {
      setSubmitting(true);
      setModalError(null);
      const skillsArray = newSkills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload = {
        name: newName.trim(),
        title: newTitle.trim() || undefined,
        department_id: newDeptId,
        role_id: newRoleId,
        lifecycle_state: "draft",
        availability_state: "available",
        qualification_state: "not_tested",
        max_concurrency: 1,
        engine_adapter: "mock",
        llm_profile_id: newLLMProfileId ? newLLMProfileId.trim() : undefined,
        llm_model: newLLMModel ? newLLMModel.trim() : undefined,
        instructions: newInstructions.trim() || undefined,
        initial_skills: skillsArray,
      };

      const res = await fetch("http://127.0.0.1:8000/api/v1/workforce/agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to create agent");
      }

      setIsModalOpen(false);
      setNewName("");
      setNewTitle("");
      setNewLLMProfileId("");
      setNewLLMModel("");
      setNewInstructions("");
      setNewSkills("");
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setModalError(err.message);
      } else {
        setModalError("Failed to create agent");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateAgentLLM = async () => {
    if (!selectedAgent) return;
    try {
      setUpdatingLLM(true);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/workforce/agents/${selectedAgent.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_profile_id: drawerLLMProfileId || "",
          llm_model: drawerLLMModel || "",
        }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Gagal memperbarui model LLM agen");
      }

      const updatedAgent = await res.json();
      setSelectedAgent(updatedAgent);
      setAgents((prev) => prev.map((a) => (a.id === updatedAgent.id ? updatedAgent : a)));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Gagal memperbarui LLM agen");
    } finally {
      setUpdatingLLM(false);
    }
  };

  const getLifecycleBadge = (state: string): { variant: StatusVariant; label: string } => {
    switch (state) {
      case "active":
        return { variant: "success", label: "Active" };
      case "testing":
        return { variant: "warning", label: "Sandbox Testing" };
      case "pending_approval":
        return { variant: "warning", label: "Pending Approval" };
      case "paused":
        return { variant: "neutral", label: "Paused" };
      case "retired":
        return { variant: "danger", label: "Retired" };
      case "draft":
      default:
        return { variant: "neutral", label: "Draft" };
    }
  };

  const getQualificationBadge = (state: string): { variant: StatusVariant; label: string } => {
    switch (state) {
      case "passed":
        return { variant: "success", label: "Qualified" };
      case "in_progress":
        return { variant: "info", label: "In Progress" };
      case "failed":
        return { variant: "danger", label: "Failed" };
      case "not_tested":
      default:
        return { variant: "neutral", label: "Not Tested" };
    }
  };

  // Filtered agents
  const filteredAgents = agents.filter((agent) => {
    const matchesSearch =
      agent.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (agent.title && agent.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (agent.role_name && agent.role_name.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesDept = deptFilter === "all" || agent.department_id === deptFilter;
    const matchesLifecycle = lifecycleFilter === "all" || agent.lifecycle_state === lifecycleFilter;

    return matchesSearch && matchesDept && matchesLifecycle;
  });

  return (
    <AppShell>
      <PageHeader
        title="Workforce Directory"
        description="Supervised AI agent identities, role catalogs, profile versions, and qualification evidence."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Workforce" },
        ]}
        actions={
          <Button
            size="sm"
            onClick={() => {
              setNewName(generateIndonesianName());
              setModalError(null);
              setIsModalOpen(true);
            }}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Agent Identity
          </Button>
        }
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-surface-light dark:bg-surface-dark p-3 rounded-md border border-borderBase-light dark:border-borderBase-dark">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter by agent name or role..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark placeholder:text-textMuted-light dark:placeholder:text-textMuted-dark focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        <div className="flex items-center space-x-2">
          {/* Department Filter */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="h-8 px-2 text-xs bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">All Departments</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Lifecycle Filter */}
          <select
            value={lifecycleFilter}
            onChange={(e) => setLifecycleFilter(e.target.value)}
            className="h-8 px-2 text-xs bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="all">All Lifecycles</option>
            <option value="active">Active</option>
            <option value="testing">Sandbox Testing</option>
            <option value="draft">Draft</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : filteredAgents.length === 0 ? (
        <EmptyState
          title="No agents found"
          description="No agent identities match the current search or filters."
          actionLabel="Clear Filters"
          onAction={() => {
            setSearchTerm("");
            setDeptFilter("all");
            setLifecycleFilter("all");
          }}
        />
      ) : (
        <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-b border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
                <tr>
                  <th className="py-2.5 px-4">Identity</th>
                  <th className="py-2.5 px-4">Role & Title</th>
                  <th className="py-2.5 px-4">Department</th>
                  <th className="py-2.5 px-4">Lifecycle</th>
                  <th className="py-2.5 px-4">Qualification</th>
                  <th className="py-2.5 px-4">Model LLM</th>
                  <th className="py-2.5 px-4 w-44">Concurrency</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
                {filteredAgents.map((agent) => {
                  const lifecycleBadge = getLifecycleBadge(agent.lifecycle_state);
                  const qualificationBadge = getQualificationBadge(agent.qualification_state);

                  return (
                    <tr
                      key={agent.id}
                      className="hover:bg-surfaceSecondary-light/50 dark:hover:bg-surfaceSecondary-dark/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                        <div className="flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
                          <span className="truncate">{agent.name}</span>
                          <span className="text-[10px] font-mono text-textMuted-light dark:text-textMuted-dark">
                            v{agent.current_profile_version}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-textPrimary-light dark:text-textPrimary-dark truncate">
                            {agent.title || agent.role_name}
                          </span>
                          <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark truncate">
                            {agent.role_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-textMuted-light dark:text-textMuted-dark">
                        {agent.department_name}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge variant={lifecycleBadge.variant} label={lifecycleBadge.label} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge variant={qualificationBadge.variant} label={qualificationBadge.label} />
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col space-y-0.5">
                          <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 max-w-fit">
                            <Sparkles className="w-3 h-3 text-purple-500" />
                            <span className="font-semibold">{agent.llm_model || defaultLLM?.model || "gemini-3.8-flash"}</span>
                          </span>
                          <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                            {agent.llm_profile_id ? (agent.llm_profile_name || "Custom LLM") : "Default Sistem"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <CapacityIndicator
                          current={agent.current_concurrency}
                          max={agent.max_concurrency}
                          showNumbers={true}
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedAgent(agent);
                            setDrawerLLMProfileId(agent.llm_profile_id || "");
                            setDrawerLLMModel(agent.llm_model || "");
                          }}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Agent Drawer Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-semibold">{selectedAgent.name}</h2>
                  <StatusBadge variant="simulated" label={`Profile v${selectedAgent.current_profile_version}`} />
                </div>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  {selectedAgent.title} • {selectedAgent.department_name}
                </p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="font-semibold block mb-1">System Instructions / Persona:</span>
                <div className="p-3 bg-canvas-light dark:bg-canvas-dark rounded border border-borderBase-light dark:border-borderBase-dark font-mono text-[11px] leading-relaxed">
                  {selectedAgent.instructions || "No specific instructions assigned."}
                </div>
              </div>

              <div>
                <span className="font-semibold block mb-1">Skills & Verified Evidence:</span>
                {selectedAgent.skills && selectedAgent.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {selectedAgent.skills.map((s) => (
                      <span
                        key={s.id}
                        className={`px-2 py-0.5 rounded text-[11px] font-mono border flex items-center space-x-1 ${
                          s.is_verified
                            ? "bg-status-success/10 text-status-success border-status-success/30"
                            : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark"
                        }`}
                      >
                        {s.is_verified && <Check className="w-3 h-3 mr-0.5" />}
                        <span>{s.name}</span>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-textMuted-light dark:text-textMuted-dark">No skills recorded.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-borderBase-light dark:border-borderBase-dark">
                <div>
                  <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">Lifecycle:</span>
                  <span className="font-semibold">{selectedAgent.lifecycle_state.toUpperCase()}</span>
                </div>
                <div>
                  <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">Qualification:</span>
                  <span className="font-semibold">{selectedAgent.qualification_state.toUpperCase()}</span>
                </div>
              </div>

              {/* LLM Model & Engine Assignment */}
              <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark">
                <span className="font-semibold block mb-1.5 flex items-center space-x-1.5 text-textPrimary-light dark:text-textPrimary-dark">
                  <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                  <span>Model LLM & Engine:</span>
                </span>
                <div className="p-3 bg-canvas-light dark:bg-canvas-dark rounded border border-borderBase-light dark:border-borderBase-dark space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-textMuted-light dark:text-textMuted-dark text-[11px]">Model Aktif Sekarang:</span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium">
                      <span>{selectedAgent.llm_model || defaultLLM?.model || "gemini-3.8-flash"}</span>
                    </span>
                  </div>

                  <div className="space-y-2.5 pt-2 border-t border-borderBase-light/50 dark:border-borderBase-dark/50">
                    <div>
                      <label className="text-[11px] text-textMuted-light dark:text-textMuted-dark block mb-1 font-medium">
                        1. Pilih LLM Provider:
                      </label>
                      <select
                        value={drawerLLMProfileId}
                        onChange={(e) => {
                          const profId = e.target.value;
                          setDrawerLLMProfileId(profId);
                          const prof = llms.find((l) => l.id === profId);
                          if (prof) {
                            setDrawerLLMModel(prof.model);
                          } else {
                            setDrawerLLMModel("");
                          }
                        }}
                        className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="">
                          Default Sistem (Mengikuti: {defaultLLM?.name || "Google Gemini"} — {defaultLLM?.model || "gemini-3.8-flash"})
                        </option>
                        {llms.map((llm) => (
                          <option key={llm.id} value={llm.id}>
                            {llm.name} ({llm.model}) {llm.is_default ? "★ Default" : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-textMuted-light dark:text-textMuted-dark block font-medium">
                          2. Pilih Model AI dari LLM yang Aktif:
                        </label>
                        <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                          {getAvailableModelsForProfile(drawerLLMProfileId).length} model terdeteksi
                        </span>
                      </div>
                      <select
                        value={drawerLLMModel}
                        onChange={(e) => setDrawerLLMModel(e.target.value)}
                        className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                      >
                        <option value="">
                          {drawerLLMProfileId
                            ? `Model Utama Provider (${llms.find((l) => l.id === drawerLLMProfileId)?.model || "Default"})`
                            : `Model Default Sistem (${defaultLLM?.model || "gemini-3.8-flash"})`}
                        </option>
                        {getAvailableModelsForProfile(drawerLLMProfileId).map((m) => (
                          <option key={m} value={m}>
                            {m} {m === (llms.find((l) => l.id === drawerLLMProfileId)?.model || defaultLLM?.model) ? "★ (Model Utama)" : ""}
                          </option>
                        ))}
                      </select>

                      {/* Clickable tags for available models */}
                      {getAvailableModelsForProfile(drawerLLMProfileId).length > 0 && (
                        <div className="mt-2 pt-2 border-t border-borderBase-light/40 dark:border-borderBase-dark/40">
                          <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark block mb-1">
                            Model yang aktif di provider ini:
                          </span>
                          <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                            {getAvailableModelsForProfile(drawerLLMProfileId).slice(0, 10).map((m) => {
                              const isSelected = drawerLLMModel === m || (!drawerLLMModel && m === (llms.find((l) => l.id === drawerLLMProfileId)?.model || defaultLLM?.model));
                              return (
                                <button
                                  key={m}
                                  type="button"
                                  onClick={() => setDrawerLLMModel(m)}
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                                    isSelected
                                      ? "bg-accent/15 text-accent border-accent/40 font-semibold"
                                      : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                                  }`}
                                >
                                  {m}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        size="sm"
                        onClick={handleUpdateAgentLLM}
                        isLoading={updatingLLM}
                        disabled={
                          drawerLLMProfileId === (selectedAgent.llm_profile_id || "") &&
                          drawerLLMModel === (selectedAgent.llm_model || "")
                        }
                      >
                        Terapkan Perubahan Model
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setSelectedAgent(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Agent Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateAgent}
            className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <h2 className="text-base font-semibold">Create New Agent Identity</h2>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Registers identity in Draft state awaiting qualification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2 rounded bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-medium">Agent Name *</label>
                  <button
                    type="button"
                    onClick={() => setNewName(generateIndonesianName())}
                    className="inline-flex items-center space-x-1 text-[11px] text-accent hover:underline font-medium cursor-pointer"
                    title="Generate nama Indonesia baru (2 - 3 kata)"
                  >
                    <Dices className="w-3 h-3" />
                    <span>Acak Nama Indonesia</span>
                  </button>
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Budi Santoso, Rian Pratama Putra"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
                <p className="text-[10px] text-textMuted-light dark:text-textMuted-dark mt-1">
                  Nama agen format Indonesia (maksimal 2 - 3 kata). Agen diizinkan memiliki nama yang sama dengan pembeda ID unik sistem.
                </p>
              </div>

              <div>
                <label className="font-medium block mb-1">Professional Title</label>
                <input
                  type="text"
                  placeholder="e.g. Full-Stack Systems Specialist"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium block mb-1">Department *</label>
                  <select
                    value={newDeptId}
                    onChange={(e) => setNewDeptId(e.target.value)}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium block mb-1">Job Role *</label>
                  <select
                    value={newRoleId}
                    onChange={(e) => setNewRoleId(e.target.value)}
                    className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* LLM Provider & Model Assignment */}
              <div className="space-y-2 p-3 rounded bg-surfaceSecondary-light/50 dark:bg-surfaceSecondary-dark/50 border border-borderBase-light dark:border-borderBase-dark">
                <div>
                  <label className="font-medium block mb-1 text-[11px]">1. Pilih LLM Provider</label>
                  <select
                    value={newLLMProfileId}
                    onChange={(e) => {
                      const profId = e.target.value;
                      setNewLLMProfileId(profId);
                      const prof = llms.find((l) => l.id === profId);
                      if (prof) {
                        setNewLLMModel(prof.model);
                      } else {
                        setNewLLMModel("");
                      }
                    }}
                    className="w-full h-8 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark text-xs focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">
                      Default Sistem (Mengikuti: {defaultLLM?.name || "Google Gemini"} — {defaultLLM?.model || "gemini-3.8-flash"})
                    </option>
                    {llms.map((llm) => (
                      <option key={llm.id} value={llm.id}>
                        {llm.name} ({llm.model}) {llm.is_default ? "★ Default" : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="font-medium text-[11px]">2. Pilih Model AI dari LLM yang Aktif</label>
                    <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                      {getAvailableModelsForProfile(newLLMProfileId).length} model terdeteksi
                    </span>
                  </div>
                  <select
                    value={newLLMModel}
                    onChange={(e) => setNewLLMModel(e.target.value)}
                    className="w-full h-8 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark text-xs font-mono focus:outline-none focus:ring-1 focus:ring-accent"
                  >
                    <option value="">
                      {newLLMProfileId
                        ? `Model Utama Provider (${llms.find((l) => l.id === newLLMProfileId)?.model || "Default"})`
                        : `Model Default Sistem (${defaultLLM?.model || "gemini-3.8-flash"})`}
                    </option>
                    {getAvailableModelsForProfile(newLLMProfileId).map((m) => (
                      <option key={m} value={m}>
                        {m} {m === (llms.find((l) => l.id === newLLMProfileId)?.model || defaultLLM?.model) ? "★ (Model Utama)" : ""}
                      </option>
                    ))}
                  </select>

                  {/* Clickable tags for available models */}
                  {getAvailableModelsForProfile(newLLMProfileId).length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-borderBase-light/40 dark:border-borderBase-dark/40">
                      <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark block mb-1">
                        Model yang aktif di provider ini:
                      </span>
                      <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                        {getAvailableModelsForProfile(newLLMProfileId).slice(0, 10).map((m) => {
                          const isSelected = newLLMModel === m || (!newLLMModel && m === (llms.find((l) => l.id === newLLMProfileId)?.model || defaultLLM?.model));
                          return (
                            <button
                              key={m}
                              type="button"
                              onClick={() => setNewLLMModel(m)}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                                isSelected
                                  ? "bg-accent/15 text-accent border-accent/40 font-semibold"
                                  : "bg-surface-light dark:bg-surface-dark border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                              }`}
                            >
                              {m}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="font-medium block mb-1">Initial Skills (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Python, FastAPI, Docker, SQL"
                  value={newSkills}
                  onChange={(e) => setNewSkills(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">System Persona / Instructions</label>
                <textarea
                  rows={3}
                  placeholder="Specific technical execution rules and boundaries..."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full p-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={submitting}>
                Save Agent Identity
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
