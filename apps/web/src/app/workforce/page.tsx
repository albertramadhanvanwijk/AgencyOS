"use client";

import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { CapacityIndicator } from "../../components/ui/CapacityIndicator";
import { Button } from "../../components/ui/Button";
import { Plus, UserPlus, Filter, ShieldCheck } from "lucide-react";

export default function WorkforcePage() {
  const agents = [
    {
      name: "Atlas",
      role: "Backend Architect & Lead",
      dept: "Engineering",
      lifecycle: "active",
      qualification: "passed",
      engine: "MockEngineAdapter",
      runs: 1,
      maxRuns: 2,
    },
    {
      name: "Kairo",
      role: "Frontend Engineer (Next.js/React)",
      dept: "Engineering",
      lifecycle: "active",
      qualification: "passed",
      engine: "MockEngineAdapter",
      runs: 1,
      maxRuns: 2,
    },
    {
      name: "Scribe",
      role: "Technical Product Owner",
      dept: "Product",
      lifecycle: "active",
      qualification: "passed",
      engine: "MockEngineAdapter",
      runs: 0,
      maxRuns: 1,
    },
    {
      name: "Sentinel",
      role: "QA & Quality Gate Validator",
      dept: "Quality",
      lifecycle: "testing",
      qualification: "in_progress",
      engine: "MockEngineAdapter",
      runs: 0,
      maxRuns: 1,
    },
  ];

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
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" leftIcon={<Filter className="w-3.5 h-3.5" />}>
              Filter
            </Button>
            <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
              Create Agent Identity
            </Button>
          </div>
        }
      />

      <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-b border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
              <tr>
                <th className="py-2.5 px-4">Agent Identity</th>
                <th className="py-2.5 px-4">Job Role</th>
                <th className="py-2.5 px-4">Department</th>
                <th className="py-2.5 px-4">Lifecycle State</th>
                <th className="py-2.5 px-4">Qualification</th>
                <th className="py-2.5 px-4">Execution Engine</th>
                <th className="py-2.5 px-4 w-48">Concurrency Load</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
              {agents.map((agent) => (
                <tr key={agent.name} className="hover:bg-surfaceSecondary-light/50 dark:hover:bg-surfaceSecondary-dark/50 transition-colors">
                  <td className="py-3 px-4 font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-accent" />
                    <span>{agent.name}</span>
                  </td>
                  <td className="py-3 px-4 font-medium">{agent.role}</td>
                  <td className="py-3 px-4 text-textMuted-light dark:text-textMuted-dark">{agent.dept}</td>
                  <td className="py-3 px-4">
                    <StatusBadge
                      variant={agent.lifecycle === "active" ? "success" : "warning"}
                      label={agent.lifecycle === "active" ? "Active" : "Testing Sandbox"}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge
                      variant={agent.qualification === "passed" ? "success" : "info"}
                      label={agent.qualification === "passed" ? "Qualified" : "In Progress"}
                    />
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge variant="simulated" label={agent.engine} />
                  </td>
                  <td className="py-3 px-4">
                    <CapacityIndicator current={agent.runs} max={agent.maxRuns} showNumbers={true} />
                  </td>
                  <td className="py-3 px-4 text-right">
                    <Button variant="ghost" size="sm">
                      Inspect
                    </Button>
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
