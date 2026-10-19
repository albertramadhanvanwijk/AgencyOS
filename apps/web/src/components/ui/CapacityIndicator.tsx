import React from "react";

interface CapacityIndicatorProps {
  current: number;
  max: number;
  label?: string | null;
  showNumbers?: boolean;
  variant?: "table" | "card";
}

export function CapacityIndicator({
  current,
  max,
  label,
  showNumbers = true,
  variant = "card",
}: CapacityIndicatorProps) {
  const percentage = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;

  // Determine indicator color based on load
  const getBarColor = () => {
    if (percentage >= 100) return "bg-status-danger";
    if (percentage >= 75) return "bg-status-warning";
    if (percentage > 0) return "bg-accent";
    return "bg-borderBase-light dark:bg-borderBase-dark";
  };

  const getBadgeStyle = () => {
    if (percentage >= 100) return "bg-status-danger/10 text-status-danger border-status-danger/30 font-semibold";
    if (percentage >= 75) return "bg-status-warning/10 text-status-warning border-status-warning/30 font-semibold";
    if (percentage > 0) return "bg-accent/10 text-accent border-accent/30 font-semibold";
    return "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark border-borderBase-light dark:border-borderBase-dark font-normal";
  };

  if (variant === "table" || !label) {
    return (
      <div className="w-full max-w-[150px] space-y-1">
        <div className="flex items-center justify-between text-[11px] leading-tight">
          <span className="font-mono tabular-nums font-medium text-textPrimary-light dark:text-textPrimary-dark">
            {current} <span className="text-textMuted-light dark:text-textMuted-dark">/ {max} slot</span>
          </span>
          <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border ${getBadgeStyle()}`}>
            {percentage}%
          </span>
        </div>
        <div className="w-full h-1.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark rounded-full overflow-hidden border border-borderBase-light/60 dark:border-borderBase-dark/60">
          <div
            className={`h-full transition-all duration-300 rounded-full ${getBarColor()}`}
            style={{ width: `${Math.max(percentage, 0)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-xs">
        {label && <span className="text-textMuted-light dark:text-textMuted-dark font-medium">{label}</span>}
        {showNumbers && (
          <span className="font-mono tabular-nums text-textPrimary-light dark:text-textPrimary-dark">
            {current} / {max} <span className="text-textMuted-light dark:text-textMuted-dark">({percentage}%)</span>
          </span>
        )}
      </div>
      <div className="w-full h-1.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark rounded-full overflow-hidden border border-borderBase-light dark:border-borderBase-dark">
        <div
          className={`h-full transition-all duration-300 rounded-full ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
