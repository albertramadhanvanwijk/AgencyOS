import React from "react";
import { CheckCircle2, AlertCircle, Clock, ShieldAlert, Cpu, Circle } from "lucide-react";

export type StatusVariant =
  | "success"
  | "warning"
  | "danger"
  | "info"
  | "neutral"
  | "simulated";

interface StatusBadgeProps {
  variant: StatusVariant;
  label: string;
  size?: "sm" | "md";
  showIcon?: boolean;
}

export function StatusBadge({
  variant,
  label,
  size = "sm",
  showIcon = true,
}: StatusBadgeProps) {
  const getStyles = () => {
    switch (variant) {
      case "success":
        return "bg-[#16794B]/10 text-status-success border-[#16794B]/20 dark:bg-[#209961]/15 dark:text-[#209961] dark:border-[#209961]/30";
      case "warning":
        return "bg-[#9A6700]/10 text-status-warning border-[#9A6700]/20 dark:bg-[#C78B14]/15 dark:text-[#C78B14] dark:border-[#C78B14]/30";
      case "danger":
        return "bg-[#C23934]/10 text-status-danger border-[#C23934]/20 dark:bg-[#D94843]/15 dark:text-[#D94843] dark:border-[#D94843]/30";
      case "info":
        return "bg-[#2563A6]/10 text-status-info border-[#2563A6]/20 dark:bg-[#3E7DC2]/15 dark:text-[#3E7DC2] dark:border-[#3E7DC2]/30";
      case "simulated":
        return "bg-accent/10 text-accent border-accent/30 dark:bg-accent/20 dark:text-[#A5B0F5] dark:border-accent/40 font-mono";
      case "neutral":
      default:
        return "bg-surfaceSecondary-light text-textMuted-light border-borderBase-light dark:bg-surfaceSecondary-dark dark:text-textMuted-dark dark:border-borderBase-dark";
    }
  };

  const renderIcon = () => {
    if (!showIcon) return null;
    const iconSize = size === "sm" ? "w-3 h-3" : "w-3.5 h-3.5";

    switch (variant) {
      case "success":
        return <CheckCircle2 className={`${iconSize} mr-1`} />;
      case "warning":
        return <AlertCircle className={`${iconSize} mr-1`} />;
      case "danger":
        return <ShieldAlert className={`${iconSize} mr-1`} />;
      case "info":
        return <Clock className={`${iconSize} mr-1`} />;
      case "simulated":
        return <Cpu className={`${iconSize} mr-1`} />;
      case "neutral":
      default:
        return <Circle className={`${iconSize} mr-1 fill-current opacity-60`} />;
    }
  };

  const sizeClasses = size === "sm" ? "text-[11px] px-2 py-0.5" : "text-xs px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${getStyles()} ${sizeClasses}`}
    >
      {renderIcon()}
      <span>{label}</span>
    </span>
  );
}
