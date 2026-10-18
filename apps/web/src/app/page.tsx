"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "../components/layout/AppShell";
import { PageHeader } from "../components/layout/PageHeader";
import { StatusBadge } from "../components/ui/StatusBadge";
import { CapacityIndicator } from "../components/ui/CapacityIndicator";
import { PriorityIndicator } from "../components/ui/PriorityIndicator";
import { Button } from "../components/ui/Button";
import {
  FolderKanban,
  Users,
  Cpu,
  ArrowRight,
  ShieldCheck,
  Activity,
  Plus,
  RefreshCw,
  Terminal,
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

interface Project {
  id: string;
  name: string;
  key: string;
  goal?: string;
  status: string;
  workspace_path: string;
  item_counter: number;
  active_sprint_name?: string;
  total_items: number;
  done_items: number;
}

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [agentsCount, setAgentsCount] = useState<number>(4);
  const [activeAgentsCount, setActiveAgentsCount] = useState<number>(2);
  const [loading, setLoading] = useState(true);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const [healthRes, projRes, agentsRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/v1/health"),
        fetch("http://127.0.0.1:8000/api/v1/projects"),
        fetch("http://127.0.0.1:8000/api/v1/agents"),
      ]);

      if (healthRes.ok) setHealth(await healthRes.json());
      if (projRes.ok) setProjects(await projRes.json());
      if (agentsRes.ok) {
        const agents = await agentsRes.json();
        setAgentsCount(agents.length);
        setActiveAgentsCount(agents.filter((a: any) => a.lifecycle_state === "active").length);
      }
    } catch {
      // Keep defaults
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const activeProjectsCount = projects.filter((p) => p.status === "active").length;
  const planningProjectsCount = projects.filter((p) => p.status === "planning").length;

  return (
    <AppShell>
      {/* Page Header */}
      <PageHeader
        title="Agency Overview"
        description="Operational portfolio health, supervised workforce capacity, and active Scrum delivery."
        badge={
          <StatusBadge
            variant={health?.status === "healthy" ? "success" : "warning"}
            label={health?.status === "healthy" ? "All Systems Operational" : "System Degraded"}
          />
        }
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOverviewData}
              isLoading={loading}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Link href="/projects">
              <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
                New Project
              </Button>
            </Link>
          </div>
        }
      />

      {/* Operational Highlights Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="p-4 rounded-md border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark space-y-2">
          <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
            <span className="font-medium">Active Projects</span>
            <FolderKanban className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold tabular-nums">{projects.length || 2}</span>
            <span className="text-xs text-status-success font-medium">Portfolio Ready</span>
          </div>
          <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
            {activeProjectsCount} in Sprint, {planningProjectsCount} in Planning
          </p>
        </div>

        {/* Metric 2 */}
        <div className="p-4 rounded-md border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark space-y-2">
          <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
            <span className="font-medium">Active Workforce</span>
            <Users className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold tabular-nums">{agentsCount}</span>
            <span className="text-xs text-textMuted-light dark:text-textMuted-dark">Identities</span>
          </div>
          <CapacityIndicator current={activeAgentsCount} max={agentsCount} label="Agency Concurrency" />
        </div>

        {/* Metric 3 */}
        <div className="p-4 rounded-md border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark space-y-2">
          <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
            <span className="font-medium">Pending Approvals</span>
            <ShieldCheck className="w-4 h-4 text-status-warning" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-2xl font-semibold tabular-nums">1</span>
            <span className="text-xs text-status-warning font-medium">Awaiting Action</span>
          </div>
          <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
            Requires human policy sign-off
          </p>
        </div>

        {/* Metric 4 */}
        <div className="p-4 rounded-md border border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark space-y-2">
          <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
            <span className="font-medium">Execution Engine</span>
            <Cpu className="w-4 h-4 text-accent" />
          </div>
          <div className="flex items-baseline space-x-2">
            <StatusBadge variant="simulated" label="MockEngineAdapter" />
          </div>
          <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
            Deterministic sandbox simulation
          </p>
        </div>
      </div>

      {/* Portfolio & Active Sprint Table */}
      <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark overflow-hidden">
        <div className="px-4 py-3 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm font-semibold tracking-tight">Active Projects Portfolio</h2>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
              Status reflects verified evidence and quality gates.
            </p>
          </div>
          <Link href="/projects" className="text-xs text-accent hover:underline flex items-center font-medium">
            View all <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-b border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
              <tr>
                <th className="py-2.5 px-4">Project Key</th>
                <th className="py-2.5 px-4">Project Name</th>
                <th className="py-2.5 px-4">Current Sprint</th>
                <th className="py-2.5 px-4">Priority</th>
                <th className="py-2.5 px-4">Health</th>
                <th className="py-2.5 px-4">Assigned Agents</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
              {projects.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-textMuted-light dark:text-textMuted-dark">
                    No active projects found.
                  </td>
                </tr>
              ) : (
                projects.map((proj) => {
                  const isPlanning = proj.status === "planning";
                  const completionPercent =
                    proj.total_items > 0
                      ? Math.round((proj.done_items / proj.total_items) * 100)
                      : 0;

                  return (
                    <tr
                      key={proj.id}
                      className="hover:bg-surfaceSecondary-light/50 dark:hover:bg-surfaceSecondary-dark/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-accent">{proj.key}</td>
                      <td className="py-3 px-4 font-medium">{proj.name}</td>
                      <td className="py-3 px-4">
                        {isPlanning ? (
                          <span className="text-textMuted-light dark:text-textMuted-dark">
                            {proj.active_sprint_name || "Sprint 0"} (Backlog Refinement)
                          </span>
                        ) : (
                          <span>
                            {proj.active_sprint_name || "Sprint 1"} ({completionPercent}%)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <PriorityIndicator level={isPlanning ? "medium" : "critical"} />
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          variant={isPlanning ? "info" : proj.status === "active" ? "success" : "neutral"}
                          label={isPlanning ? "Planning" : proj.status === "active" ? "On Track" : proj.status}
                        />
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-textMuted-light dark:text-textMuted-dark">
                        {isPlanning ? "1 Agent assigned (Rian Nugraha)" : "2 Agents active"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link href={`/projects/${proj.id}/board`}>
                          <Button variant="ghost" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                            Inspect
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Design System Token Verification Card */}
      <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Terminal className="w-4 h-4 text-textMuted-light dark:text-textMuted-dark" />
            <h3 className="text-sm font-semibold">UI Design System Tokens & Component States</h3>
          </div>
          <span className="text-[11px] font-mono text-textMuted-light dark:text-textMuted-dark">
            docs/UX_UI_DESIGN_SYSTEM.md
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          {/* Status Badges */}
          <div className="p-3 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark block">
              Status Badges
            </span>
            <div className="flex flex-wrap gap-1.5">
              <StatusBadge variant="success" label="Passed" />
              <StatusBadge variant="warning" label="Pending" />
              <StatusBadge variant="danger" label="Failed" />
              <StatusBadge variant="info" label="Queued" />
              <StatusBadge variant="simulated" label="Simulated" />
            </div>
          </div>

          {/* Button Variants */}
          <div className="p-3 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark block">
              Button Controls
            </span>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="primary">Primary</Button>
              <Button size="sm" variant="secondary">Secondary</Button>
              <Button size="sm" variant="outline">Outline</Button>
              <Button size="sm" variant="danger">Danger</Button>
            </div>
          </div>

          {/* Priorities */}
          <div className="p-3 rounded bg-canvas-light dark:bg-canvas-dark border border-borderBase-light dark:border-borderBase-dark space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark block">
              Priority Levels
            </span>
            <div className="flex flex-col space-y-1">
              <PriorityIndicator level="critical" />
              <PriorityIndicator level="high" />
              <PriorityIndicator level="medium" />
              <PriorityIndicator level="low" />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
