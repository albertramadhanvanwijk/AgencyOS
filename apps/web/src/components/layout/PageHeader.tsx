import React from "react";
import { Breadcrumbs, BreadcrumbItem } from "./Breadcrumbs";

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
}

export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  badge,
}: PageHeaderProps) {
  return (
    <div className="space-y-2 pb-5 border-b border-borderBase-light dark:border-borderBase-dark">
      {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center space-x-2.5">
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-textPrimary-light dark:text-textPrimary-dark">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-textMuted-light dark:text-textMuted-dark max-w-3xl">
              {description}
            </p>
          )}
        </div>
        {actions && (
          <div className="flex items-center space-x-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>
    </div>
  );
}
