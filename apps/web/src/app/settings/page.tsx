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
  Sparkles
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
  status: "verified" | "not_configured" | "error";
  message: string;
  model?: string;
  adapter?: string;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [adapters, setAdapters] = useState<AdapterInfo[]>([]);
  const [isLoadingAdapters, setIsLoadingAdapters] = useState(true);

  // Configuration form state
  const [baseUrl, setBaseUrl] = useState("https://generativelanguage.googleapis.com/v1beta/openai");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("gemini-2.0-flash");
  const [defaultAdapter, setDefaultAdapter] = useState("MockEngineAdapter");
  const [showApiKey, setShowApiKey] = useState(false);

  // Action states
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<ConnectionTestResult | null>(null);
  const [savingConfig, setSavingConfig] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  const fetchStatusAndAdapters = async () => {
    try {
      setIsLoadingAdapters(true);
      const [statusRes, adaptersRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/v1/system/status"),
        fetch("http://127.0.0.1:8000/api/v1/system/adapters"),
      ]);

      if (statusRes.ok) {
        const statusData: SystemStatus = await statusRes.json();
        setStatus(statusData);
        if (statusData.engine_adapter_default) {
          setDefaultAdapter(statusData.engine_adapter_default);
        }
      }

      if (adaptersRes.ok) {
        const adaptersData: AdapterInfo[] = await adaptersRes.json();
        setAdapters(adaptersData);

        const liveAdapter = adaptersData.find((a) => a.name === "LiveLLMEngineAdapter");
        if (liveAdapter?.capabilities) {
          if (liveAdapter.capabilities.current_base_url) {
            setBaseUrl(liveAdapter.capabilities.current_base_url);
          }
          if (liveAdapter.capabilities.current_model) {
            setModel(liveAdapter.capabilities.current_model);
          }
        }
      }
    } catch {
      // Offline fallback handling
    } finally {
      setIsLoadingAdapters(false);
    }
  };

  useEffect(() => {
    fetchStatusAndAdapters();
  }, []);

  const handleTestConnection = async () => {
    try {
      setTestingConnection(true);
      setTestResult(null);
      setSaveSuccessMessage(null);

      const res = await fetch("http://127.0.0.1:8000/api/v1/system/adapters/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey.trim() || undefined,
          base_url: baseUrl.trim() || undefined,
          model: model.trim() || undefined,
        }),
      });

      const data: ConnectionTestResult = await res.json();
      setTestResult(data);
    } catch (err: unknown) {
      setTestResult({
        status: "error",
        message: err instanceof Error ? err.message : "Gagal menghubungi endpoint sistem.",
      });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingConfig(true);
      setSaveSuccessMessage(null);

      const res = await fetch("http://127.0.0.1:8000/api/v1/system/adapters/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api_key: apiKey.trim() || undefined,
          base_url: baseUrl.trim() || undefined,
          model: model.trim() || undefined,
          default_adapter: defaultAdapter,
        }),
      });

      if (!res.ok) {
        throw new Error("Gagal menyimpan konfigurasi adapter.");
      }

      const data = await res.json();
      setSaveSuccessMessage("Konfigurasi live engine berhasil disimpan dan aktif.");
      if (data.adapters) {
        setAdapters(data.adapters);
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error saving configuration");
    } finally {
      setSavingConfig(false);
    }
  };

  return (
    <AppShell>
      <PageHeader
        title="Settings & System Governance"
        description="Engine adapter statuses, repository workspace isolation, policy thresholds, and environment configuration."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Settings" },
        ]}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 Cols): Live Engine Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <form
            onSubmit={handleSaveConfiguration}
            className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-5"
          >
            <div className="flex items-center justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-accent" />
                <div>
                  <h2 className="text-sm font-semibold">Live AI Execution Engine Configuration</h2>
                  <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                    Konfigurasi engine LLM untuk eksekusi kode riil di sandbox terisolasi. Mendukung penuh Google Gemini & Antigravity.
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-accent/10 text-accent border border-accent/20">
                Gemini & OpenAI Ready
              </span>
            </div>

            {/* Antigravity & Gemini Highlight Banner */}
            <div className="p-3.5 rounded-md bg-accent/10 border border-accent/25 flex items-start space-x-3 text-xs">
              <Sparkles className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-semibold text-accent block">Google Gemini & Antigravity Native Engine</span>
                <p className="text-textMuted-light dark:text-textMuted-dark leading-relaxed">
                  AgencyOS terintegrasi dengan <strong>Google Gemini 2.0 Flash & 2.5 Pro</strong> via OpenAI-compatible endpoint Google (<code className="font-mono text-[11px] text-accent">https://generativelanguage.googleapis.com/v1beta/openai</code>).
                  Cukup masukkan Google API Key dari Google AI Studio atau set <code className="font-mono text-[11px] text-accent">GEMINI_API_KEY</code> di file <code className="font-mono text-[11px]">.env</code>.
                </p>
              </div>
            </div>

            {/* Provider Base URL */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center space-x-1.5">
                <Globe className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark" />
                <span>Base URL Endpoint</span>
              </label>
              <input
                type="text"
                value={baseUrl}
                onChange={(e) => setBaseUrl(e.target.value)}
                placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
                className="w-full text-xs font-mono px-3 py-2 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent"
              />
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-textMuted-light dark:text-textMuted-dark pt-1">
                <span>Quick Preset:</span>
                <button
                  type="button"
                  onClick={() => {
                    setBaseUrl("https://generativelanguage.googleapis.com/v1beta/openai");
                    setModel("gemini-2.0-flash");
                  }}
                  className="px-2 py-0.5 rounded bg-accent/15 text-accent border border-accent/40 font-medium"
                >
                  ⚡ Google Gemini (Recommended)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBaseUrl("https://api.openai.com/v1");
                    setModel("gpt-4o-mini");
                  }}
                  className="px-1.5 py-0.5 rounded hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark"
                >
                  OpenAI
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBaseUrl("https://openrouter.ai/api/v1");
                    setModel("google/gemini-2.0-flash-exp:free");
                  }}
                  className="px-1.5 py-0.5 rounded hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark"
                >
                  OpenRouter
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBaseUrl("http://localhost:11434/v1");
                    setModel("llama3");
                  }}
                  className="px-1.5 py-0.5 rounded hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark"
                >
                  Ollama Local
                </button>
              </div>
            </div>

            {/* API Key */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center justify-between">
                <span className="flex items-center space-x-1.5">
                  <Key className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark" />
                  <span>API Key</span>
                </span>
                <span className="text-[10px] text-[#209961] flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Redacted & Memory-Only (Never committed)
                </span>
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy•••••••••••••••••••• (Google Key) atau sk-••••"
                  className="w-full text-xs font-mono px-3 py-2 pr-10 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent"
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey(!showApiKey)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                >
                  {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                Masukkan Google Gemini API Key dari AI Studio, atau kosongkan bila menggunakan local endpoint (Ollama/vLLM).
              </p>
            </div>

            {/* Model Selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium flex items-center space-x-1.5">
                <Bot className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark" />
                <span>Target Model LLM</span>
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="gemini-2.0-flash"
                className="w-full text-xs font-mono px-3 py-2 rounded border border-borderBase-light dark:border-borderBase-dark bg-canvas-light dark:bg-canvas-dark text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:border-accent"
              />
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-textMuted-light dark:text-textMuted-dark pt-1">
                <span>Model Presets:</span>
                {[
                  "gemini-2.0-flash",
                  "gemini-2.5-pro",
                  "gemini-2.5-flash",
                  "gemini-1.5-pro",
                  "gpt-4o-mini",
                  "gpt-4o",
                  "claude-3-5-sonnet",
                  "qwen-2.5-coder-32b",
                ].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setModel(m)}
                    className={`px-1.5 py-0.5 rounded border ${
                      model === m
                        ? "bg-accent/15 text-accent border-accent/40 font-medium"
                        : "hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark border-borderBase-light dark:border-borderBase-dark"
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {/* Default Engine Switcher */}
            <div className="space-y-1.5 pt-2 border-t border-borderBase-light dark:border-borderBase-dark">
              <label className="text-xs font-medium block">Default Execution Adapter</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <label
                  className={`flex items-start p-3 rounded border cursor-pointer transition-colors ${
                    defaultAdapter === "MockEngineAdapter"
                      ? "border-accent bg-accent/5 dark:bg-accent/10"
                      : "border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark"
                  }`}
                >
                  <input
                    type="radio"
                    name="defaultAdapter"
                    value="MockEngineAdapter"
                    checked={defaultAdapter === "MockEngineAdapter"}
                    onChange={(e) => setDefaultAdapter(e.target.value)}
                    className="mt-0.5 mr-2.5 accent-accent"
                  />
                  <div>
                    <span className="text-xs font-semibold block">MockEngineAdapter</span>
                    <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark block">
                      Deterministic offline simulation run (Safe for dev & CI tests).
                    </span>
                  </div>
                </label>

                <label
                  className={`flex items-start p-3 rounded border cursor-pointer transition-colors ${
                    defaultAdapter === "LiveLLMEngineAdapter"
                      ? "border-accent bg-accent/5 dark:bg-accent/10"
                      : "border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark"
                  }`}
                >
                  <input
                    type="radio"
                    name="defaultAdapter"
                    value="LiveLLMEngineAdapter"
                    checked={defaultAdapter === "LiveLLMEngineAdapter"}
                    onChange={(e) => setDefaultAdapter(e.target.value)}
                    className="mt-0.5 mr-2.5 accent-accent"
                  />
                  <div>
                    <span className="text-xs font-semibold block">LiveLLMEngineAdapter</span>
                    <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark block">
                      Actual LLM API code generation in isolated run workspaces.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            {/* Test Connection Banner */}
            {testResult && (
              <div
                className={`p-3 rounded border text-xs flex items-start space-x-2.5 ${
                  testResult.status === "verified"
                    ? "bg-[#16794B]/10 border-[#16794B]/30 text-status-success dark:text-[#209961]"
                    : testResult.status === "not_configured"
                    ? "bg-[#9A6700]/10 border-[#9A6700]/30 text-status-warning dark:text-[#C78B14]"
                    : "bg-[#C23934]/10 border-[#C23934]/30 text-status-danger dark:text-[#D94843]"
                }`}
              >
                {testResult.status === "verified" ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                )}
                <div>
                  <div className="font-semibold capitalize">Status: {testResult.status}</div>
                  <div>{testResult.message}</div>
                </div>
              </div>
            )}

            {/* Save Success Banner */}
            {saveSuccessMessage && (
              <div className="p-3 rounded border text-xs flex items-center space-x-2.5 bg-[#16794B]/10 border-[#16794B]/30 text-status-success dark:text-[#209961]">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{saveSuccessMessage}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-borderBase-light dark:border-borderBase-dark">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestConnection}
                isLoading={testingConnection}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              >
                Test Connection
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={savingConfig}
                leftIcon={<Sparkles className="w-3.5 h-3.5" />}
              >
                Save Engine Configuration
              </Button>
            </div>
          </form>
        </div>

        {/* Right Column: Registered Adapters & Workspace Boundary */}
        <div className="space-y-6">
          {/* Registered Engine Adapters */}
          <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Cpu className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold">Engine Registry</h2>
              </div>
              <button
                type="button"
                onClick={fetchStatusAndAdapters}
                className="text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark p-1"
                title="Refresh adapters"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingAdapters ? "animate-spin" : ""}`} />
              </button>
            </div>

            <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
              Registry engine aktif mengikuti Honesty Rule (Simulated vs Verified).
            </p>

            <div className="space-y-3 pt-1 text-xs">
              {adapters.map((adapter) => {
                const isLive = !adapter.is_simulated;
                let badgeVariant: "success" | "warning" | "danger" | "neutral" | "simulated" = "neutral";
                let badgeLabel = "Not Configured";

                if (adapter.is_simulated) {
                  badgeVariant = "simulated";
                  badgeLabel = "Verified (Simulated)";
                } else if (adapter.status === "verified") {
                  badgeVariant = "success";
                  badgeLabel = "Verified (Live)";
                } else if (adapter.status === "error") {
                  badgeVariant = "danger";
                  badgeLabel = "Connection Error";
                }

                return (
                  <div
                    key={adapter.name}
                    className={`p-3 rounded border ${
                      adapter.is_default
                        ? "border-accent/40 bg-accent/5 dark:bg-accent/10"
                        : "border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold block">{adapter.name}</span>
                        {adapter.is_default && (
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-accent text-white">
                            DEFAULT
                          </span>
                        )}
                      </div>
                      <StatusBadge variant={badgeVariant} label={badgeLabel} />
                    </div>

                    <div className="text-[11px] text-textMuted-light dark:text-textMuted-dark space-y-1">
                      <div>
                        Mode:{" "}
                        <span className="font-mono text-textPrimary-light dark:text-textPrimary-dark">
                          {adapter.is_simulated ? "Deterministic Offline" : "Live API Remote"}
                        </span>
                      </div>
                      {isLive && adapter.capabilities.current_model && (
                        <div>
                          Model:{" "}
                          <span className="font-mono text-accent">
                            {adapter.capabilities.current_model}
                          </span>
                        </div>
                      )}
                      <div className="text-[10px] opacity-75">
                        Capabilities: Diff, Tests, Quality Gates, Isolation
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Workspace Boundary Info */}
          <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
            <div className="flex items-center space-x-2">
              <HardDrive className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold">Workspace Isolation Boundary</h2>
            </div>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
              Setiap execution run terisolasi di path canonical untuk mencegah file bleed antar task.
            </p>

            <div className="space-y-3 pt-2 border-t border-borderBase-light dark:border-borderBase-dark text-xs">
              <div className="space-y-1">
                <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">
                  Workspace Canonical Root:
                </span>
                <div className="font-mono text-[11px] p-2 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark text-accent">
                  {status?.workspace_root || "./workspaces"}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">
                  Environment & Debug:
                </span>
                <div className="font-mono text-[11px] p-2 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark">
                  {status?.environment || "development"} (Debug: {status?.debug ? "True" : "False"})
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
