"use client";

import React, { useEffect, useState } from "react";
import { AppShell } from "../../components/layout/AppShell";
import { PageHeader } from "../../components/layout/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Button } from "../../components/ui/Button";
import { TableSkeleton } from "../../components/ui/LoadingSkeleton";
import { ErrorState } from "../../components/ui/ErrorState";
import {
  Building2,
  Plus,
  ShieldAlert,
  CheckCircle2,
  X,
  Briefcase,
  Users,
} from "lucide-react";

interface Department {
  id: string;
  name: string;
  code: string;
  description?: string;
  roles_count: number;
  agents_count: number;
}

interface JobRole {
  id: string;
  name: string;
  code: string;
  department_id: string;
  department_name?: string;
  description?: string;
  responsibilities: string[];
  skills: string[];
  capability_categories: string[];
  qualification_criteria: string[];
  is_official: boolean;
  version: number;
  agents_count: number;
}

export default function OrganizationPage() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<JobRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Propose Role Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [roleName, setRoleName] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [roleDeptId, setRoleDeptId] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [roleSkills, setRoleSkills] = useState("");
  const [roleResp, setRoleResp] = useState("");

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [deptsRes, rolesRes] = await Promise.all([
        fetch("http://127.0.0.1:8000/api/v1/organization/departments"),
        fetch("http://127.0.0.1:8000/api/v1/organization/roles"),
      ]);

      if (!deptsRes.ok || !rolesRes.ok) {
        throw new Error("Failed to load organization data.");
      }

      const deptsData = await deptsRes.json();
      const rolesData = await rolesRes.json();

      setDepartments(deptsData);
      setRoles(rolesData);
      if (deptsData.length > 0) setRoleDeptId(deptsData[0].id);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unknown error occurred.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProposeRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim() || !roleCode.trim() || !roleDeptId) return;

    try {
      setSubmitting(true);
      setModalError(null);
      const skillsArray = roleSkills
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const respArray = roleResp
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const payload = {
        name: roleName.trim(),
        code: roleCode.trim().toUpperCase(),
        department_id: roleDeptId,
        description: roleDesc.trim() || undefined,
        skills: skillsArray,
        responsibilities: respArray,
        capability_categories: ["general"],
        qualification_criteria: ["Role qualification verification"],
        is_official: true,
      };

      const res = await fetch("http://127.0.0.1:8000/api/v1/organization/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Failed to create role");
      }

      setIsModalOpen(false);
      setRoleName("");
      setRoleCode("");
      setRoleDesc("");
      setRoleSkills("");
      setRoleResp("");
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setModalError(err.message);
      } else {
        setModalError("Failed to create role");
      }
    } finally {
      setSubmitting(false);
    }
  };

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
          <Button size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            Propose Job Role
          </Button>
        }
      />

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <div className="space-y-6">
          {/* Departments Overview Grid */}
          <div>
            <h2 className="text-sm font-semibold mb-3 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-accent" />
              <span>Agency Departments ({departments.length})</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-accent/10 text-accent font-semibold">
                      {dept.code}
                    </span>
                    <span className="text-xs font-mono text-textMuted-light dark:text-textMuted-dark">
                      {dept.roles_count} Roles
                    </span>
                  </div>
                  <h3 className="text-sm font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                    {dept.name}
                  </h3>
                  <p className="text-[11px] text-textMuted-light dark:text-textMuted-dark line-clamp-2">
                    {dept.description || "No description provided."}
                  </p>
                  <div className="pt-2 border-t border-borderBase-light dark:border-borderBase-dark text-xs flex items-center justify-between">
                    <span className="text-textMuted-light dark:text-textMuted-dark font-mono text-[11px]">
                      {dept.agents_count} Agents assigned
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Job Roles Directory */}
          <div className="border border-borderBase-light dark:border-borderBase-dark rounded-md bg-surface-light dark:bg-surface-dark overflow-hidden">
            <div className="px-4 py-3 border-b border-borderBase-light dark:border-borderBase-dark flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-semibold">Standard Role Catalog ({roles.length})</h3>
              </div>
              <span className="text-xs text-textMuted-light dark:text-textMuted-dark">
                Templates from docs/AI_WORKFORCE_AND_RECRUITMENT.md
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-b border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
                  <tr>
                    <th className="py-2.5 px-4 font-mono">Role Code</th>
                    <th className="py-2.5 px-4">Role Title</th>
                    <th className="py-2.5 px-4">Department</th>
                    <th className="py-2.5 px-4">Required Skills</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4 text-right">Agents</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
                  {roles.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-surfaceSecondary-light/50 dark:hover:bg-surfaceSecondary-dark/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-accent text-[11px]">
                        {r.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                          {r.name}
                        </div>
                        <div className="text-[11px] text-textMuted-light dark:text-textMuted-dark max-w-md truncate">
                          {r.description}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-textMuted-light dark:text-textMuted-dark">
                        {r.department_name}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {r.skills.slice(0, 3).map((s, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark"
                            >
                              {s}
                            </span>
                          ))}
                          {r.skills.length > 3 && (
                            <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark font-mono">
                              +{r.skills.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          variant={r.is_official ? "success" : "warning"}
                          label={r.is_official ? "Official" : "Proposed"}
                        />
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-[11px]">
                        {r.agents_count} Active
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Propose Role Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={handleProposeRole}
            className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-lg max-w-md w-full p-5 space-y-4 shadow-xl"
          >
            <div className="flex items-start justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <div>
                <h2 className="text-base font-semibold">Propose New Job Role</h2>
                <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                  Registers new role definition with required skills & criteria.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalError && (
              <div className="p-2 rounded bg-status-danger/10 border border-status-danger/30 text-status-danger text-xs">
                {modalError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-medium block mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Security Architect"
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>

                <div>
                  <label className="font-medium block mb-1">Role Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SEC_ARCH"
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="font-medium block mb-1">Department *</label>
                <select
                  value={roleDeptId}
                  onChange={(e) => setRoleDeptId(e.target.value)}
                  className="w-full h-8 px-2 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium block mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Primary objective and scope of this role..."
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">Required Skills (comma-separated)</label>
                <input
                  type="text"
                  placeholder="AppSec, Threat Modeling, Cryptography"
                  value={roleSkills}
                  onChange={(e) => setRoleSkills(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="font-medium block mb-1">Key Responsibilities (comma-separated)</label>
                <input
                  type="text"
                  placeholder="Review code for vulnerabilities, Run static analysis"
                  value={roleResp}
                  onChange={(e) => setRoleResp(e.target.value)}
                  className="w-full h-8 px-2.5 bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark rounded text-textPrimary-light dark:text-textPrimary-dark focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" isLoading={submitting}>
                Save Job Role
              </Button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
