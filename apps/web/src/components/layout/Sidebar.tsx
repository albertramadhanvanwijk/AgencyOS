"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FolderKanban,
  Users,
  UserPlus,
  Building2,
  CheckSquare,
  History,
  Settings,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({ collapsed = false, onToggleCollapse }: SidebarProps) {
  const pathname = usePathname();
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchApprovalsCount = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/recruitment/requests");
        if (res.ok && isMounted) {
          const data = await res.json();
          const count = data.filter(
            (r: any) => r.status === "qualified" || r.status === "pending_approval"
          ).length;
          setPendingApprovalsCount(count);
        }
      } catch {
        // Blip recovery
      }
    };

    fetchApprovalsCount();
    const interval = setInterval(fetchApprovalsCount, 8000);

    const handleFocus = () => fetchApprovalsCount();
    window.addEventListener("focus", handleFocus);
    window.addEventListener("approvals-updated", handleFocus);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("approvals-updated", handleFocus);
    };
  }, []);

  const navigationItems = [
    { label: "Overview", href: "/", icon: LayoutDashboard },
    { label: "Projects", href: "/projects", icon: FolderKanban },
    { label: "Workforce", href: "/workforce", icon: Users },
    { label: "Recruitment", href: "/recruitment", icon: UserPlus },
    { label: "Organization", href: "/organization", icon: Building2 },
    {
      label: "Approvals",
      href: "/approvals",
      icon: CheckSquare,
      badge: pendingApprovalsCount !== null && pendingApprovalsCount > 0 ? String(pendingApprovalsCount) : undefined,
      isAlert: pendingApprovalsCount !== null && pendingApprovalsCount > 0,
    },
    { label: "Audit & Activity", href: "/audit", icon: History },
    { label: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col border-r border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark transition-all duration-200 z-30 select-none ${
        collapsed ? "w-16" : "w-60"
      }`}
    >
      {/* Brand Header */}
      <div className="h-12 border-b border-borderBase-light dark:border-borderBase-dark px-3.5 flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2.5 overflow-hidden">
          <span className="w-2.5 h-2.5 rounded-full bg-accent flex-shrink-0" />
          {!collapsed && (
            <div className="flex items-baseline space-x-1.5 overflow-hidden">
              <span className="font-semibold text-sm tracking-tight text-textPrimary-light dark:text-textPrimary-dark truncate">
                AgencyOS
              </span>
              <span className="text-[10px] font-mono text-textMuted-light dark:text-textMuted-dark">
                alpha
              </span>
            </div>
          )}
        </Link>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark transition-colors"
          >
            {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        <div className="px-2 mb-1.5">
          {!collapsed && (
            <span className="text-[10px] font-semibold uppercase tracking-wider text-textMuted-light dark:text-textMuted-dark">
              Operations Control
            </span>
          )}
        </div>
        {navigationItems.map((item) => {
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);

          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={`flex items-center px-2.5 py-1.5 text-xs font-medium rounded transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent ${
                isActive
                  ? "bg-accent/10 text-accent font-semibold dark:bg-accent/15 dark:text-[#A5B0F5]"
                  : "text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark"
              }`}
            >
              <div className="relative flex items-center">
                <Icon className="w-4 h-4 flex-shrink-0" />
                {collapsed && item.isAlert && (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-status-warning" />
                )}
              </div>
              {!collapsed && (
                <span className="ml-2.5 flex-1 truncate">{item.label}</span>
              )}
              {!collapsed && item.badge && (
                <span
                  className={`ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                    item.isAlert
                      ? "bg-status-warning/15 text-status-warning border border-status-warning/30 dark:bg-status-warning/20"
                      : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Operator Safety Footer */}
      <div className="p-3 border-t border-borderBase-light dark:border-borderBase-dark">
        <div
          className={`flex items-center rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark p-2 border border-borderBase-light dark:border-borderBase-dark ${
            collapsed ? "justify-center" : "space-x-2"
          }`}
        >
          <div className="w-2 h-2 rounded-full bg-status-success flex-shrink-0" />
          {!collapsed && (
            <div className="flex flex-col text-[11px] leading-tight overflow-hidden">
              <span className="font-medium text-textPrimary-light dark:text-textPrimary-dark truncate">
                Supervised Mode
              </span>
              <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark truncate">
                Human Approvals Enforced
              </span>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
