"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import {
  Cpu,
  HardDrive,
  Shield,
  Key,
  Globe,
  Bot,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sliders,
  Sparkles,
  AlertTriangle,
  Plus,
  Trash2,
  Edit,
  Check,
  X,
  Server
} from "lucide-react";

interface SystemStatus {
  environment: string;
  debug: boolean;
  version: string;
  workspace_root: string;
  workspace_initialized: boolean;
  engine_adapter_default: string;
}

interface AdapterCapabilities {
  diff_emission: boolean;
  test_runner: boolean;
  cancellation: boolean;
  quality_gates: boolean;
  interactive_shell: boolean;
  simulated: boolean;
  supported_models: string[];
  current_base_url?: string;
  current_model?: string;
  is_configured?: boolean;
}

interface AdapterInfo {
  name: string;
  is_simulated: boolean;
  status: string;
  health_message: string;
  capabilities: AdapterCapabilities;
  is_default: boolean;
}

interface ConnectionTestResult {
  status: "verified" | "not_configured" | "error" | "warning";
  message: string;
  model?: string;
  adapter?: string;
  api_key_valid?: boolean;
  model_supported?: boolean;
  available_models?: string[];
}

interface LLMConfigItem {
  id: string;
  name: string;
  provider: string;
  base_url: string;
  masked_api_key: string;
  has_api_key: boolean;
  model: string;
  is_default: boolean;
  status: string;
  health_message: string;
  available_models: string[];
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [llms, setLlms] = useState<LLMConfigItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Engine adapter choice
  const [defaultEngineAdapter, setDefaultEngineAdapter] = useState("MockEngineAdapter");

  // Modal State for Add / Edit LLM
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLlmId, setEditingLlmId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formProvider, setFormProvider] = useState("Google Gemini");
  const [formBaseUrl, setFormBaseUrl] = useState("https://generativelanguage.googleapis.com/v1beta/openai");
  const [formApiKey, setFormApiKey] = useState("");
  const [formModel, setFormModel] = useState("gemini-2.0-flash");
  const [formIsDefault, setFormIsDefault] = useState(false);
  const [formShowKey, setFormShowKey] = useState(false);
  const [formTestResult, setFormTestResult] = useState<ConnectionTestResult | null>(null);
  const [formTesting, setFormTesting] = useState(false);
  const [formSaving, setFormSaving] = useState(false);

  // Specific row action states
  const [testingId, setTestingId] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setIsLoading(true);

      // 1. Fetch LLMs immediately so cards render without delay
      const fetchLlms = fetch("http://127.0.0.1:8000/api/v1/system/llms", { cache: "no-store" })
        .then(async (res) => {
          if (res.ok) {
            const data = await res.json();
            setLlms(data);
          }
        })
        .catch(() => {});

      // 2. Fetch system status and adapters in parallel
      const fetchStatus = fetch("http://127.0.0.1:8000/api/v1/system/status", { cache: "no-store" })
        .then(async (res) => {
          if (res.ok) {
            const statusData: SystemStatus = await res.json();
            setStatus(statusData);
            if (statusData.engine_adapter_default) {
              setDefaultEngineAdapter(statusData.engine_adapter_default);
            }
          }
        })
        .catch(() => {});

      const fetchAdapters = fetch("http://127.0.0.1:8000/api/v1/system/adapters", { cache: "no-store" })
        .then(async (res) => {
          if (res.ok) {
            setAdapters(await res.json());
          }
        })
        .catch(() => {});

      await Promise.all([fetchLlms, fetchStatus, fetchAdapters]);
    } catch {
      // Offline fallback handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenAddModal = () => {
    setEditingLlmId(null);
    setFormName("Google Gemini");
    setFormProvider("Google Gemini");
    setFormBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai");
    setFormApiKey("");
    setFormModel("gemini-2.0-flash");
    setFormIsDefault(llms.length === 0);
    setFormShowKey(false);
    setFormTestResult(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: LLMConfigItem) => {
    setEditingLlmId(item.id);
    setFormName(item.name);
    setFormProvider(item.provider);
    setFormBaseUrl(item.base_url);
    setFormApiKey(""); // Leave empty unless operator wants to overwrite
    setFormModel(item.model);
    setFormIsDefault(item.is_default);
    setFormShowKey(false);
    setFormTestResult(null);
    setIsModalOpen(true);
  };

  const handleApplyPreset = (provider: string) => {
    setFormProvider(provider);
    setFormTestResult(null);
    if (provider === "Google Gemini") {
      setFormName("Google Gemini");
      setFormBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai");
      setFormModel("gemini-2.0-flash");
    } else if (provider === "OpenAI ChatGPT" || provider === "OpenAI") {
      setFormProvider("OpenAI ChatGPT");
      setFormName("OpenAI ChatGPT");
      setFormBaseUrl("https://api.openai.com/v1");
      setFormModel("gpt-4o");
    } else if (provider === "Claude Code") {
      setFormName("Claude Code");
      setFormBaseUrl("https://api.anthropic.com/v1");
      setFormModel("claude-3-7-sonnet-20250219");
    }
  };

  const handleModalTestConnection = async () => {
    try {
      setFormTesting(true);
      setFormTestResult(null);

      const res = await fetch("http://127.0.0.1:8000/api/v1/system/adapters/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: formApiKey.trim() || undefined,
          base_url: formBaseUrl.trim() || undefined,
          model: formModel.trim() || undefined,
        }),
      });

      const data: ConnectionTestResult = await res.json();
      setFormTestResult(data);
    } catch (err: unknown) {
      setFormTestResult({
        status: "error",
        message: err instanceof Error ? err.message : "Gagal menghubungi endpoint provider.",
      });
    } finally {
      setFormTesting(false);
    }
  };

  const handleSaveLlm = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setFormSaving(true);
      const payload = {
        id: editingLlmId || undefined,
        name: formName.trim(),
        provider: formProvider,
        base_url: formBaseUrl.trim(),
        api_key: formApiKey.trim() || undefined,
        model: formModel.trim(),
        is_default: formIsDefault,
      };

      const res = await fetch("http://127.0.0.1:8000/api/v1/system/llms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan konfigurasi LLM.");
      }

      const data = await res.json();
      if (data.llms) {
        setLlms(data.llms);
      }
      setIsModalOpen(false);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving LLM config");
    } finally {
      setFormSaving(false);
    }
  };

  const handleTestSpecificLlm = async (id: string) => {
    try {
      setTestingId(id);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/system/llms/${id}/test`, {
        method: "POST",
        headers: { "Cache-Control": "no-cache" },
      });
      const data: ConnectionTestResult = await res.json();
      setLlms((prev) =>
        prev.map((item) =>
          item.id === id
            ? {
                ...item,
                status: data.status,
                health_message: data.message,
                available_models: data.available_models || item.available_models,
              }
            : item
        )
      );
    } catch {
      // ignore
    } finally {
      setTestingId(null);
    }
  };

  const handleSetDefaultLlm = async (id: string) => {
    try {
      // Optimistically mark this LLM as default immediately
      setLlms((prev) =>
        prev.map((item) => ({
          ...item,
          is_default: item.id === id,
        }))
      );
      const res = await fetch(`http://127.0.0.1:8000/api/v1/system/llms/${id}/set-default`, {
        method: "POST",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.llms) {
          setLlms(data.llms);
        }
      } else {
        await fetchData();
      }
    } catch {
      await fetchData();
    }
  };

  const handleDeleteLlm = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus konfigurasi LLM ini?")) return;
    try {
      // Optimistic delete: immediately remove from UI state so it doesn't flicker
      setLlms((prev) => prev.filter((item) => item.id !== id));

      const res = await fetch(`http://127.0.0.1:8000/api/v1/system/llms/${id}`, {
        method: "DELETE",
        headers: { "Cache-Control": "no-cache" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.llms) {
          setLlms(data.llms);
        }
      } else {
        // Revert on error
        await fetchData();
      }
    } catch {
      await fetchData();
    }
  };

  const handleToggleDefaultEngineAdapter = async (adapterName: string) => {
    try {
      setDefaultEngineAdapter(adapterName);
      await fetch("http://127.0.0.1:8000/api/v1/system/adapters/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ default_adapter: adapterName }),
      });
      await fetchData();
    } catch {
      // ignore
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings & System Governance"
        description="Kelola konfigurasi multi-LLM, status adapter engine, workspace canonical isolation, dan pengaturan eksekusi agent."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Settings" },
        ]}
      />

      <div className="space-y-6">
        {/* Antigravity & Gemini Callout Notice */}
        <div className="p-4 rounded-md bg-accent/10 border border-accent/25 flex items-start justify-between text-xs">
          <div className="flex items-start space-x-3">
            <Sparkles className="w-5 h-5 text-accent shrink-0 mt-0.5" />
            <p className="text-textMuted-light dark:text-textMuted-dark leading-relaxed max-w-4xl pt-0.5">
              Anda dapat menambahkan beberapa koneksi API Key sekaligus, menguji apakah tier akun Anda mendukung model tertentu, serta menetapkan model default untuk workforce agent.
            </p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={fetchData}
            isLoading={isLoading}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        </div>

        {/* Section 1: Connected LLMs Table / Card Grid */}
        <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
            <div className="flex items-center space-x-2.5">
              <Server className="w-5 h-5 text-accent" />
              <div>
                <h2 className="text-sm font-semibold">LLM Terhubung & Konfigurasi Provider</h2>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Daftar provider & model AI yang terhubung. Agen akan mengeksekusi task menggunakan koneksi yang aktif.
                </p>
              </div>
            </div>

            <Button
              size="sm"
              variant="primary"
              onClick={handleOpenAddModal}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              + Tambah LLM Baru
            </Button>
          </div>

          {/* Connected LLMs List */}
          {llms.length === 0 ? (
            <div className="py-12 border border-dashed border-borderBase-light dark:border-borderBase-dark rounded-md flex flex-col items-center justify-center text-center p-6 space-y-3 bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/30">
              <div className="w-11 h-11 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center text-accent">
                <Bot className="w-6 h-6" />
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-sm font-semibold">Belum Ada LLM yang Terhubung</h3>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                  Secara default sistem belum mengaktifkan LLM provider apapun. Klik tombol di bawah untuk menambahkan API Key (Google Gemini, OpenAI ChatGPT, atau Claude Code).
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={handleOpenAddModal}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                + Tambah LLM Pertama
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
              {llms.map((item) => {
              let badgeVariant: "success" | "warning" | "danger" | "neutral" = "neutral";
              let badgeLabel = "Belum Teruji";

              if (item.status === "verified") {
                badgeVariant = "success";
                badgeLabel = "Verified (Ready)";
              } else if (item.status === "warning") {
                badgeVariant = "warning";
                badgeLabel = "Tier Dibatasi / Model Terbatas";
              } else if (item.status === "error") {
                badgeVariant = "danger";
                badgeLabel = "Connection Error";
              } else if (item.status === "not_configured") {
                badgeVariant = "neutral";
                badgeLabel = "Not Configured";
              }

              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-md border flex flex-col justify-between transition-all ${
                    item.is_default
                      ? "border-accent/40 bg-accent/5 dark:bg-accent/10 shadow-xs"
                      : "border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark"
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-accent shrink-0" />
                          <span className="font-semibold text-xs truncate max-w-[170px]" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark block">
                          Provider: {item.provider}
                        </span>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <StatusBadge variant={badgeVariant} label={badgeLabel} size="sm" />
                        {item.is_default && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 rounded bg-accent text-white tracking-wider">
                            ACTIVE DEFAULT
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Meta info */}
                    <div className="p-2.5 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5 text-[11px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-textMuted-light dark:text-textMuted-dark">Target Model:</span>
                        <span className="text-accent font-semibold">{item.model}</span>
                      </div>
                      <div className="flex items-center justify-between truncate" title={item.base_url}>
                        <span className="text-textMuted-light dark:text-textMuted-dark">Endpoint:</span>
                        <span className="truncate max-w-[140px] text-textPrimary-light dark:text-textPrimary-dark">
                          {item.base_url.replace("https://", "")}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-textMuted-light dark:text-textMuted-dark">API Key:</span>
                        <span className="text-textPrimary-light dark:text-textPrimary-dark">
                          {item.has_api_key ? item.masked_api_key : <span className="text-textMuted-light italic">Belum diinput</span>}
                        </span>
                      </div>
                    </div>

                    {/* Health Note */}
                    {item.health_message && (
                      <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark leading-snug line-clamp-2">
                        {item.health_message}
                      </p>
                    )}
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-borderBase-light dark:border-borderBase-dark text-xs gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTestSpecificLlm(item.id)}
                      isLoading={testingId === item.id}
                      className="text-[11px] h-7 px-2"
                      leftIcon={<RefreshCw className="w-3 h-3" />}
                    >
                      Test
                    </Button>

                    <div className="flex items-center gap-1">
                      {!item.is_default && (
                        <button
                          type="button"
                          onClick={() => handleSetDefaultLlm(item.id)}
                          className="px-2 py-1 rounded text-[11px] font-medium border border-borderBase-light dark:border-borderBase-dark hover:border-accent text-accent hover:bg-accent/10 transition-colors"
                        >
                          Set Default
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(item)}
                        className="p-1.5 rounded hover:bg-surface-light dark:hover:bg-surface-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                        title="Edit LLM"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteLlm(item.id)}
                        className="p-1.5 rounded hover:bg-status-danger/10 text-textMuted-light dark:text-textMuted-dark hover:text-status-danger transition-colors"
                        title="Hapus LLM"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>

        {/* Section 2: Platform Execution Engine & Isolation Boundary */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Engine Adapters Choice */}
          <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <Cpu className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold">Platform Engine Registry & Default Execution Mode</h2>
            </div>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
              Engine Registry adalah lapisan eksekusi inti AgencyOS yang mengatur apakah task dijalankan via simulasi deterministik aman (Mock) atau kode nyata LLM (Live).
            </p>

            <div className="space-y-3 pt-1 text-xs">
              <div
                onClick={() => handleToggleDefaultEngineAdapter("MockEngineAdapter")}
                className={`p-3.5 rounded border cursor-pointer transition-all flex items-start justify-between ${
                  defaultEngineAdapter === "MockEngineAdapter"
                    ? "border-accent bg-accent/5 dark:bg-accent/10"
                    : "border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark opacity-75 hover:opacity-100"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs">MockEngineAdapter</span>
                    <StatusBadge variant="simulated" label="Verified (Simulation)" size="sm" />
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Runner offline deterministik. Cocok untuk testing alur scrum dan preview tanpa memakan quota API.
                  </p>
                </div>
                {defaultEngineAdapter === "MockEngineAdapter" && (
                  <Check className="w-4 h-4 text-accent shrink-0 mt-1" />
                )}
              </div>

              <div
                onClick={() => handleToggleDefaultEngineAdapter("LiveLLMEngineAdapter")}
                className={`p-3.5 rounded border cursor-pointer transition-all flex items-start justify-between ${
                  defaultEngineAdapter === "LiveLLMEngineAdapter"
                    ? "border-accent bg-accent/5 dark:bg-accent/10"
                    : "border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark opacity-75 hover:opacity-100"
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs">LiveLLMEngineAdapter</span>
                    <StatusBadge variant="success" label="Live LLM Sandbox" size="sm" />
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Runner eksekusi riil. Memanggil provider LLM terhubung, memodifikasi berkas di isolated workspace, dan mengecek quality gates.
                  </p>
                </div>
                {defaultEngineAdapter === "LiveLLMEngineAdapter" && (
                  <Check className="w-4 h-4 text-accent shrink-0 mt-1" />
                )}
              </div>
            </div>
          </div>

          {/* Workspace Boundary Info */}
          <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold">Workspace Isolation Boundary</h2>
            </div>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
              Setiap execution run terisolasi di path canonical workspace untuk mencegah kebocoran berkas antar agent.
            </p>

            <div className="space-y-3 pt-2 border-t border-borderBase-light dark:border-borderBase-dark text-xs">
              <div className="space-y-1">
                <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">
                  Workspace Canonical Root:
                </span>
                <div className="font-mono text-[11px] p-2.5 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark text-accent">
                  {status?.workspace_root || "./workspaces"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">
                  Environment & Mode:
                </span>
                <div className="font-mono text-[11px] p-2.5 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark">
                  {status?.environment || "development"} (Debug: {status?.debug ? "True" : "False"})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal: Tambah / Edit Konfigurasi LLM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg shadow-xl w-full max-w-xl my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between bg-surfaceSecondary-light/40 dark:bg-surfaceSecondary-dark/40">
              <div className="flex items-center space-x-2">
                <Bot className="w-5 h-5 text-accent" />
                <h3 className="font-semibold text-sm">
                  {editingLlmId ? "Edit Konfigurasi LLM" : "Tambah Konfigurasi LLM Baru"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveLlm} className="p-5 space-y-4 text-xs">
              {/* Quick Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium block">Pilih Preset Cepat Provider:</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("Google Gemini")}
                    className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                      formProvider === "Google Gemini"
                        ? "bg-accent/15 text-accent border-accent font-semibold"
                        : "border-borderBase-light dark:border-borderBase-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark"
                    }`}
                  >
                    ✨ Google Gemini
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("OpenAI ChatGPT")}
                    className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                      formProvider === "OpenAI ChatGPT"
                        ? "bg-accent/15 text-accent border-accent font-semibold"
                        : "border-borderBase-light dark:border-borderBase-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark"
                    }`}
                  >
                    🤖 OpenAI ChatGPT
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyPreset("Claude Code")}
                    className={`px-3 py-1.5 rounded border text-xs font-medium transition-colors ${
                      formProvider === "Claude Code"
                        ? "bg-accent/15 text-accent border-accent font-semibold"
                        : "border-borderBase-light dark:border-borderBase-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark"
                    }`}
                  >
                    ⚡ Claude Code
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="space-y-1">
                <label className="font-medium">Nama Koneksi LLM:</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Misal: Google Gemini 2.0 Flash (Primary)"
                  className="w-full px-3 py-2 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent"
                />
              </div>

              {/* Base URL */}
              <div className="space-y-1">
                <label className="font-medium flex items-center space-x-1.5">
                  <Globe className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark" />
                  <span>Base URL Endpoint:</span>
                </label>
                <input
                  type="text"
                  required
                  value={formBaseUrl}
                  onChange={(e) => setFormBaseUrl(e.target.value)}
                  placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
                  className="w-full font-mono px-3 py-2 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent"
                />
              </div>

              {/* API Key */}
              <div className="space-y-1">
                <label className="font-medium flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Key className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark" />
                    <span>API Key:</span>
                  </span>
                  <span className="text-[10px] text-[#209961] flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Memory-Only / Redacted
                  </span>
                </label>
                <div className="relative">
                  <input
                    type={formShowKey ? "text" : "password"}
                    value={formApiKey}
                    onChange={(e) => setFormApiKey(e.target.value)}
                    placeholder={editingLlmId ? "Kosongkan bila tidak ingin mengubah API key tersimpan" : "AIzaSy•••••••• atau sk-••••••••"}
                    className="w-full font-mono px-3 py-2 pr-10 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent"
                  />
                  <button
                    type="button"
                    onClick={() => setFormShowKey(!formShowKey)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                  >
                    {formShowKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Target Model */}
              <div className="space-y-1">
                <label className="font-medium flex items-center space-x-1.5">
                  <Bot className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark" />
                  <span>Model Target:</span>
                </label>
                <input
                  type="text"
                  required
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  placeholder="gemini-2.0-flash"
                  className="w-full font-mono px-3 py-2 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent"
                />
              </div>

              {/* Default switch */}
              <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="accent-accent rounded"
                />
                <span className="font-medium">Jadikan sebagai Active Default LLM untuk agen</span>
              </label>

              {/* Test Result Inside Modal */}
              {formTestResult && (
                <div
                  className={`p-3 rounded border text-xs flex flex-col space-y-2 ${
                    formTestResult.status === "verified"
                      ? "bg-[#16794B]/10 border-[#16794B]/30 text-status-success dark:text-[#209961]"
                      : formTestResult.status === "warning"
                      ? "bg-[#9A6700]/10 border-[#9A6700]/30 text-status-warning dark:text-[#C78B14]"
                      : "bg-[#C23934]/10 border-[#C23934]/30 text-status-danger dark:text-[#D94843]"
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {formTestResult.status === "verified" ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : formTestResult.status === "warning" ? (
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <span className="font-semibold block">
                        {formTestResult.status === "verified" && "✓ Koneksi & Model Terverifikasi!"}
                        {formTestResult.status === "warning" && "⚠️ API Key Valid — Model Terbatas"}
                        {formTestResult.status === "error" && "✕ Autentikasi / Koneksi Gagal"}
                      </span>
                      <p className="text-[11px] leading-relaxed opacity-90">{formTestResult.message}</p>
                    </div>
                  </div>

                  {/* Auto-discovered model suggestions */}
                  {formTestResult.available_models && formTestResult.available_models.length > 0 && (
                    <div className="pt-2 border-t border-current/20 space-y-1">
                      <span className="text-[10px] font-semibold block">Model yang aktif untuk akun Anda (klik untuk memilih):</span>
                      <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto pt-0.5">
                        {formTestResult.available_models.map((availM) => (
                          <button
                            key={availM}
                            type="button"
                            onClick={() => setFormModel(availM)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                              formModel === availM
                                ? "bg-accent text-white border-accent"
                                : "bg-surface-light dark:bg-surface-dark border-borderBase-light dark:border-borderBase-dark text-textPrimary-light dark:text-textPrimary-dark"
                            }`}
                          >
                            {availM}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Modal Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-borderBase-light dark:border-borderBase-dark">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleModalTestConnection}
                  isLoading={formTesting}
                  leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                >
                  Uji Koneksi
                </Button>

                <div className="flex items-center space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Batal
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={formSaving}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Simpan Konfigurasi
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
