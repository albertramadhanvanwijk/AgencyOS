"use client";

import { useEffect, useState } from "react";
import { 
  Activity, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  Terminal, 
  Moon, 
  Sun, 
  FolderKanban, 
  Users, 
  Layers, 
  GitBranch, 
  Cpu 
} from "lucide-react";

interface HealthStatus {
  status: string;
  service: string;
  version: string;
  timestamp: string;
  database: {
    connected: boolean;
    type: string;
  };
}

export default function Home() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Check system preference or default
    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setIsDark(true);
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    if (!isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  useEffect(() => {
    async function fetchHealth() {
      try {
        setLoading(true);
        const res = await fetch("http://127.0.0.1:8000/api/v1/health");
        if (!res.ok) {
          throw new Error(`API responded with status: ${res.status}`);
        }
        const data = await res.json();
        setHealth(data);
        setError(null);
      } catch (err: unknown) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError("Failed to connect to AgencyOS backend API");
        }
      } finally {
        setLoading(false);
      }
    }
    fetchHealth();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <header className="h-12 border-b border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark px-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2 font-semibold text-sm tracking-tight">
            <span className="w-2 h-2 rounded-full bg-accent"></span>
            <span>AgencyOS</span>
          </div>
          <span className="text-textMuted-light dark:text-textMuted-dark text-xs font-mono">v0.1.0-alpha</span>
        </div>

        <div className="flex items-center space-x-3">
          {/* Health Badge */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded border border-borderBase-light dark:border-borderBase-dark text-xs font-mono">
            {loading ? (
              <span className="text-textMuted-light dark:text-textMuted-dark flex items-center">
                <span className="animate-spin mr-1">◓</span> Checking API...
              </span>
            ) : health?.status === "healthy" ? (
              <span className="text-status-success flex items-center">
                <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> API Online ({health.database.type})
              </span>
            ) : (
              <span className="text-status-danger flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" /> API Degraded
              </span>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-1.5 rounded border border-borderBase-light dark:border-borderBase-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-6">
        {/* Banner / Stage Info */}
        <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark rounded-md p-5">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h1 className="text-lg font-semibold tracking-tight">Control Plane Foundation</h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium uppercase tracking-wider bg-accent-light dark:bg-accent-dark text-accent dark:text-white">
                  Slice 1.1 Complete
                </span>
              </div>
              <p className="text-xs text-textMuted-light dark:text-textMuted-dark max-w-2xl">
                Monorepo skeleton established. Next.js App Router frontend and FastAPI backend communicating over typed endpoints with automated unit tests and dual-database support.
              </p>
            </div>
          </div>
        </div>

        {/* Operational Modules Overview Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark p-4 rounded-md space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">
              <FolderKanban className="w-4 h-4 text-accent" />
              <span>Projects & Scrum</span>
            </div>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
              Isolated project repositories, Scrum backlogs, sprint planning, and bounded workspaces.
            </p>
            <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between text-xs">
              <span className="text-textMuted-light dark:text-textMuted-dark">Target Phase:</span>
              <span className="font-mono">Phase 3</span>
            </div>
          </div>

          <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark p-4 rounded-md space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">
              <Users className="w-4 h-4 text-accent" />
              <span>Workforce & Recruitment</span>
            </div>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
              Department structures, role catalog, agent identities, profile versioning, and qualification sandboxes.
            </p>
            <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between text-xs">
              <span className="text-textMuted-light dark:text-textMuted-dark">Target Phase:</span>
              <span className="font-mono">Phase 2 & 4</span>
            </div>
          </div>

          <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark p-4 rounded-md space-y-3">
            <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">
              <Cpu className="w-4 h-4 text-accent" />
              <span>Execution & Governance</span>
            </div>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
              MockEngineAdapter first, immutable audit trail, human approvals, and quality gates.
            </p>
            <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between text-xs">
              <span className="text-textMuted-light dark:text-textMuted-dark">Target Phase:</span>
              <span className="font-mono">Phase 5</span>
            </div>
          </div>
        </div>

        {/* Live Diagnostics & System Verification */}
        <div className="border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark rounded-md p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Terminal className="w-4 h-4 text-textMuted-light dark:text-textMuted-dark" />
              <h2 className="text-sm font-semibold">Backend Diagnostic Payload</h2>
            </div>
            <span className="text-[11px] font-mono text-textMuted-light dark:text-textMuted-dark">GET /api/v1/health</span>
          </div>

          <div className="bg-canvas-light dark:bg-canvas-dark p-3 rounded font-mono text-xs border border-borderBase-light dark:border-borderBase-dark overflow-x-auto">
            {loading ? (
              <span className="text-textMuted-light dark:text-textMuted-dark">Loading live diagnostic data...</span>
            ) : error ? (
              <span className="text-status-danger">Connection error: {error}</span>
            ) : (
              <pre className="text-textPrimary-light dark:text-textPrimary-dark">
                {JSON.stringify(health, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </main>

      {/* Persistent Footer */}
      <footer className="h-8 border-t border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark px-4 flex items-center justify-between text-[11px] text-textMuted-light dark:text-textMuted-dark">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
          <span>Human-Supervised Autonomy Active</span>
        </div>
        <div className="font-mono">
          Strict Isolation Boundary Enforced
        </div>
      </footer>
    </div>
  );
}
