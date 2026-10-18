"use client";

import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { CheckSquare, ShieldCheck, Check, X } from "lucide-react";

export default function ApprovalsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Human Approval Queue"
        description="Traceable, policy-backed approvals for agent activations, role creations, and Done state transitions."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Approvals" },
        ]}
      />

      <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-status-warning" />
            <h2 className="text-sm font-semibold">Pending Approval Queue (1)</h2>
          </div>
          <StatusBadge variant="warning" label="Requires Human Action" />
        </div>

        <div className="border border-borderBase-light dark:border-borderBase-dark rounded p-4 bg-canvas-light dark:bg-canvas-dark space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark font-semibold text-accent">
                  APP-001
                </span>
                <span className="text-xs font-semibold">Activate Agent Identity: Sentinel (QA Lead)</span>
              </div>
              <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                Requested by: <span className="font-medium">System Onboarding</span> • Policy Basis: <span className="font-mono">POL-AGENT-ACTIVATION-V1</span>
              </p>
            </div>
            <StatusBadge variant="info" label="Sandbox Passed" />
          </div>

          <p className="text-xs text-textMuted-light dark:text-textMuted-dark bg-surface-light dark:bg-surface-dark p-2.5 rounded border border-borderBase-light dark:border-borderBase-dark">
            Agent passed all 5 automated benchmark test suites in sandbox run <code className="text-accent font-mono">run-sandbox-789</code>. Ready for production sprint assignment upon human confirmation.
          </p>

          <div className="pt-2 flex items-center justify-end space-x-2">
            <Button variant="danger" size="sm" leftIcon={<X className="w-3.5 h-3.5" />}>
              Reject
            </Button>
            <Button variant="primary" size="sm" leftIcon={<Check className="w-3.5 h-3.5" />}>
              Approve & Activate
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
