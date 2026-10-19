"use client";

import React, { useEffect, useState } from "react";
import { Search, Sun, Moon, CheckCircle2, AlertCircle, Shield, User, Crown } from "lucide-react";
import { useTheme } from "../theme/ThemeProvider";

export function Topbar() {
  const { theme, toggleTheme } = useTheme();
  const [apiOnline, setApiOnline] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkApi() {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/v1/health");
        setApiOnline(res.ok);
      } catch {
        setApiOnline(false);
      }
    }
    checkApi();
    const interval = setInterval(checkApi, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-12 border-b border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark px-4 flex items-center justify-between sticky top-0 z-20">
      {/* Search Input / Command Trigger */}
      <div className="flex items-center space-x-3 w-72">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects, items, agents..."
            className="w-full h-7 pl-8 pr-3 text-xs bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark placeholder:text-textMuted-light dark:placeholder:text-textMuted-dark focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Backend Connectivity Status */}
        <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded border border-borderBase-light dark:border-borderBase-dark text-[11px] font-mono">
          {apiOnline === null ? (
            <span className="text-textMuted-light dark:text-textMuted-dark flex items-center">
              <span className="animate-spin mr-1">◓</span> Checking
            </span>
          ) : apiOnline ? (
            <span className="text-status-success flex items-center">
              <CheckCircle2 className="w-3 h-3 mr-1" /> API 8000
            </span>
          ) : (
            <span className="text-status-danger flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" /> API Offline
            </span>
          )}
        </div>

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          aria-label="Toggle color theme"
          className="p-1.5 rounded border border-borderBase-light dark:border-borderBase-dark hover:bg-surfaceSecondary-light dark:hover:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark transition-colors"
        >
          {theme === "dark" ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
        </button>

        {/* Current Operator Context: Agency Owner */}
        <div className="flex items-center space-x-2 pl-2 border-l border-borderBase-light dark:border-borderBase-dark">
          <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-xs font-semibold">
            <Crown className="w-3.5 h-3.5" />
          </div>
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-textPrimary-light dark:text-textPrimary-dark leading-tight flex items-center gap-1">
              <span>Agency Owner</span>
            </span>
            <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark leading-tight">
              Managing Director
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
