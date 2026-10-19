"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { AppShell } from "../../../../components/layout/AppShell";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { StatusBadge } from "../../../../components/ui/StatusBadge";
import { Button } from "../../../../components/ui/Button";
import { TableSkeleton } from "../../../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../../../components/ui/ErrorState";
import {
  TrendingDown,
  TrendingUp,
  BarChart2,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Users,
  Zap,
  ListTodo,
  Kanban,
  FileText,
  Layers,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Check,
  Rocket,
  Copy,
  ExternalLink,
  Tag,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

interface BurndownDayPoint {
  day: number;
  date: string;
  ideal_remaining: number;
  actual_remaining: number | null;
}

interface BurndownAssigneeItem {
  agent_id?: string;
  name: string;
  role_name?: string;
  allocated_points: number;
  completed_points: number;
}

interface SprintBurndownData {
  sprint_id: string;
  sprint_name: string;
  sprint_status: string;
  sprint_goal?: string;
  start_date: string;
  end_date: string;
  total_days: number;
  current_day: number;
  total_points: number;
  completed_points: number;
  remaining_points: number;
  ideal_today: number;
  variance: number;
  health_status: "ahead" | "on_track" | "behind";
  days: BurndownDayPoint[];
  status_breakdown: Record<string, number>;
  assignee_breakdown: BurndownAssigneeItem[];
}

interface SprintVelocityItem {
  sprint_id: string;
  name: string;
  status: string;
  committed_points: number;
  completed_points: number;
  delivery_rate: number;
}

interface ProjectVelocityData {
  project_id: string;
  average_velocity: number;
  predictability_rate: number;
  completed_sprints_count: number;
  sprints: SprintVelocityItem[];
}

interface Sprint {
  id: string;
  name: string;
  status: string;
  goal?: string;
  retrospective?: {
    went_well?: string[];
    bottlenecks?: string[];
    action_items?: string[];
  };
  review_notes?: string;
  approved_by?: string;
  approved_at?: string;
}

interface Project {
  id: string;
  name: string;
  key: string;
  github_repo_url?: string;
  github_repo_name?: string;
}

interface ReleaseFeatureItem {
  key: string;
  title: string;
  type: string;
  estimate_points: number;
  qa_status?: string;
  sprint_name?: string;
  pull_request_url?: string;
  git_branch?: string;
}

interface ReleaseNotesData {
  project_id: string;
  project_name: string;
  project_key: string;
  version_tag: string;
  generated_at: string;
  total_features_delivered: number;
  total_points_delivered: number;
  qa_certification_rate: number;
  features: ReleaseFeatureItem[];
  retrospective_highlights: {
    went_well?: string[];
    bottlenecks?: string[];
    action_items?: string[];
  };
  markdown: string;
}

export default function SprintAnalyticsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ sprint?: string }>;
}) {
  const resolvedParams = use(params);
  const resolvedSearchParams = searchParams ? use(searchParams) : undefined;
  const projectId = resolvedParams.id;
  const initialSprintParam = resolvedSearchParams?.sprint;

  const [project, setProject] = useState<Project | null>(null);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [selectedSprintId, setSelectedSprintId] = useState<string>(initialSprintParam || "");
  const [burndown, setBurndown] = useState<SprintBurndownData | null>(null);
  const [velocity, setVelocity] = useState<ProjectVelocityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Phase 5 Tabs & Release State
  const [activeViewTab, setActiveViewTab] = useState<"metrics" | "retrospective" | "release">("metrics");
  const [releaseNotes, setReleaseNotes] = useState<ReleaseNotesData | null>(null);
  const [loadingRelease, setLoadingRelease] = useState(false);
  const [publishingRelease, setPublishingRelease] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<string | null>(null);
  const [releaseError, setReleaseError] = useState<string | null>(null);
  const [versionTagInput, setVersionTagInput] = useState("v1.0.0");
  const [copiedRelease, setCopiedRelease] = useState(false);

  const fetchAnalyticsData = useCallback(async (sprintIdOverride?: string) => {
    try {
      setLoading(true);
      setError(null);
      const targetSprint = sprintIdOverride !== undefined ? sprintIdOverride : selectedSprintId;
      const sprintQuery = targetSprint ? `?sprint_id=${targetSprint}` : "";

      const [projRes, sprintsRes, burndownRes, velocityRes] = await Promise.all([
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/sprints`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/analytics/burndown${sprintQuery}`),
        fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/analytics/velocity`),
      ]);

      if (!projRes.ok || !burndownRes.ok || !velocityRes.ok) {
        throw new Error("Gagal memuat data analitik sprint.");
      }

      const projData = await projRes.json();
      const sprintsData = sprintsRes.ok ? await sprintsRes.json() : [];
      const burndownData = await burndownRes.json();
      const velocityData = await velocityRes.json();

      setProject(projData);
      setSprints(sprintsData);
      setBurndown(burndownData);
      setVelocity(velocityData);
      if (!selectedSprintId && burndownData?.sprint_id) {
        setSelectedSprintId(burndownData.sprint_id);
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Terjadi kesalahan tak terduga saat memuat data analitik.");
      }
    } finally {
      setLoading(false);
    }
  }, [projectId, selectedSprintId]);

  const fetchReleaseNotes = useCallback(async (version?: string) => {
    try {
      setLoadingRelease(true);
      setReleaseError(null);
      const targetVersion = version || versionTagInput || "v1.0.0";
      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/release-notes?version_tag=${targetVersion}`);
      if (!res.ok) {
        throw new Error("Gagal memuat release notes dari server.");
      }
      const data = await res.json();
      setReleaseNotes(data);
    } catch (err: unknown) {
      setReleaseError(err instanceof Error ? err.message : "Gagal memuat release notes.");
    } finally {
      setLoadingRelease(false);
    }
  }, [projectId, versionTagInput]);

  const handlePublishRelease = async () => {
    try {
      setPublishingRelease(true);
      setPublishSuccess(null);
      setReleaseError(null);
      const res = await fetch(`http://127.0.0.1:8000/api/v1/projects/${projectId}/publish-release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          version_tag: versionTagInput || "v1.0.0",
          commit_to_repo: true,
        }),
      });
      if (!res.ok) {
        throw new Error("Gagal mempublikasikan release notes ke repositori.");
      }
      const data = await res.json();
      setPublishSuccess(data.message || `Release ${versionTagInput} berhasil dipublikasikan.`);
      await fetchReleaseNotes(versionTagInput);
    } catch (err: unknown) {
      setReleaseError(err instanceof Error ? err.message : "Gagal mempublikasikan release.");
    } finally {
      setPublishingRelease(false);
    }
  };

  const handleCopyMarkdown = () => {
    if (releaseNotes?.markdown) {
      navigator.clipboard.writeText(releaseNotes.markdown);
      setCopiedRelease(true);
      setTimeout(() => setCopiedRelease(false), 2000);
    }
  };

  useEffect(() => {
    if (initialSprintParam && initialSprintParam !== selectedSprintId) {
      setSelectedSprintId(initialSprintParam);
      fetchAnalyticsData(initialSprintParam);
    }
  }, [initialSprintParam]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Selected Sprint for Retrospective
  const currentSprintObj = sprints.find((s) => s.id === selectedSprintId) || sprints[0];

  // SVG Chart Dimensions & Scaling
  const chartWidth = 720;
  const chartHeight = 260;
  const padding = { top: 20, right: 30, bottom: 40, left: 45 };

  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const maxPoints = Math.max(
    10,
    burndown?.total_points || 0,
    ...(burndown?.days.map((d) => Math.max(d.ideal_remaining, d.actual_remaining || 0)) || [])
  );

  const getX = (dayIndex: number, totalDays: number) => {
    if (totalDays <= 0) return padding.left;
    return padding.left + (dayIndex / totalDays) * innerWidth;
  };

  const getY = (val: number) => {
    if (maxPoints <= 0) return padding.top + innerHeight;
    return padding.top + innerHeight - (val / maxPoints) * innerHeight;
  };

  return (
    <AppShell>
      <PageHeader
        title={`${project?.name || "Project"} — Analitik & Laporan Sprint`}
        description="Grafik Burndown riil vs target ideal, metrik Team Velocity, Retrospektif Agile, dan Hub Rilis DevOps."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Projects", href: "/projects" },
          { label: project?.name || "Analytics" },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchAnalyticsData();
                if (activeViewTab === "release") {
                  fetchReleaseNotes();
                }
              }}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs: SDLC Stages */}
      <div className="flex items-center space-x-2 border-b border-borderBase-light dark:border-borderBase-dark pb-3 overflow-x-auto">
        <Link
          href={`/projects/${projectId}/prd`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
        >
          <FileText className="w-4 h-4" />
          <span>1. Dokumen PRD</span>
        </Link>
        <Link
          href={`/projects/${projectId}/architecture`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
        >
          <Layers className="w-4 h-4" />
          <span>2. Arsitektur & Desain</span>
        </Link>
        <Link
          href={`/projects/${projectId}/backlog`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
        >
          <ListTodo className="w-4 h-4" />
          <span>3. Backlog & Sprints</span>
        </Link>
        <Link
          href={`/projects/${projectId}/board`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors shrink-0"
        >
          <Kanban className="w-4 h-4" />
          <span>4. Papan Scrum (Board)</span>
        </Link>
        <Link
          href={`/projects/${projectId}/analytics`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent/10 text-accent border border-accent/20 transition-colors shrink-0"
        >
          <BarChart2 className="w-4 h-4" />
          <span>5. Analitik & Retro</span>
        </Link>
      </div>

      {/* Sub-Views for Stage 5: Metrics, Retrospective, Release */}
      <div className="flex items-center space-x-2 pt-1 pb-1 overflow-x-auto">
        <button
          onClick={() => setActiveViewTab("metrics")}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            activeViewTab === "metrics"
              ? "bg-accent text-white shadow-xs"
              : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Metrik & Burndown Chart</span>
        </button>
        <button
          onClick={() => setActiveViewTab("retrospective")}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            activeViewTab === "retrospective"
              ? "bg-accent text-white shadow-xs"
              : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Retrospektif Sprint</span>
        </button>
        <button
          onClick={() => {
            setActiveViewTab("release");
            if (!releaseNotes) {
              fetchReleaseNotes();
            }
          }}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 ${
            activeViewTab === "release"
              ? "bg-accent text-white shadow-xs"
              : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
          }`}
        >
          <Rocket className="w-3.5 h-3.5" />
          <span>DevOps & Delivery Hub</span>
        </button>
      </div>

      {loading ? (
        <TableSkeleton rows={5} />
      ) : error ? (
        <ErrorState message={error} onRetry={() => fetchAnalyticsData()} />
      ) : !burndown ? (
        <div className="p-8 text-center text-xs text-textMuted-light dark:text-textMuted-dark italic">
          Belum ada data sprint untuk dianalisis.
        </div>
      ) : (
        <div className="space-y-5">
          {/* SPRINT SELECTOR & SUMMARY HEADER (Used in Metrics & Retrospective) */}
          {activeViewTab !== "release" && (
            <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded bg-accent/10 text-accent">
                  <BarChart2 className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-textMuted-light dark:text-textMuted-dark font-medium">Sprint Terpilih:</span>
                    <select
                      value={selectedSprintId}
                      onChange={(e) => {
                        setSelectedSprintId(e.target.value);
                        fetchAnalyticsData(e.target.value);
                      }}
                      className="h-8 px-2.5 text-xs font-semibold bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:ring-1 focus:ring-accent cursor-pointer"
                    >
                      {sprints.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.status})
                        </option>
                      ))}
                    </select>
                    <StatusBadge
                      variant={burndown.sprint_status === "completed" ? "neutral" : "success"}
                      label={burndown.sprint_status === "completed" ? "Selesai" : "Sprint Aktif"}
                    />
                  </div>
                  {burndown.sprint_goal && (
                    <p className="text-xs text-textMuted-light dark:text-textMuted-dark mt-1">
                      Goal: {burndown.sprint_goal}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <span className="text-textMuted-light dark:text-textMuted-dark font-mono">
                  {burndown.start_date} s/d {burndown.end_date} (Hari ke-{burndown.current_day} dari {burndown.total_days})
                </span>
              </div>
            </div>
          )}

          {/* TAB 1: METRICS & BURNDOWN */}
          {activeViewTab === "metrics" && (
            <>
              {/* KPI CARDS ROW */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {/* Card 1: Burndown Track Health */}
                <div className="p-3.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
                    <span>Status Ritme Sprint</span>
                    {burndown.health_status === "ahead" ? (
                      <TrendingDown className="w-4 h-4 text-status-success" />
                    ) : burndown.health_status === "behind" ? (
                      <TrendingUp className="w-4 h-4 text-status-danger" />
                    ) : (
                      <Activity className="w-4 h-4 text-accent" />
                    )}
                  </div>
                  <div className="flex items-baseline space-x-2">
                    <span
                      className={`text-xl font-bold ${
                        burndown.health_status === "ahead"
                          ? "text-status-success"
                          : burndown.health_status === "behind"
                          ? "text-status-danger"
                          : "text-accent"
                      }`}
                    >
                      {burndown.health_status === "ahead"
                        ? "Lebih Cepat"
                        : burndown.health_status === "behind"
                        ? "Tertinggal"
                        : "Sesuai Target"}
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    {burndown.variance < 0
                      ? `${Math.abs(burndown.variance)} SP lebih cepat dari garis ideal`
                      : burndown.variance > 0
                      ? `${burndown.variance} SP tertinggal dari garis ideal`
                      : "Presisi mengikuti target burn rate ideal"}
                  </p>
                </div>

                {/* Card 2: Sisa Beban SP */}
                <div className="p-3.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
                    <span>Sisa Story Points</span>
                    <span className="font-mono text-status-success text-[11px]">
                      Tuntas: {burndown.completed_points} SP
                    </span>
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-bold text-textPrimary-light dark:text-textPrimary-dark font-mono">
                      {burndown.remaining_points}
                    </span>
                    <span className="text-xs text-textMuted-light dark:text-textMuted-dark font-mono">
                      / {burndown.total_points} SP
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark overflow-hidden">
                    <div
                      className="h-full bg-status-success transition-all duration-300"
                      style={{
                        width: `${
                          burndown.total_points > 0
                            ? Math.min(100, Math.round((burndown.completed_points / burndown.total_points) * 100))
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Card 3: Rata-Rata Team Velocity */}
                <div className="p-3.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
                    <span>Rata-Rata Velocity Tim</span>
                    <Zap className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-bold text-accent font-mono">
                      {velocity?.average_velocity || 0}
                    </span>
                    <span className="text-xs text-textMuted-light dark:text-textMuted-dark font-mono">
                      SP / sprint
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Berdasarkan {velocity?.completed_sprints_count || 0} sprint yang telah selesai
                  </p>
                </div>

                {/* Card 4: Predictability Rate */}
                <div className="p-3.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
                    <span>Skor Prediktabilitas</span>
                    <ShieldCheck className="w-4 h-4 text-status-success" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-bold text-textPrimary-light dark:text-textPrimary-dark font-mono">
                      {velocity?.predictability_rate || 100}%
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Rasio komitmen komit vs delivery tuntas
                  </p>
                </div>
              </div>

              {/* SECTION: SPRINT BURNDOWN CHART (SVG) */}
              <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-4 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
                      <TrendingDown className="w-4 h-4 text-accent" />
                      <span>Grafik Sprint Burndown ({burndown.sprint_name})</span>
                    </h3>
                    <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                      Garis abu-abu putus-putus menunjukkan target ideal; garis biru solid menunjukkan sisa SP aktual tim.
                    </p>
                  </div>

                  {/* Chart Legend */}
                  <div className="flex items-center space-x-4 text-xs font-mono">
                    <div className="flex items-center space-x-1.5">
                      <span className="w-4 h-0.5 border-t-2 border-dashed border-textMuted-light dark:border-textMuted-dark" />
                      <span className="text-textMuted-light dark:text-textMuted-dark text-[11px]">Ideal Burn</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className="w-4 h-1 bg-accent rounded" />
                      <span className="font-semibold text-accent text-[11px]">Sisa SP Riil</span>
                    </div>
                  </div>
                </div>

                {/* SVG Interactive Chart Canvas */}
                <div className="w-full overflow-x-auto">
                  <svg
                    viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                    className="w-full h-auto min-w-[620px] max-h-[300px]"
                  >
                    {/* Horizontal Grid Lines & Y-axis labels */}
                    {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
                      const val = Math.round(maxPoints * pct);
                      const y = getY(val);
                      return (
                        <g key={pct}>
                          <line
                            x1={padding.left}
                            y1={y}
                            x2={chartWidth - padding.right}
                            y2={y}
                            stroke="currentColor"
                            className="text-borderBase-light/60 dark:text-borderBase-dark/60"
                            strokeDasharray="3 3"
                            strokeWidth="1"
                          />
                          <text
                            x={padding.left - 8}
                            y={y + 4}
                            textAnchor="end"
                            className="text-[10px] fill-textMuted-light dark:fill-textMuted-dark font-mono"
                          >
                            {val}
                          </text>
                        </g>
                      );
                    })}

                    {/* X-axis Days & Date Labels */}
                    {burndown.days.map((d) => {
                      const x = getX(d.day, burndown.total_days);
                      return (
                        <g key={d.day}>
                          <line
                            x1={x}
                            y1={chartHeight - padding.bottom}
                            x2={x}
                            y2={padding.top}
                            stroke="currentColor"
                            className="text-borderBase-light/30 dark:text-borderBase-dark/30"
                            strokeWidth="1"
                          />
                          <text
                            x={x}
                            y={chartHeight - padding.bottom + 16}
                            textAnchor="middle"
                            className="text-[10px] fill-textMuted-light dark:fill-textMuted-dark font-mono"
                          >
                            H-{d.day}
                          </text>
                          <text
                            x={x}
                            y={chartHeight - padding.bottom + 28}
                            textAnchor="middle"
                            className="text-[8px] fill-textMuted-light/70 dark:fill-textMuted-dark/70 font-mono"
                          >
                            {d.date.slice(5)}
                          </text>
                        </g>
                      );
                    })}

                    {/* 1. IDEAL BURNDOWN LINE */}
                    {(() => {
                      const idealPoints = burndown.days.map(
                        (d) => `${getX(d.day, burndown.total_days)},${getY(d.ideal_remaining)}`
                      );
                      return (
                        <polyline
                          fill="none"
                          stroke="currentColor"
                          className="text-textMuted-light dark:text-textMuted-dark"
                          strokeWidth="2"
                          strokeDasharray="4 4"
                          points={idealPoints.join(" ")}
                        />
                      );
                    })()}

                    {/* 2. ACTUAL BURNDOWN LINE */}
                    {(() => {
                      const validDays = burndown.days.filter((d) => d.actual_remaining !== null);
                      if (validDays.length === 0) return null;

                      const pointsString = validDays
                        .map((d) => `${getX(d.day, burndown.total_days)},${getY(d.actual_remaining!)}`)
                        .join(" ");

                      return (
                        <g>
                          <polyline
                            fill="none"
                            stroke="#0D99FF"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            points={pointsString}
                          />

                          {/* Data Point Circles */}
                          {validDays.map((d) => {
                            const cx = getX(d.day, burndown.total_days);
                            const cy = getY(d.actual_remaining!);
                            return (
                              <g key={d.day}>
                                <circle
                                  cx={cx}
                                  cy={cy}
                                  r="4"
                                  fill="#0D99FF"
                                  stroke="#ffffff"
                                  strokeWidth="1.5"
                                />
                              </g>
                            );
                          })}
                        </g>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* SECTION: TEAM VELOCITY TRACKING & SPRINT-OVER-SPRINT COMPARISON */}
              {velocity && velocity.sprints.length > 0 && (
                <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-4 shadow-xs">
                  <div>
                    <h3 className="text-sm font-bold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
                      <BarChart2 className="w-4 h-4 text-accent" />
                      <span>Tren Team Velocity (Perbandingan Antar-Sprint)</span>
                    </h3>
                    <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                      Beban komitmen Story Points (abu-abu) dibandingkan capaian tuntas aktual (hijau) di setiap sprint.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {velocity.sprints.map((s) => (
                      <div
                        key={s.sprint_id}
                        className="p-3 rounded border border-borderBase-light dark:border-borderBase-dark bg-surfaceSecondary-light/40 dark:bg-surfaceSecondary-dark/40 space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                            {s.name}
                          </span>
                          <StatusBadge
                            variant={s.status === "completed" ? "neutral" : "success"}
                            label={s.status === "completed" ? "Selesai" : "Aktif"}
                          />
                        </div>

                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono text-textMuted-light dark:text-textMuted-dark">
                            <span>Delivery: {s.completed_points} / {s.committed_points} SP</span>
                            <span className="font-semibold text-status-success">{s.delivery_rate}%</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark overflow-hidden flex">
                            <div
                              className="h-full bg-status-success transition-all duration-300"
                              style={{
                                width: `${Math.min(100, s.delivery_rate)}%`,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: BREAKDOWN PANELS (STATUS & AGENT WORKLOAD) */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Status Breakdown Panel */}
                <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark flex items-center space-x-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-accent" />
                    <span>Distribusi Status Work Item ({burndown.sprint_name})</span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    {[
                      { label: "Done (Tuntas)", count: burndown.status_breakdown.done || 0, color: "bg-status-success" },
                      { label: "In Review (Review)", count: burndown.status_breakdown.in_review || 0, color: "bg-status-warning" },
                      { label: "In Progress (Eksekusi)", count: burndown.status_breakdown.in_progress || 0, color: "bg-accent" },
                      { label: "Ready (Siap)", count: burndown.status_breakdown.ready || 0, color: "bg-textMuted-light dark:bg-textMuted-dark" },
                      { label: "Blocked (Terkendala)", count: burndown.status_breakdown.blocked || 0, color: "bg-status-danger" },
                    ].map((st) => (
                      <div key={st.label} className="flex items-center justify-between p-2 rounded bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/30">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${st.color}`} />
                          <span>{st.label}</span>
                        </div>
                        <span className="font-mono font-semibold">{st.count} task</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Agent Workload & Delivery Contribution */}
                <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-3 shadow-xs">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark flex items-center space-x-1.5">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    <span>Kontribusi & Beban Agen ({burndown.assignee_breakdown.length})</span>
                  </h4>

                  <div className="space-y-2 text-xs">
                    {burndown.assignee_breakdown.length === 0 ? (
                      <div className="p-4 text-center text-xs text-textMuted-light dark:text-textMuted-dark italic">
                        Belum ada agen yang ditugaskan ke work item pada sprint ini.
                      </div>
                    ) : (
                      burndown.assignee_breakdown.map((agent) => (
                        <div
                          key={agent.agent_id || agent.name}
                          className="p-2.5 rounded bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/30 space-y-1.5"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold">{agent.name}</span>
                              {agent.role_name && (
                                <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                                  ({agent.role_name})
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[11px] font-semibold text-accent">
                              {agent.completed_points} / {agent.allocated_points} SP
                            </span>
                          </div>

                          <div className="w-full h-1.5 rounded-full bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark overflow-hidden">
                            <div
                              className="h-full bg-accent transition-all duration-300"
                              style={{
                                width: `${
                                  agent.allocated_points > 0
                                    ? Math.min(100, Math.round((agent.completed_points / agent.allocated_points) * 100))
                                    : 0
                                }%`,
                              }}
                            />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SPRINT RETROSPECTIVE */}
          {activeViewTab === "retrospective" && (
            <div className="space-y-4">
              {/* Retrospective Header Card */}
              <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <RotateCcw className="w-5 h-5 text-accent" />
                    <h3 className="text-sm font-bold text-textPrimary-light dark:text-textPrimary-dark">
                      Scrum Retrospective — {currentSprintObj?.name || burndown.sprint_name}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge
                      variant={currentSprintObj?.status === "completed" ? "neutral" : "success"}
                      label={currentSprintObj?.status === "completed" ? "Sprint Selesai" : "Sprint Sedang Berjalan"}
                    />
                  </div>
                </div>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Evaluasi kualitatif dan retrospektif agile atas apa yang berjalan lancar, kendala bottleneck kerja agen, serta tindakan perbaikan untuk sprint berikutnya.
                </p>
              </div>

              {/* 3 Pillars of Retrospective: Went Well, Bottlenecks, Action Items */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Went Well */}
                <div className="p-4 rounded-lg border border-status-success/30 bg-status-success/5 dark:bg-status-success/10 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-status-success/20">
                    <div className="flex items-center space-x-1.5 text-status-success font-semibold text-xs">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Apa yang Berjalan Baik (Went Well)</span>
                    </div>
                  </div>
                  {currentSprintObj?.retrospective?.went_well && currentSprintObj.retrospective.went_well.length > 0 ? (
                    <ul className="space-y-2 text-xs">
                      {currentSprintObj.retrospective.went_well.map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-textPrimary-light dark:text-textPrimary-dark">
                          <span className="w-1.5 h-1.5 rounded-full bg-status-success shrink-0 mt-1.5" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-textMuted-light dark:text-textMuted-dark italic py-3 text-center">
                      {currentSprintObj?.status === "completed"
                        ? "Seluruh sasaran sprint tercapai tanpa catatan deviasi."
                        : "Retrospektif akan disintesis otomatis setelah sprint ini diselesaikan oleh supervisor."}
                    </div>
                  )}
                </div>

                {/* 2. Bottlenecks */}
                <div className="p-4 rounded-lg border border-amber-500/30 bg-amber-500/5 dark:bg-amber-500/10 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
                    <div className="flex items-center space-x-1.5 text-amber-600 dark:text-amber-400 font-semibold text-xs">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Kendala & Hambatan (Bottlenecks)</span>
                    </div>
                  </div>
                  {currentSprintObj?.retrospective?.bottlenecks && currentSprintObj.retrospective.bottlenecks.length > 0 ? (
                    <ul className="space-y-2 text-xs">
                      {currentSprintObj.retrospective.bottlenecks.map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-textPrimary-light dark:text-textPrimary-dark">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-textMuted-light dark:text-textMuted-dark italic py-3 text-center">
                      Tidak ada hambatan kritis yang dilaporkan selama sprint.
                    </div>
                  )}
                </div>

                {/* 3. Action Items */}
                <div className="p-4 rounded-lg border border-accent/30 bg-accent/5 dark:bg-accent/10 space-y-3 shadow-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-accent/20">
                    <div className="flex items-center space-x-1.5 text-accent font-semibold text-xs">
                      <ArrowRight className="w-4 h-4" />
                      <span>Tindakan Perbaikan (Action Items)</span>
                    </div>
                  </div>
                  {currentSprintObj?.retrospective?.action_items && currentSprintObj.retrospective.action_items.length > 0 ? (
                    <ul className="space-y-2 text-xs">
                      {currentSprintObj.retrospective.action_items.map((item, idx) => (
                        <li key={idx} className="flex items-start space-x-2 text-textPrimary-light dark:text-textPrimary-dark">
                          <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0 mt-1.5" />
                          <span className="leading-relaxed">{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-xs text-textMuted-light dark:text-textMuted-dark italic py-3 text-center">
                      Pertahankan performa dan standar Definition of Done yang telah berjalan.
                    </div>
                  )}
                </div>
              </div>

              {/* Review Notes from Human Supervisor */}
              {currentSprintObj?.review_notes && (
                <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-2 text-xs">
                  <div className="font-semibold text-textPrimary-light dark:text-textPrimary-dark flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-accent" />
                    <span>Catatan Review Supervisor Proyek:</span>
                  </div>
                  <p className="text-textSecondary-light dark:text-textSecondary-dark leading-relaxed pl-6">
                    {currentSprintObj.review_notes}
                  </p>
                  {currentSprintObj.approved_by && (
                    <div className="text-[11px] text-textMuted-light dark:text-textMuted-dark pl-6 pt-1 border-t border-borderBase-light/40 dark:border-borderBase-dark/40 flex items-center justify-between">
                      <span>Disetujui oleh: {currentSprintObj.approved_by}</span>
                      {currentSprintObj.approved_at && (
                        <span>{new Date(currentSprintObj.approved_at).toLocaleString("id-ID")}</span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DEVOPS & DELIVERY HUB */}
          {activeViewTab === "release" && (
            <div className="space-y-5">
              {/* Control Panel: Version Tag & Actions */}
              <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <Rocket className="w-5 h-5 text-accent" />
                    <h3 className="text-sm font-bold text-textPrimary-light dark:text-textPrimary-dark">
                      DevOps Release Hub & Delivery Notes
                    </h3>
                  </div>
                  <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                    Otomatisasi penyusunan dokumen rilis, rollup sertifikasi mutu QA Sentinel, dan sinkronisasi ke repositori kerja.
                  </p>
                </div>

                <div className="flex items-center space-x-2 flex-wrap gap-y-2">
                  <div className="flex items-center space-x-1.5">
                    <Tag className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark" />
                    <input
                      type="text"
                      value={versionTagInput}
                      onChange={(e) => setVersionTagInput(e.target.value)}
                      placeholder="v1.0.0"
                      className="h-8 w-24 px-2 font-mono text-xs font-semibold bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:ring-1 focus:ring-accent"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => fetchReleaseNotes(versionTagInput)}
                    isLoading={loadingRelease}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Segarkan
                  </Button>

                  <Button
                    size="sm"
                    variant="primary"
                    onClick={handlePublishRelease}
                    isLoading={publishingRelease}
                    leftIcon={<Rocket className="w-3.5 h-3.5" />}
                  >
                    Publikasikan ke Repositori
                  </Button>
                </div>
              </div>

              {/* Status alerts */}
              {publishSuccess && (
                <div className="p-3 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span>{publishSuccess}</span>
                  </div>
                  <button onClick={() => setPublishSuccess(null)} className="font-semibold underline text-[11px]">
                    Tutup
                  </button>
                </div>
              )}

              {releaseError && (
                <div className="p-3 rounded-lg bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{releaseError}</span>
                </div>
              )}

              {/* Delivery KPI Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div className="p-3.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
                    <span>Fitur Dituntaskan</span>
                    <CheckCircle2 className="w-4 h-4 text-status-success" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-bold font-mono text-textPrimary-light dark:text-textPrimary-dark">
                      {releaseNotes?.total_features_delivered || 0}
                    </span>
                    <span className="text-xs text-textMuted-light dark:text-textMuted-dark">User Stories</span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Status Done dengan verifikasi DoD
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
                    <span>Total Story Points</span>
                    <Zap className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-bold font-mono text-accent">
                      {releaseNotes?.total_points_delivered || 0}
                    </span>
                    <span className="text-xs text-textMuted-light dark:text-textMuted-dark font-mono">SP</span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Kapasitas riil yang berhasil dikirim
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
                    <span>Tingkat Kelulusan QA</span>
                    <ShieldCheck className="w-4 h-4 text-status-success" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-bold font-mono text-status-success">
                      {releaseNotes?.qa_certification_rate || 100}%
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Sentinel DoD Quality Gate Passed
                  </p>
                </div>

                <div className="p-3.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-1.5 shadow-xs">
                  <div className="flex items-center justify-between text-xs text-textMuted-light dark:text-textMuted-dark">
                    <span>Kesiapan Rilis</span>
                    <Rocket className="w-4 h-4 text-accent" />
                  </div>
                  <div className="flex items-baseline space-x-1.5">
                    <span className="text-xl font-bold text-status-success">
                      {releaseNotes && releaseNotes.total_features_delivered > 0 ? "Ready" : "In Progress"}
                    </span>
                  </div>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark">
                    Siap staging & produksi
                  </p>
                </div>
              </div>

              {/* Delivered Features List */}
              <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-3 shadow-xs">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark flex items-center space-x-1.5">
                    <ListTodo className="w-3.5 h-3.5 text-accent" />
                    <span>Daftar Fitur Tuntas dalam Rilis ({releaseNotes?.features.length || 0})</span>
                  </h4>
                  {project?.github_repo_url && (
                    <a
                      href={project.github_repo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center space-x-1 text-xs text-accent hover:underline font-mono"
                    >
                      <span>{project.github_repo_name || "GitHub Repo"}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {loadingRelease ? (
                  <div className="py-6 text-center text-xs text-textMuted-light dark:text-textMuted-dark">
                    Menyusun catatan rilis dan sertifikasi QA...
                  </div>
                ) : !releaseNotes || releaseNotes.features.length === 0 ? (
                  <div className="p-6 text-center text-xs text-textMuted-light dark:text-textMuted-dark italic">
                    Belum ada item task yang berstatus &apos;Done&apos; untuk dimasukkan ke release notes. Selesaikan task di Papan Scrum terlebih dahulu.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-borderBase-light dark:border-borderBase-dark text-[11px] text-textMuted-light dark:text-textMuted-dark">
                          <th className="py-2 px-3 font-semibold">ID</th>
                          <th className="py-2 px-3 font-semibold">Judul Task</th>
                          <th className="py-2 px-3 font-semibold">Tipe</th>
                          <th className="py-2 px-3 font-semibold">SP</th>
                          <th className="py-2 px-3 font-semibold">QA Gate</th>
                          <th className="py-2 px-3 font-semibold">Sprint</th>
                          <th className="py-2 px-3 font-semibold">Branch / PR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-borderBase-light/60 dark:divide-borderBase-dark/60 font-mono text-[11px]">
                        {releaseNotes.features.map((feat) => (
                          <tr key={feat.key} className="hover:bg-surfaceSecondary-light/30 dark:hover:bg-surfaceSecondary-dark/30">
                            <td className="py-2 px-3 font-bold text-accent">{feat.key}</td>
                            <td className="py-2 px-3 font-sans font-medium text-textPrimary-light dark:text-textPrimary-dark">
                              {feat.title}
                            </td>
                            <td className="py-2 px-3 uppercase text-[10px] text-textMuted-light dark:text-textMuted-dark">
                              {feat.type}
                            </td>
                            <td className="py-2 px-3 font-bold">{feat.estimate_points}</td>
                            <td className="py-2 px-3">
                              {feat.qa_status === "passed" ? (
                                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-status-success/15 text-status-success border border-status-success/30 font-semibold">
                                  <CheckCircle2 className="w-2.5 h-2.5" /> QA Pass
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-semibold">
                                  Review
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 font-sans text-textMuted-light dark:text-textMuted-dark">
                              {feat.sprint_name}
                            </td>
                            <td className="py-2 px-3">
                              {feat.pull_request_url ? (
                                <a
                                  href={feat.pull_request_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-accent hover:underline inline-flex items-center gap-1"
                                >
                                  <span>PR</span>
                                  <ExternalLink className="w-2.5 h-2.5" />
                                </a>
                              ) : (
                                <span className="text-textMuted-light dark:text-textMuted-dark font-sans text-[10px]">
                                  {feat.git_branch || "local-worktree"}
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Release Notes Markdown Preview */}
              {releaseNotes && (
                <div className="p-4 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark space-y-3 shadow-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileText className="w-4 h-4 text-accent" />
                      <span className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                        Dokumen RELEASE_NOTES.md (Pratinjau Markdown)
                      </span>
                    </div>

                    <button
                      onClick={handleCopyMarkdown}
                      className="flex items-center space-x-1 text-xs text-accent hover:underline font-mono"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>{copiedRelease ? "Disalin!" : "Salin Markdown"}</span>
                    </button>
                  </div>

                  <pre className="p-4 rounded-lg bg-canvas-light dark:bg-canvas-dark border border-borderBase-light/80 dark:border-borderBase-dark/80 text-[11px] font-mono text-textSecondary-light dark:text-textSecondary-dark overflow-x-auto whitespace-pre-wrap max-h-96 leading-relaxed">
                    {releaseNotes.markdown}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
