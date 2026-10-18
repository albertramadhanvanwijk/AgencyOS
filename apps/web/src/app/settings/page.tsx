"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Settings, Cpu, HardDrive, Shield } from "lucide-react";

interface SystemStatus {
  environment: string;
  debug: boolean;
  version: string;
  workspace_root: string;
  workspace_initialized: boolean;
  engine_adapter_default: string;
}

export default function SettingsPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/v1/system/status")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Engine Adapters Config */}
        <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Cpu className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold">Engine Adapters</h2>
          </div>
          <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
            Adapter registry status following honesty rule (Not configured, Configured, Verified, Error, Unsupported).
          </p>

          <div className="space-y-2 pt-2 border-t border-borderBase-light dark:border-borderBase-dark text-xs">
            <div className="flex items-center justify-between p-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark">
              <div>
                <span className="font-semibold block">MockEngineAdapter</span>
                <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">Local deterministic runner</span>
              </div>
              <StatusBadge variant="success" label="Verified" />
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark opacity-60">
              <div>
                <span className="font-semibold block">Anthropic Claude CLI</span>
                <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">Live agent adapter</span>
              </div>
              <StatusBadge variant="neutral" label="Not Configured" />
            </div>

            <div className="flex items-center justify-between p-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark opacity-60">
              <div>
                <span className="font-semibold block">OpenAI Codex / GPT</span>
                <span className="text-[11px] text-textMuted-light dark:text-textMuted-dark">Live agent adapter</span>
              </div>
              <StatusBadge variant="neutral" label="Not Configured" />
            </div>
          </div>
        </div>

        {/* Workspace & Isolation Config */}
        <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <HardDrive className="w-4 h-4 text-accent" />
            <h2 className="text-sm font-semibold">Workspace Isolation Boundary</h2>
          </div>
          <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
            Each project repository and run is strictly confined to canonical paths.
          </p>

          <div className="space-y-3 pt-2 border-t border-borderBase-light dark:border-borderBase-dark text-xs">
            <div className="space-y-1">
              <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">Workspace Root:</span>
              <div className="font-mono text-[11px] p-2 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark text-accent">
                {status?.workspace_root || "./workspaces"}
              </div>
            </div>

            <div className="space-y-1">
              <span className="text-textMuted-light dark:text-textMuted-dark block text-[11px]">Environment Mode:</span>
              <div className="font-mono text-[11px] p-2 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark">
                {status?.environment || "development"} (Debug: {status?.debug ? "True" : "False"})
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
