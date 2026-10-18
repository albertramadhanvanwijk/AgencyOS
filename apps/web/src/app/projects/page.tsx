"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { TableSkeleton } from "../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../components/ui/ErrorState";
import { EmptyState } from "../../components/ui/EmptyState";
import {
  Plus,
  FolderKanban,
  GitBranch,
  ArrowRight,
  X,
  Target,
  Layers,
  CheckCircle2,
} from "lucide-react";

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

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create Project Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectKey, setProjectKey] = useState("");
  const [projectGoal, setProjectGoal] = useState("");

  const fetchProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://127.0.0.1:8000/api/v1/projects");
      if (!res.ok) throw new Error("Failed to load projects.");
      const data = await res.json();
      setProjects(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectName.trim() || !projectKey.trim()) return;

    try {
      setSubmitting(true);
      setModalError(null);
      const payload = {
        name: projectName.trim(),
        key: projectKey.trim().toUpperCase(),
        goal: projectGoal.trim() || undefined,
        status: "active",
      };

      const res = await fetch("http://127.0.0.1:8000/api/v1/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to create project");
      }

      setIsModalOpen(false);
      setProjectName("");
      setProjectKey("");
      setProjectGoal("");
      await fetchProjects();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setModalError(err.message);
      } else {
        setModalError("Failed to create project");
      }
    } finally {
      setSubmitting(false);
    }
  };

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
          <Button size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            New Project
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchProjects} />
      ) : projects.length === 0 ? (
        <EmptyState
          title="No projects configured"
          description="Create your first project workspace to begin managing sprints and backlog items."
          actionLabel="Create Project"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const completionPercent =
              proj.total_items > 0
                ? Math.round((proj.done_items / proj.total_items) * 100)
                : 0;

            return (
              <div
                key={proj.id}
                className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-5 space-y-4 hover:border-accent/40 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-semibold text-accent">
                        {proj.key}
                      </span>
                      <StatusBadge
                        variant={proj.status === "active" ? "success" : "neutral"}
                        label={proj.active_sprint_name || "Planning"}
                      />
                    </div>
                    <h2 className="text-base font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                      {proj.name}
                    </h2>
                  </div>
                </div>

                <p className="text-xs text-textMuted-light dark:text-textMuted-dark line-clamp-2">
                  {proj.goal || "No specific mission goal defined."}
                </p>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-textMuted-light dark:text-textMuted-dark text-[11px]">Sprint Progress</span>
                    <span className="font-mono tabular-nums text-textPrimary-light dark:text-textPrimary-dark text-[11px]">
                      {proj.done_items} of {proj.total_items} items Done ({completionPercent}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark rounded-full overflow-hidden border border-borderBase-light dark:border-borderBase-dark">
                    <div
                      className="h-full bg-status-success transition-all duration-300"
                      style={{ width: `${completionPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
                    <GitBranch className="w-3.5 h-3.5" />
                    <span className="font-mono text-[11px] truncate max-w-[200px]">
                      {proj.workspace_path}
                    </span>
                  </div>
                  <Link href={`/projects/${proj.id}/board`}>
                    <Button variant="primary" size="sm" rightIcon={<ArrowRight className="w-3 h-3" />}>
                      Scrum Board
                    </Button>
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleCreateProject}
            className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <h2 className="text-base font-semibold">Create New Project</h2>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Initializes isolated workspace repository and default Sprint 1.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2 rounded bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-medium block mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Customer Portal Redesign"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">Project Key (Unique Prefix) *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PRJ-PORTAL"
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono uppercase"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">Strategic Mission & Goal</label>
                <textarea
                  rows={3}
                  placeholder="Target outcome, tech stack boundary, and delivery objectives..."
                  value={projectGoal}
                  onChange={(e) => setProjectGoal(e.target.value)}
                  className="w-full p-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent text-xs"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={submitting}>
                Initialize Project Workspace
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
