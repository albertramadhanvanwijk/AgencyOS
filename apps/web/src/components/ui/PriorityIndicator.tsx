import React from "react";
import { ArrowUp, ArrowDown, Minus, Flame } from "lucide-react";

export type PriorityLevel = "critical" | "high" | "medium" | "low";

interface PriorityIndicatorProps {
  level: PriorityLevel;
  showLabel?: boolean;
}

export function PriorityIndicator({
  level,
  showLabel = true,
}: PriorityIndicatorProps) {
  const getIconAndColor = () => {
    switch (level) {
      case "critical":
        return {
          icon: <Flame className="w-3.5 h-3.5 text-status-danger" />,
          label: "Critical",
          color: "text-status-danger",
        };
      case "high":
        return {
          icon: <ArrowUp className="w-3.5 h-3.5 text-status-warning" />,
          label: "High",
          color: "text-status-warning",
        };
      case "medium":
        return {
          icon: <Minus className="w-3.5 h-3.5 text-status-info" />,
          label: "Medium",
          color: "text-status-info",
        };
      case "low":
      default:
        return {
          icon: <ArrowDown className="w-3.5 h-3.5 text-textMuted-light dark:text-textMuted-dark" />,
          label: "Low",
          color: "text-textMuted-light dark:text-textMuted-dark",
        };
    }
  };

  const { icon, label, color } = getIconAndColor();

  return (
    <div className="inline-flex items-center space-x-1 text-xs">
      {icon}
      {showLabel && <span className={`font-medium ${color}`}>{label}</span>}
    </div>
  );
}
