import React from "react";

interface CapacityIndicatorProps {
  current: number;
  max: number;
  label?: string;
  showNumbers?: boolean;
}

export function CapacityIndicator({
  current,
  max,
  label = "Capacity",
  showNumbers = true,
}: CapacityIndicatorProps) {
  const percentage = max > 0 ? Math.min(Math.round((current / max) * 100), 100) : 0;

  // Determine indicator color based on load
  const getBarColor = () => {
    if (percentage >= 100) return "bg-status-danger";
    if (percentage >= 75) return "bg-status-warning";
    return "bg-accent";
  };

  return (
    <div className="w-full space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-textMuted-light dark:text-textMuted-dark">{label}</span>
        {showNumbers && (
          <span className="font-mono tabular-nums text-textPrimary-light dark:text-textPrimary-dark">
            {current} / {max} ({percentage}%)
          </span>
        )}
      </div>
      <div className="w-full h-1.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark rounded-full overflow-hidden border border-borderBase-light dark:border-borderBase-dark">
        <div
          className={`h-full transition-all duration-300 ${getBarColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
