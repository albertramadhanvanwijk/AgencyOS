import React from "react";

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className = "" }: SkeletonProps) {
  return (
    <div
      className={`animate-pulse bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark rounded ${className}`}
    />
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="w-full border border-borderBase-light dark:border-borderBase-dark rounded-md overflow-hidden bg-surface-light dark:bg-surface-dark">
      <div className="h-9 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-b border-borderBase-light dark:border-borderBase-dark px-4 flex items-center space-x-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16 ml-auto" />
      </div>
      <div className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-11 px-4 flex items-center space-x-4">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-4 w-12 ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}
