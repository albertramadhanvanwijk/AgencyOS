"use client";

import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { UserPlus, ShieldAlert, CheckCircle2 } from "lucide-react";

export default function RecruitmentPage() {
  return (
    <AppShell>
      <PageHeader
        title="Recruitment Center"
        description="Demand analysis, qualification sandboxes, and human-supervised agent recruitment."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Recruitment" },
        ]}
        actions={
          <Button size="sm" leftIcon={<UserPlus className="w-3.5 h-3.5" />}>
            New Recruitment Request
          </Button>
        }
      />

      <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-6 space-y-4">
        <div className="flex items-center space-x-2 text-status-warning">
          <ShieldAlert className="w-4 h-4" />
          <h2 className="text-sm font-semibold">Recruitment Policy Guard</h2>
        </div>
        <p className="text-xs text-textMuted-light dark:text-textMuted-dark max-w-2xl leading-relaxed">
          Recruiting or activating a new agent identity requires human supervisor approval and sandbox qualification benchmark passage. No agent can be added directly to production sprints autonomously.
        </p>

        <div className="pt-2 flex items-center space-x-3 text-xs">
          <StatusBadge variant="info" label="0 Pending Requests" />
          <span className="text-textMuted-light dark:text-textMuted-dark">All workforce capacity requirements are currently met.</span>
        </div>
      </div>
    </AppShell>
  );
}
