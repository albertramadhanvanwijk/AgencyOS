import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb" className="flex items-center space-x-1.5 text-xs text-textMuted-light dark:text-textMuted-dark">
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            {index > 0 && <ChevronRight className="w-3 h-3 text-borderBase-light dark:text-borderBase-dark flex-shrink-0" />}
            {item.href && !isLast ? (
              <Link
                href={item.href}
                className="hover:text-textPrimary-light dark:hover:text-textPrimary-dark transition-colors"
              >
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? "font-medium text-textPrimary-light dark:text-textPrimary-dark" : ""}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
