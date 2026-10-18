"use client";

import React, { useEffect, useState, useCallback } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { TableSkeleton } from "../../components/ui/LoadingSkeleton";
import { EmptyState } from "../../components/ui/EmptyState";
import { History, Shield, RotateCcw, Search, ChevronDown, ChevronRight, Filter } from "lucide-react";

interface AuditEvent {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target_type: string;
  target_id: string;
  project_id?: string;
  policy_basis?: string;
  details: Record<string, any>;
}

export default function AuditPage() {
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [targetTypeFilter, setTargetTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

  const fetchAuditEvents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("http://127.0.0.1:8000/api/v1/audit-events?limit=100");
      if (!res.ok) throw new Error("Failed to load audit provenance trail.");
      const data = await res.json();
      setEvents(data);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAuditEvents();
  }, [fetchAuditEvents]);

  const filteredEvents = events.filter((e) => {
    const matchesType = targetTypeFilter === "ALL" || e.target_type === targetTypeFilter;
    const matchesSearch =
      !searchQuery ||
      e.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.actor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.target_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <AppShell>
      <PageHeader
        title="Activity & Audit Provenance"
        description="Immutable, chronological record of consequential state transitions, policy decisions, and execution runs."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Audit" },
        ]}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={fetchAuditEvents}
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>
        }
      />

      <div className="space-y-3">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 p-3 rounded-md bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-textMuted-light dark:text-textMuted-dark" />
              <input
                type="text"
                placeholder="Search action, actor, target..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 pl-8 pr-3 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs focus:outline-none focus:ring-1 focus:ring-accent w-64"
              />
            </div>
            <div className="flex items-center space-x-1">
              <Filter className="w-3 h-3 text-textMuted-light dark:text-textMuted-dark" />
              <select
                value={targetTypeFilter}
                onChange={(e) => setTargetTypeFilter(e.target.value)}
                className="h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-xs focus:outline-none focus:ring-1 focus:ring-accent"
              >
                <option value="ALL">All Target Types</option>
                <option value="WORK_ITEM">Work Items</option>
                <option value="EXECUTION_RUN">Execution Runs</option>
                <option value="PROJECT">Projects</option>
                <option value="ORGANIZATION">Organization</option>
                <option value="AGENT">Agents</option>
              </select>
            </div>
          </div>

          <span className="text-xs font-mono text-textMuted-light dark:text-textMuted-dark">
            Showing {filteredEvents.length} of {events.length} recorded events
          </span>
        </div>

        {/* Audit Log Table */}
        <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark overflow-hidden shadow-xs">
          <div className="px-4 py-3 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/30">
            <div className="flex items-center space-x-2">
              <History className="w-4 h-4 text-accent" />
              <h2 className="text-sm font-semibold">Provenance Trail</h2>
            </div>
            <span className="text-xs font-mono text-status-success font-medium flex items-center space-x-1">
              <span className="w-2 h-2 rounded-full bg-status-success inline-block animate-pulse" />
              <span>Immutable Ledger Active</span>
            </span>
          </div>

          {loading ? (
            <TableSkeleton rows={5} />
          ) : filteredEvents.length === 0 ? (
            <EmptyState
              title="No Audit Events Found"
              description="No audit events match the selected criteria."
              icon={<History className="w-8 h-8" />}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-b border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
                  <tr>
                    <th className="py-2.5 px-3 w-8"></th>
                    <th className="py-2.5 px-3 font-mono">Event ID</th>
                    <th className="py-2.5 px-3">Timestamp (UTC)</th>
                    <th className="py-2.5 px-3">Actor</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Target Scope</th>
                    <th className="py-2.5 px-3">Policy Basis</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderBase-light dark:divide-borderBase-dark font-mono text-[11px]">
                  {filteredEvents.map((e) => {
                    const isExpanded = expandedEventId === e.id;
                    return (
                      <React.Fragment key={e.id}>
                        <tr
                          onClick={() => setExpandedEventId(isExpanded ? null : e.id)}
                          className="hover:bg-surfaceSecondary-light/50 dark:hover:bg-surfaceSecondary-dark/50 cursor-pointer transition-colors"
                        >
                          <td className="py-3 px-3 text-textMuted-light dark:text-textMuted-dark">
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-accent" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </td>
                          <td className="py-3 px-3 font-semibold text-accent">{e.id.slice(0, 8)}</td>
                          <td className="py-3 px-3 text-textMuted-light dark:text-textMuted-dark">
                            {new Date(e.timestamp).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 font-sans font-medium text-textPrimary-light dark:text-textPrimary-dark">
                            {e.actor}
                          </td>
                          <td className="py-3 px-3 text-textPrimary-light dark:text-textPrimary-dark font-semibold">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] ${
                                e.action.includes("APPROVED")
                                  ? "bg-status-success/15 text-status-success border border-status-success/30"
                                  : e.action.includes("REWORK")
                                  ? "bg-status-warning/15 text-status-warning border border-status-warning/30"
                                  : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textPrimary-light dark:text-textPrimary-dark border border-borderBase-light dark:border-borderBase-dark"
                              }`}
                            >
                              {e.action}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-textMuted-light dark:text-textMuted-dark">
                            <span className="font-sans font-semibold text-[10px] uppercase text-accent">
                              {e.target_type}:{" "}
                            </span>
                            <span>{e.target_id.slice(0, 16)}</span>
                          </td>
                          <td className="py-3 px-3 text-textMuted-light dark:text-textMuted-dark">
                            {e.policy_basis || "SYSTEM_DEFAULT"}
                          </td>
                        </tr>

                        {/* Expandable JSON Details Drawer */}
                        {isExpanded && (
                          <tr className="bg-surfaceSecondary-light/30 dark:bg-surfaceSecondary-dark/30">
                            <td colSpan={7} className="p-3 pl-10 border-b border-borderBase-light dark:border-borderBase-dark">
                              <div className="space-y-1">
                                <span className="font-sans font-semibold text-xs text-textPrimary-light dark:text-textPrimary-dark block">
                                  Redacted Event Payload & Context:
                                </span>
                                <div className="p-3 rounded bg-black/95 text-neutral-200 border border-neutral-800 font-mono text-[11px] overflow-x-auto">
                                  <pre className="whitespace-pre-wrap">{JSON.stringify(e.details, null, 2)}</pre>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
