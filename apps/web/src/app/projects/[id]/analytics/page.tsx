"use client";

import React, { useEffect, useState, useCallback, use } from "react";
import Link from "next/link";
import { AppShell } from "../../../../components/layout/AppShell";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { StatusBadge, StatusVariant } from "../../../../components/ui/StatusBadge";
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
  Calendar,
  Users,
  Zap,
  ListTodo,
  Kanban,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
  Check,
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
}

interface Project {
  id: string;
  name: string;
  key: string;
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

  useEffect(() => {
    if (initialSprintParam && initialSprintParam !== selectedSprintId) {
      setSelectedSprintId(initialSprintParam);
      fetchAnalyticsData(initialSprintParam);
    }
  }, [initialSprintParam]);

  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

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
        description="Grafik Burndown riil vs target ideal, metrik Team Velocity, dan laporan pencapaian Scrum."
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
              onClick={() => fetchAnalyticsData()}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
          </div>
        }
      />

      {/* Navigation Tabs: Backlog, Board, Analytics */}
      <div className="flex items-center space-x-2 border-b border-borderBase-light dark:border-borderBase-dark pb-3">
        <Link
          href={`/projects/${projectId}/backlog`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors"
        >
          <ListTodo className="w-4 h-4" />
          <span>Backlog & Sprint Planning</span>
        </Link>
        <Link
          href={`/projects/${projectId}/board`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-medium text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors"
        >
          <Kanban className="w-4 h-4" />
          <span>Papan Scrum (Board)</span>
        </Link>
        <Link
          href={`/projects/${projectId}/analytics`}
          className="flex items-center space-x-2 px-3 py-1.5 rounded-md text-xs font-semibold bg-accent/10 text-accent border border-accent/20 transition-colors"
        >
          <BarChart2 className="w-4 h-4" />
          <span>Analitik & Laporan Sprint</span>
        </Link>
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
          {/* SPRINT SELECTOR & SUMMARY HEADER */}
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
                        className="text-borderBase-light dark:text-borderBase-dark opacity-40"
                        strokeDasharray="2,2"
                      />
                      <text
                        x={padding.left - 8}
                        y={y + 4}
                        textAnchor="end"
                        className="text-[10px] fill-textMuted-light dark:fill-textMuted-dark font-mono"
                      >
                        {val} SP
                      </text>
                    </g>
                  );
                })}

                {/* X-axis Days & Date Labels */}
                {burndown.days.map((d) => {
                  const x = getX(d.day, burndown.total_days);
                  // Render every Nth label to prevent cluttering
                  const shouldShow =
                    burndown.total_days <= 10 ||
                    d.day === 0 ||
                    d.day === burndown.total_days ||
                    d.day % Math.ceil(burndown.total_days / 6) === 0;

                  return (
                    <g key={d.day}>
                      {shouldShow && (
                        <>
                          <line
                            x1={x}
                            y1={padding.top}
                            x2={x}
                            y2={chartHeight - padding.bottom}
                            stroke="currentColor"
                            className="text-borderBase-light dark:text-borderBase-dark opacity-30"
                            strokeDasharray="2,2"
                          />
                          <text
                            x={x}
                            y={chartHeight - padding.bottom + 16}
                            textAnchor="middle"
                            className="text-[10px] fill-textMuted-light dark:fill-textMuted-dark font-mono"
                          >
                            H-{d.day}
                          </text>
                        </>
                      )}
                    </g>
                  );
                })}

                {/* IDEAL LINE (Gray dashed) */}
                {(() => {
                  const p1 = `${getX(0, burndown.total_days)},${getY(burndown.total_points)}`;
                  const p2 = `${getX(burndown.total_days, burndown.total_days)},${getY(0)}`;
                  return (
                    <line
                      x1={getX(0, burndown.total_days)}
                      y1={getY(burndown.total_points)}
                      x2={getX(burndown.total_days, burndown.total_days)}
                      y2={getY(0)}
                      stroke="#8E95A2"
                      strokeWidth="2"
                      strokeDasharray="4,4"
                    />
                  );
                })()}

                {/* ACTUAL LINE (Solid Blue with Points) */}
                {(() => {
                  const validDays = burndown.days.filter((d) => d.actual_remaining !== null);
                  if (validDays.length === 0) return null;

                  const pointsString = validDays
                    .map((d) => `${getX(d.day, burndown.total_days)},${getY(d.actual_remaining!)}`)
                    .join(" ");

                  // Area path under actual line
                  const firstX = getX(validDays[0].day, burndown.total_days);
                  const lastX = getX(validDays[validDays.length - 1].day, burndown.total_days);
                  const bottomY = getY(0);
                  const areaPath = `M ${firstX},${bottomY} L ${pointsString} L ${lastX},${bottomY} Z`;

                  return (
                    <g>
                      {/* Gradient Fill under actual curve */}
                      <path d={areaPath} fill="currentColor" className="text-accent/10" />

                      {/* Main Actual Line */}
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
        </div>
      )}
    </AppShell>
  );
}
