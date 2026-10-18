import React from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "./Button";

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: React.ReactNode;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark my-4">
      <div className="w-10 h-10 rounded-full bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark flex items-center justify-center text-textMuted-light dark:text-textMuted-dark mb-3">
        {icon || <FolderOpen className="w-5 h-5" />}
      </div>
      <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark mb-1">
        {title}
      </h3>
      <p className="text-xs text-textMuted-light dark:text-textMuted-dark max-w-sm mb-4">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
