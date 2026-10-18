import React from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "./Button";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Failed to load data",
  message,
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border border-status-danger/20 rounded-md bg-status-danger/5 my-4">
      <div className="w-9 h-9 rounded-full bg-status-danger/10 flex items-center justify-center text-status-danger mb-2">
        <AlertTriangle className="w-4 h-4" />
      </div>
      <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark mb-1">
        {title}
      </h3>
      <p className="text-xs text-status-danger max-w-md font-mono mb-4 break-words">
        {message}
      </p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
        >
          Try Again
        </Button>
      )}
    </div>
  );
}
