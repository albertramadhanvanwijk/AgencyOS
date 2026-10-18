"use client";

import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { History, Shield, Terminal } from "lucide-react";

export default function AuditPage() {
  const events = [
    {
      id: "AUD-003",
      timestamp: "2026-10-19T03:21:55Z",
      actor: "Agency Owner",
      action: "DEPLOY_FOUNDATION_SLICE",
      target: "SYSTEM_CORE",
      status: "SUCCESS",
    },
    {
      id: "AUD-002",
      timestamp: "2026-10-19T03:15:10Z",
      actor: "System Engine",
      action: "EXECUTE_API_HEALTH_TESTS",
      target: "PYTEST_SUITE",
      status: "SUCCESS",
    },
    {
      id: "AUD-001",
      timestamp: "2026-10-19T03:06:50Z",
      actor: "Agency Owner",
      action: "INIT_GIT_REPOSITORY",
      target: "REPO_CONFIG",
      status: "SUCCESS",
    },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Activity & Audit Log"
        description="Immutable, chronological record of consequential transitions, policy decisions, and execution runs."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Audit" },
        ]}
      />

      <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark overflow-hidden">
        <div className="px-4 py-3 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <History className="w-4 h-4 text-textMuted-light dark:text-textMuted-dark" />
            <h2 className="text-sm font-semibold">Provenance Trail</h2>
          </div>
          <span className="text-xs font-mono text-textMuted-light dark:text-textMuted-dark">3 Events recorded</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-b border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
              <tr>
                <th className="py-2.5 px-4 font-mono">Event ID</th>
                <th className="py-2.5 px-4">Timestamp (UTC)</th>
                <th className="py-2.5 px-4">Actor</th>
                <th className="py-2.5 px-4">Action</th>
                <th className="py-2.5 px-4">Target Scope</th>
                <th className="py-2.5 px-4 text-right">Outcome</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase-light dark:divide-borderBase-dark font-mono text-[11px]">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-surfaceSecondary-light/50 dark:hover:bg-surfaceSecondary-dark/50">
                  <td className="py-3 px-4 font-semibold text-accent">{e.id}</td>
                  <td className="py-3 px-4 text-textMuted-light dark:text-textMuted-dark">{e.timestamp}</td>
                  <td className="py-3 px-4 font-sans font-medium text-textPrimary-light dark:text-textPrimary-dark">{e.actor}</td>
                  <td className="py-3 px-4 text-textPrimary-light dark:text-textPrimary-dark font-semibold">{e.action}</td>
                  <td className="py-3 px-4 text-textMuted-light dark:text-textMuted-dark">{e.target}</td>
                  <td className="py-3 px-4 text-right font-sans">
                    <StatusBadge variant="success" label={e.status} size="sm" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
