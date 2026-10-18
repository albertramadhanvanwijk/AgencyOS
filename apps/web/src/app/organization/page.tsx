"use client";

import React from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { Building2, Plus, Shield } from "lucide-react";

export default function OrganizationPage() {
  const departments = [
    { name: "Engineering", roles: 6, agents: 2, desc: "Architecture, Frontend, Backend, API & Full-Stack" },
    { name: "Product & Research", roles: 4, agents: 1, desc: "Product Ownership, Requirements, Technical Writing" },
    { name: "Quality Assurance", roles: 3, agents: 1, desc: "Quality Gates, Test Automation, Code Review" },
    { name: "Design System", roles: 3, agents: 0, desc: "UI/UX Architecture, Tokens, Accessibility" },
  ];

  return (
    <AppShell>
      <PageHeader
        title="Organization & Role Catalog"
        description="Department structures, standardized job role definitions, skills templates, and permission boundaries."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Organization" },
        ]}
        actions={
          <Button size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Propose Job Role
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {departments.map((dept) => (
          <div key={dept.name} className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-accent" />
                <h2 className="text-sm font-semibold">{dept.name}</h2>
              </div>
              <StatusBadge variant="neutral" label={`${dept.roles} Roles`} />
            </div>
            <p className="text-xs text-textMuted-light dark:text-textMuted-dark">{dept.desc}</p>
            <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-between text-xs">
              <span className="text-textMuted-light dark:text-textMuted-dark font-mono">{dept.agents} Active Agents</span>
              <Button variant="ghost" size="sm">
                View Roles
              </Button>
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
