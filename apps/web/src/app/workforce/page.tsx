"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Bot,
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
  has_api_key?: boolean;
  masked_api_key?: string;
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

export interface ModelCatalogItem {
  id: string;
  name: string;
  tier: "free" | "pro" | "preview" | "open" | "custom";
  tierLabel: string;
  categoryGroup: string;
  badgeStyle: string;
  description: string;
  isMainForProvider?: boolean;
}

interface AgentModelSelectorProps {
  selectedProfileId: string;
  selectedModel: string;
  onProfileChange: (profId: string) => void;
  onModelChange: (model: string) => void;
  activeLlms: LLMConfig[];
  defaultLLM?: LLMConfig;
  catalog: ModelCatalogItem[];
  tierFilter: string;
  onTierFilterChange: (tier: string) => void;
  isSurfaceSecondary?: boolean;
  noCardWrapper?: boolean;
}

function AgentModelSelector({
  selectedProfileId,
  selectedModel,
  onProfileChange,
  onModelChange,
  activeLlms,
  defaultLLM,
  catalog,
  tierFilter,
  onTierFilterChange,
  isSurfaceSecondary = false,
  noCardWrapper = false,
}: AgentModelSelectorProps) {
  const [modelSearch, setModelSearch] = useState("");

  const currentProvider = activeLlms.find((l) => l.id === selectedProfileId) || defaultLLM;
  const currentTargetModel = currentProvider?.model || defaultLLM?.model || "gemini-3.8-flash";
  const activeEffectiveModel = selectedModel || currentTargetModel;
  const activeModelItem = catalog.find((c) => c.id === activeEffectiveModel) || catalog.find((c) => c.isMainForProvider) || catalog[0];

  // Filter catalog by active tier and search term
  const filteredCatalog = useMemo(() => {
    let list = catalog;
    if (tierFilter !== "all") {
      list = list.filter((c) => c.tier === tierFilter);
    }
    if (modelSearch.trim()) {
      const q = modelSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.id.toLowerCase().includes(q) ||
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.tierLabel.toLowerCase().includes(q)
      );
    }
    return list;
  }, [catalog, tierFilter, modelSearch]);

  const countFree = catalog.filter((c) => c.tier === "free").length;
  const countPro = catalog.filter((c) => c.tier === "pro").length;
  const countPreview = catalog.filter((c) => c.tier === "preview").length;
  const countOpen = catalog.filter((c) => c.tier === "open").length;

  return (
    <div
      className={`w-full max-w-full min-w-0 box-border overflow-hidden ${
        noCardWrapper
          ? "space-y-3"
          : `space-y-3 p-3 rounded border border-borderBase-light dark:border-borderBase-dark ${
              isSurfaceSecondary
                ? "bg-surfaceSecondary-light/50 dark:bg-surfaceSecondary-dark/50"
                : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark"
            }`
      }`}
    >
      {/* 1. LLM Provider Dropdown */}
      <div className="w-full min-w-0">
        <div className="flex items-center justify-between mb-1 gap-2">
          <label className="font-semibold block text-[11px] text-textPrimary-light dark:text-textPrimary-dark truncate">
            1. Pilih LLM Provider:
          </label>
          <span className="text-[10px] text-accent font-medium shrink-0">
            {activeLlms.length} Aktif di Settings
          </span>
        </div>
        <select
          value={selectedProfileId}
          onChange={(e) => onProfileChange(e.target.value)}
          className="w-full max-w-full min-w-0 block truncate h-8 px-2 bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark text-xs focus:outline-none focus:ring-1 focus:ring-accent"
        >
          <option value="">
            Default Sistem ({defaultLLM?.name || "Google Gemini"} — {defaultLLM?.model || "gemini-3.8-flash"})
          </option>
          {activeLlms.map((llm) => (
            <option key={llm.id} value={llm.id}>
              {llm.name} ({llm.provider}) {llm.is_default ? "★ Default" : ""} {llm.has_api_key ? "• API Key Aktif" : ""}
            </option>
          ))}
        </select>
        <p className="text-[10px] text-textMuted-light dark:text-textMuted-dark mt-1 truncate">
          Hanya menampilkan provider aktif & terverifikasi dari Settings.
        </p>
      </div>

      {/* 2. Model AI Selection */}
      <div className="pt-2 border-t border-borderBase-light/60 dark:border-borderBase-dark/60 space-y-2 w-full min-w-0">
        <div className="flex items-center justify-between gap-2">
          <label className="font-semibold text-[11px] text-textPrimary-light dark:text-textPrimary-dark truncate">
            2. Pilih Model AI dari LLM yang Aktif:
          </label>
          <span className="text-[10px] font-mono text-purple-600 dark:text-purple-400 font-medium shrink-0">
            {catalog.length} model tersedia
          </span>
        </div>

        {/* Selected Model Preview Card */}
        <div className="p-2 rounded bg-surface-light dark:bg-surface-dark border border-accent/40 shadow-xs flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0 flex-1">
            <span className="w-2 h-2 rounded-full bg-accent shrink-0 animate-pulse" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center space-x-2 flex-wrap gap-y-0.5">
                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">Model Aktif:</span>
                <span className="font-mono font-bold text-xs text-accent truncate">
                  {activeEffectiveModel}
                </span>
                {activeModelItem && (
                  <span className={`text-[9px] font-semibold px-1.5 py-0.2 rounded border shrink-0 ${activeModelItem.badgeStyle}`}>
                    {activeModelItem.tierLabel}
                  </span>
                )}
                {selectedModel && (
                  <span className="text-[9px] font-medium text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1 rounded">
                    Manual
                  </span>
                )}
              </div>
              <p className="text-[10px] text-textMuted-light dark:text-textMuted-dark truncate mt-0.5">
                {activeModelItem?.description || "Model aktif untuk agen ini"}
              </p>
            </div>
          </div>
          {selectedModel && (
            <button
              type="button"
              onClick={() => onModelChange("")}
              className="text-[10px] text-textMuted-light dark:text-textMuted-dark hover:text-accent underline shrink-0 cursor-pointer"
              title="Gunakan model default provider"
            >
              Reset Default
            </button>
          )}
        </div>

        {/* Visual Model Catalog with Tier Filters */}
        <div className="space-y-1.5 pt-1 w-full min-w-0">
          <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark block">
            Pilih model AI di bawah (klik kartu untuk memilih):
          </span>

          {/* Tier Tabs & Search */}
          <div className="flex items-center justify-between gap-1.5 pb-0.5">
            <div className="flex items-center space-x-1 overflow-x-auto text-[10px] min-w-0 flex-1">
              <button
                type="button"
                onClick={() => onTierFilterChange("all")}
                className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
                  tierFilter === "all"
                    ? "bg-accent text-white font-semibold"
                    : "bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light hover:text-textPrimary-light"
                }`}
              >
                Semua ({catalog.length})
              </button>
              <button
                type="button"
                onClick={() => onTierFilterChange("free")}
                className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
                  tierFilter === "free"
                    ? "bg-emerald-600 text-white font-semibold"
                    : "bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light hover:text-textPrimary-light"
                }`}
              >
                ⚡ Free ({countFree})
              </button>
              <button
                type="button"
                onClick={() => onTierFilterChange("pro")}
                className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
                  tierFilter === "pro"
                    ? "bg-blue-600 text-white font-semibold"
                    : "bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light hover:text-textPrimary-light"
                }`}
              >
                💎 Pro ({countPro})
              </button>
              <button
                type="button"
                onClick={() => onTierFilterChange("preview")}
                className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
                  tierFilter === "preview"
                    ? "bg-purple-600 text-white font-semibold"
                    : "bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light hover:text-textPrimary-light"
                }`}
              >
                🚀 Preview ({countPreview})
              </button>
              {countOpen > 0 && (
                <button
                  type="button"
                  onClick={() => onTierFilterChange("open")}
                  className={`px-2 py-0.5 rounded font-medium transition-colors shrink-0 ${
                    tierFilter === "open"
                      ? "bg-amber-600 text-white font-semibold"
                      : "bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light hover:text-textPrimary-light"
                  }`}
                >
                  🌐 Open ({countOpen})
                </button>
              )}
            </div>

            <div className="relative w-24 sm:w-28 shrink-0">
              <input
                type="text"
                placeholder="Cari..."
                value={modelSearch}
                onChange={(e) => setModelSearch(e.target.value)}
                className="w-full h-6 px-1.5 text-[10px] bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark placeholder:text-textMuted-light focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-1 max-h-48 overflow-y-auto pr-0.5 w-full min-w-0">
            {filteredCatalog.map((item) => {
              const isSelected = selectedModel === item.id || (!selectedModel && item.isMainForProvider);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onModelChange(item.id)}
                  className={`w-full max-w-full min-w-0 box-border text-left p-2 rounded border transition-all flex flex-col space-y-0.5 ${
                    isSelected
                      ? "border-accent bg-accent/10 shadow-xs ring-1 ring-accent"
                      : "border-borderBase-light/60 dark:border-borderBase-dark/60 bg-surface-light dark:bg-surface-dark hover:border-accent/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 w-full min-w-0">
                    <div className="flex items-center space-x-1.5 truncate min-w-0 flex-1">
                      {isSelected ? (
                        <Check className="w-3.5 h-3.5 text-accent shrink-0" />
                      ) : (
                        <Bot className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark shrink-0" />
                      )}
                      <span className="font-mono font-semibold text-xs text-textPrimary-light dark:text-textPrimary-dark truncate">
                        {item.id}
                      </span>
                      {item.isMainForProvider && (
                        <span className="text-[9px] font-medium text-accent shrink-0">★ Utama</span>
                      )}
                    </div>
                    <span
                      className={`text-[9px] font-medium px-1.5 py-0.2 rounded border shrink-0 ${item.badgeStyle}`}
                    >
                      {item.tierLabel}
                    </span>
                  </div>
                  <p className="text-[10px] text-textMuted-light dark:text-textMuted-dark leading-tight line-clamp-1 w-full truncate">
                    {item.description}
                  </p>
                </button>
              );
            })}
          </div>

          {/* Tip / Explainer */}
          <div className="p-2 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light/40 dark:border-borderBase-dark/40 text-[10px] text-textMuted-light dark:text-textMuted-dark flex items-start space-x-1.5 leading-relaxed w-full min-w-0">
            <Info className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">Kesesuaian Akun:</span> Akun Free Tier (Google AI Studio) dapat memakai model <span className="text-emerald-600 dark:text-emerald-400 font-medium">Free Tier / Flash</span> secara gratis dengan kuota harian besar. Akun Pro/Pay-as-you-go dapat memanfaatkan model <span className="text-blue-600 dark:text-blue-400 font-medium">Pro Tier</span> untuk reasoning kompleks.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
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
  const [modalTierFilter, setModalTierFilter] = useState<string>("all");

  // Inspect Drawer State
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [drawerLLMProfileId, setDrawerLLMProfileId] = useState("");
  const [drawerLLMModel, setDrawerLLMModel] = useState("");
  const [drawerTierFilter, setDrawerTierFilter] = useState<string>("all");
  const [updatingLLM, setUpdatingLLM] = useState(false);

  // Active default LLM
  const defaultLLM = llms.find((l) => l.is_default) || llms[0];

  // Active LLM providers synchronized with Settings
  // Only shows providers that have an API key configured or are verified in Settings
  const activeLlms = useMemo(() => {
    const configured = llms.filter(
      (l) => l.has_api_key || l.status === "verified" || l.status === "warning"
    );
    if (configured.length === 0 && defaultLLM) {
      return [defaultLLM];
    }
    return configured;
  }, [llms, defaultLLM]);

  // Model catalog generator with full Free/Pro/Preview tier mapping
  const getAvailableModelsCatalog = (profileId: string): ModelCatalogItem[] => {
    const prof = llms.find((l) => l.id === profileId) || defaultLLM;
    const targetModel = prof?.model || defaultLLM?.model || "gemini-3.8-flash";
    const providerName = (prof?.provider || prof?.name || "").toLowerCase();
    const baseUrl = (prof?.base_url || "").toLowerCase();

    const isGemini = providerName.includes("gemini") || baseUrl.includes("generativelanguage.googleapis.com");
    const isOpenAI = providerName.includes("openai") || baseUrl.includes("api.openai.com");
    const isAnthropic = providerName.includes("claude") || providerName.includes("anthropic") || baseUrl.includes("anthropic.com");
    const isOllama = providerName.includes("ollama") || baseUrl.includes("localhost") || baseUrl.includes("11434");

    let catalog: ModelCatalogItem[] = [];

    if (isGemini || (!isOpenAI && !isAnthropic && !isOllama)) {
      catalog = [
        // Free Tier / Flash
        {
          id: "gemini-2.5-flash",
          name: "Gemini 2.5 Flash",
          tier: "free",
          tierLabel: "Free Tier / Kuota Luas",
          categoryGroup: "⚡ Free Tier & Kuota Tinggi (Gratis / Hemat)",
          badgeStyle: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          description: "Rekomendasi Utama: Kecepatan tinggi, multi-modal & kuota gratis harian besar (15 RPM)",
        },
        {
          id: "gemini-2.5-flash-lite",
          name: "Gemini 2.5 Flash-Lite",
          tier: "free",
          tierLabel: "Free Tier / Latensi Rendah",
          categoryGroup: "⚡ Free Tier & Kuota Tinggi (Gratis / Hemat)",
          badgeStyle: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          description: "Ultra cepat, konsumsi resource minim, ideal untuk agent loop berulang",
        },
        {
          id: "gemini-2.0-flash",
          name: "Gemini 2.0 Flash",
          tier: "free",
          tierLabel: "Free Tier / Standar",
          categoryGroup: "⚡ Free Tier & Kuota Tinggi (Gratis / Hemat)",
          badgeStyle: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          description: "Versi 2.0 stabil dengan performa komprehensif untuk operasional umum",
        },
        {
          id: "gemini-1.5-flash",
          name: "Gemini 1.5 Flash",
          tier: "free",
          tierLabel: "Free Tier / Handal",
          categoryGroup: "⚡ Free Tier & Kuota Tinggi (Gratis / Hemat)",
          badgeStyle: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          description: "Model flash stabil generasi 1.5 dengan kuota gratis melimpah",
        },
        {
          id: "gemini-flash-latest",
          name: "Gemini Flash Latest",
          tier: "free",
          tierLabel: "Free Tier / Alias Terbaru",
          categoryGroup: "⚡ Free Tier & Kuota Tinggi (Gratis / Hemat)",
          badgeStyle: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          description: "Mengarah otomatis ke build Flash produksi Google paling mutakhir",
        },
        // Pro Tier / Reasoning
        {
          id: "gemini-2.5-pro",
          name: "Gemini 2.5 Pro",
          tier: "pro",
          tierLabel: "Pro Tier / Flagship Reasoning",
          categoryGroup: "💎 Pro Tier & Penalaran Mendalam (Berbayar / Tingkat Lanjut)",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Penalaran tertinggi untuk arsitektur software, algoritma kompleks & review kritis",
        },
        {
          id: "gemini-1.5-pro",
          name: "Gemini 1.5 Pro",
          tier: "pro",
          tierLabel: "Pro Tier / 2M Konteks",
          categoryGroup: "💎 Pro Tier & Penalaran Mendalam (Berbayar / Tingkat Lanjut)",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Kapasitas konteks raksasa hingga 2 juta token, membaca repositori besar",
        },
        {
          id: "gemini-3.1-pro-preview",
          name: "Gemini 3.1 Pro Preview",
          tier: "pro",
          tierLabel: "Pro Tier / Next-Gen Pro",
          categoryGroup: "💎 Pro Tier & Penalaran Mendalam (Berbayar / Tingkat Lanjut)",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Preview penalaran mutakhir generasi 3.1 untuk algorithmic engineering",
        },
        {
          id: "gemini-pro-latest",
          name: "Gemini Pro Latest",
          tier: "pro",
          tierLabel: "Pro Tier / Alias Terbaru",
          categoryGroup: "💎 Pro Tier & Penalaran Mendalam (Berbayar / Tingkat Lanjut)",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Mengarah otomatis ke versi Pro stabil produksi Google paling mutakhir",
        },
        // Next-Gen Preview
        {
          id: "gemini-3.8-flash",
          name: "Gemini 3.8 Flash",
          tier: "preview",
          tierLabel: "Default Sistem / Generasi 3.8",
          categoryGroup: "🚀 Generasi Terbaru & Preview",
          badgeStyle: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
          description: "Model default Antigravity / AgencyOS: performa eksekusi agen teroptimasi",
        },
        {
          id: "gemini-3.7-flash",
          name: "Gemini 3.7 Flash",
          tier: "preview",
          tierLabel: "Next-Gen / Hybrid Mode",
          categoryGroup: "🚀 Generasi Terbaru & Preview",
          badgeStyle: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
          description: "Model hybrid reasoning generasi 3.7 untuk sintesis koding cepat",
        },
        {
          id: "gemini-3.6-flash",
          name: "Gemini 3.6 Flash",
          tier: "preview",
          tierLabel: "Next-Gen Preview",
          categoryGroup: "🚀 Generasi Terbaru & Preview",
          badgeStyle: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
          description: "Preview throughput tinggi untuk eksekusi workflow pipeline",
        },
        {
          id: "gemini-3.5-flash",
          name: "Gemini 3.5 Flash",
          tier: "preview",
          tierLabel: "Next-Gen Preview",
          categoryGroup: "🚀 Generasi Terbaru & Preview",
          badgeStyle: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
          description: "Generasi preview 3.5 teruji untuk workflow otomasi",
        },
        // Open Weights
        {
          id: "gemma-4-26b-a4b-it",
          name: "Gemma 4 26B Instruct",
          tier: "open",
          tierLabel: "Open Weights / Free",
          categoryGroup: "🌐 Open Weights & On-Device",
          badgeStyle: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
          description: "Model open Google berbobot 26B instruction-tuned untuk tugas spesifik",
        },
        {
          id: "gemma-4-31b-it",
          name: "Gemma 4 31B Instruct",
          tier: "open",
          tierLabel: "Open Weights / Free",
          categoryGroup: "🌐 Open Weights & On-Device",
          badgeStyle: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
          description: "Model open Google 31B berkapasitas besar untuk penalaran mandiri",
        },
      ];
    } else if (isOpenAI) {
      catalog = [
        {
          id: "gpt-4o-mini",
          name: "GPT-4o Mini",
          tier: "free",
          tierLabel: "Tier 1 / Hemat & Cepat",
          categoryGroup: "⚡ Free / Low-Cost Tier",
          badgeStyle: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          description: "Sangat hemat & cepat, cocok untuk task operasional harian agen",
        },
        {
          id: "gpt-3.5-turbo",
          name: "GPT-3.5 Turbo",
          tier: "free",
          tierLabel: "Legacy / Hemat",
          categoryGroup: "⚡ Free / Low-Cost Tier",
          badgeStyle: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          description: "Model legendaris untuk komputasi teks cepat berbiaya minim",
        },
        {
          id: "gpt-4o",
          name: "GPT-4o",
          tier: "pro",
          tierLabel: "Pro Tier / Flagship",
          categoryGroup: "💎 Pro Tier & Flagship Reasoning",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Kemampuan omni multi-modal & penalaran instruksi tingkat tinggi",
        },
        {
          id: "o3-mini",
          name: "o3-mini",
          tier: "pro",
          tierLabel: "Pro Tier / STEM & Code",
          categoryGroup: "💎 Pro Tier & Flagship Reasoning",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Penalaran matematika & coding dengan throughput sangat tinggi",
        },
        {
          id: "o1",
          name: "o1",
          tier: "pro",
          tierLabel: "Pro Tier / Deep Reasoning",
          categoryGroup: "💎 Pro Tier & Flagship Reasoning",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Model penalaran bertahap mendalam untuk problem kompleks",
        },
        {
          id: "o1-mini",
          name: "o1-mini",
          tier: "pro",
          tierLabel: "Pro Tier / Fast Reasoning",
          categoryGroup: "💎 Pro Tier & Flagship Reasoning",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Penalaran matematika dan pemrograman berkecepatan tinggi",
        },
        {
          id: "gpt-4-turbo",
          name: "GPT-4 Turbo",
          tier: "pro",
          tierLabel: "Pro Tier / 128k Konteks",
          categoryGroup: "💎 Pro Tier & Flagship Reasoning",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Kapasitas konteks besar untuk analisis dokumen dan kode",
        },
      ];
    } else if (isAnthropic) {
      catalog = [
        {
          id: "claude-3-5-haiku",
          name: "Claude 3.5 Haiku",
          tier: "free",
          tierLabel: "Standard / Ultra Cepat",
          categoryGroup: "⚡ Fast Execution Tier",
          badgeStyle: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/30",
          description: "Respon instan dengan latensi ultra rendah untuk task cepat",
        },
        {
          id: "claude-3-7-sonnet",
          name: "Claude 3.7 Sonnet",
          tier: "pro",
          tierLabel: "Pro Tier / Hybrid Coding",
          categoryGroup: "💎 Pro Tier & Coding Specialist",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Hybrid thinking and coding model mutakhir dari Anthropic",
        },
        {
          id: "claude-3-5-sonnet",
          name: "Claude 3.5 Sonnet",
          tier: "pro",
          tierLabel: "Pro Tier / Coding Specialist",
          categoryGroup: "💎 Pro Tier & Coding Specialist",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Standar industri untuk coding dan refactoring software",
        },
        {
          id: "claude-3-opus",
          name: "Claude 3 Opus",
          tier: "pro",
          tierLabel: "Pro Tier / Deep Analysis",
          categoryGroup: "💎 Pro Tier & Coding Specialist",
          badgeStyle: "text-blue-600 dark:text-blue-400 bg-blue-500/10 border-blue-500/30",
          description: "Analisis nuansa mendalam untuk perancangan strategis",
        },
      ];
    } else {
      catalog = [
        {
          id: "llama-3.3-70b",
          name: "Llama 3.3 70B",
          tier: "open",
          tierLabel: "Local / 70B High Power",
          categoryGroup: "🌐 On-Device & Local Models",
          badgeStyle: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
          description: "Model open-source terkemuka untuk inferensi mandiri offline",
        },
        {
          id: "llama3",
          name: "Llama 3",
          tier: "open",
          tierLabel: "Local / Standard",
          categoryGroup: "🌐 On-Device & Local Models",
          badgeStyle: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
          description: "Standar inferensi lokal via endpoint Ollama",
        },
        {
          id: "qwen2.5-coder-32b",
          name: "Qwen 2.5 Coder 32B",
          tier: "open",
          tierLabel: "Local / Coding Specialist",
          categoryGroup: "🌐 On-Device & Local Models",
          badgeStyle: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
          description: "Model spesialis coding open source performa tinggi",
        },
        {
          id: "deepseek-coder",
          name: "DeepSeek Coder",
          tier: "open",
          tierLabel: "Local / DeepSeek Coder",
          categoryGroup: "🌐 On-Device & Local Models",
          badgeStyle: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
          description: "Eksekusi kode lokal dengan pemahaman sintaks mendalam",
        },
        {
          id: "mistral-small",
          name: "Mistral Small",
          tier: "open",
          tierLabel: "Local / Low Latency",
          categoryGroup: "🌐 On-Device & Local Models",
          badgeStyle: "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/30",
          description: "Model ringan untuk efisiensi komputasi lokal",
        },
      ];
    }

    // Merge dynamic available_models from API key detection if any exist
    const existingIds = new Set(catalog.map((c) => c.id));
    if (Array.isArray(prof?.available_models)) {
      prof.available_models.forEach((m) => {
        if (m && typeof m === "string" && !existingIds.has(m)) {
          existingIds.add(m);
          catalog.push({
            id: m,
            name: m,
            tier: "custom",
            tierLabel: "API Discovered",
            categoryGroup: "📦 Model Tambahan Terdeteksi dari Akun API Anda",
            badgeStyle: "text-cyan-600 dark:text-cyan-400 bg-cyan-500/10 border-cyan-500/30",
            description: "Model yang dilaporkan aktif oleh akun API provider Anda",
          });
        }
      });
    }

    // If the profile's current target model is not in catalog, prepend it
    if (targetModel && !existingIds.has(targetModel)) {
      catalog.unshift({
        id: targetModel,
        name: targetModel,
        tier: "custom",
        tierLabel: "Model Aktif Provider",
        categoryGroup: "🌟 Model Utama Provider",
        badgeStyle: "text-purple-600 dark:text-purple-400 bg-purple-500/10 border-purple-500/30",
        description: "Model yang saat ini dikonfigurasi pada provider ini",
        isMainForProvider: true,
      });
    }

    return catalog.map((item) => ({
      ...item,
      isMainForProvider: item.id === targetModel,
    }));
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
                  <th className="py-2.5 px-4 w-48">Concurrency Capacity</th>
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
                          variant="table"
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
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-xl w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
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
                <div className="p-3 bg-canvas-light dark:bg-canvas-dark rounded border border-borderBase-light dark:border-borderBase-dark space-y-3 w-full min-w-0 box-border overflow-hidden">
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="text-textMuted-light dark:text-textMuted-dark text-[11px] shrink-0">Model Aktif Sekarang:</span>
                    <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[11px] font-mono bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-medium truncate max-w-[220px]">
                      <span className="truncate">{selectedAgent.llm_model || defaultLLM?.model || "gemini-3.8-flash"}</span>
                    </span>
                  </div>

                  <div className="pt-2 border-t border-borderBase-light/50 dark:border-borderBase-dark/50 space-y-3 w-full min-w-0">
                    <AgentModelSelector
                      selectedProfileId={drawerLLMProfileId}
                      selectedModel={drawerLLMModel}
                      onProfileChange={(profId) => {
                        setDrawerLLMProfileId(profId);
                        const prof = activeLlms.find((l) => l.id === profId);
                        if (prof) {
                          setDrawerLLMModel(prof.model);
                        } else {
                          setDrawerLLMModel("");
                        }
                      }}
                      onModelChange={(model) => setDrawerLLMModel(model)}
                      activeLlms={activeLlms}
                      defaultLLM={defaultLLM}
                      catalog={getAvailableModelsCatalog(drawerLLMProfileId)}
                      tierFilter={drawerTierFilter}
                      onTierFilterChange={(tier) => setDrawerTierFilter(tier)}
                      noCardWrapper={true}
                    />

                    <div className="pt-1 flex justify-end">
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
            className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-lg w-full p-5 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto"
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
              <AgentModelSelector
                selectedProfileId={newLLMProfileId}
                selectedModel={newLLMModel}
                onProfileChange={(profId) => {
                  setNewLLMProfileId(profId);
                  const prof = activeLlms.find((l) => l.id === profId);
                  if (prof) {
                    setNewLLMModel(prof.model);
                  } else {
                    setNewLLMModel("");
                  }
                }}
                onModelChange={(model) => setNewLLMModel(model)}
                activeLlms={activeLlms}
                defaultLLM={defaultLLM}
                catalog={getAvailableModelsCatalog(newLLMProfileId)}
                tierFilter={modalTierFilter}
                onTierFilterChange={(tier) => setModalTierFilter(tier)}
                isSurfaceSecondary={true}
              />

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
