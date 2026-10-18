"use client";

import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { PriorityIndicator } from "../../components/ui/PriorityIndicator";
import { Button } from "../../components/ui/Button";
import { Plus, FolderKanban, GitBranch, ArrowRight } from "lucide-react";

export default function ProjectsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Projects & Scrum"
        description="Project repositories, isolated workspaces, Scrum backlogs, and sprint execution."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Projects" },
        ]}
        actions={
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            New Project
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Project Card 1 */}
        <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-semibold text-accent">
                  PRJ-CORE
                </span>
                <StatusBadge variant="success" label="Active Sprint" />
              </div>
              <h2 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                AgencyOS Core Platform
              </h2>
            </div>
            <PriorityIndicator level="critical" />
          </div>

          <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
            Foundation control plane, Scrum state machine, workforce identity management, and isolated execution runs.
          </p>

          <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="font-mono">workspaces/prj-core</span>
            </div>
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Open Project
            </Button>
          </div>
        </div>

        {/* Project Card 2 */}
        <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <span className="font-mono text-xs px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-semibold text-accent">
                  PRJ-EVAL
                </span>
                <StatusBadge variant="info" label="Backlog Ready" />
              </div>
              <h2 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                Agent Qualification Benchmark
              </h2>
            </div>
            <PriorityIndicator level="medium" />
          </div>

          <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
            Standardized coding and design benchmark tasks to qualify new AI agent identities before production activation.
          </p>

          <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
              <GitBranch className="w-3.5 h-3.5" />
              <span className="font-mono">workspaces/prj-eval</span>
            </div>
            <Button variant="outline" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
              Open Project
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
