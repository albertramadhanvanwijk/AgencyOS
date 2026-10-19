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
  ShieldCheck,
  CheckCircle2,
  X,
  Briefcase,
  Users,
  Crown,
  Sparkles,
  ArrowRight,
  RotateCcw,
  Layers,
  Code2,
  ShieldAlert,
  Check,
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

  // Sync Agency Structure State
  const [syncingStructure, setSyncingStructure] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState<string | null>(null);

  // Filter department state
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>("all");

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
        throw new Error("Gagal memuat data struktur organisasi.");
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
        setError("Terjadi kesalahan saat memuat data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSyncEnterpriseStructure = async () => {
    try {
      setSyncingStructure(true);
      setSyncSuccess(null);
      const res = await fetch("http://127.0.0.1:8000/api/v1/organization/sync-agency-structure", {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Gagal mensinkronkan struktur agency.");
      }
      const data = await res.json();
      setSyncSuccess(data.message || "Struktur organisasi agency berhasil disinkronkan.");
      await fetchData();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Gagal sinkronisasi.");
    } finally {
      setSyncingStructure(false);
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
      };

      const res = await fetch("http://127.0.0.1:8000/api/v1/organization/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.detail || "Gagal mengusulkan jabatan baru.");
      }

      setIsModalOpen(false);
      setRoleName("");
      setRoleCode("");
      setRoleDesc("");
      setRoleSkills("");
      setRoleResp("");
      await fetchData();
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Gagal mengajukan jabatan.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredRoles =
    selectedDeptFilter === "all"
      ? roles
      : roles.filter((r) => r.department_id === selectedDeptFilter);

  return (
    <AppShell>
      <PageHeader
        title="Struktur Organisasi & Katalog Jabatan Agency"
        description="Peta hierarki divisi perusahaan digital agency, jabatan spesialis standar, batas otorisasi, dan matriks kompetensi agen."
        breadcrumbs={[
          { label: "Overview", href: "/" },
          { label: "Organization" },
        ]}
        actions={
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncEnterpriseStructure}
              isLoading={syncingStructure}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Sinkronkan Struktur
            </Button>
            <Button
              size="sm"
              onClick={() => setIsModalOpen(true)}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
            >
              Tambah Jabatan Baru
            </Button>
          </div>
        }
      />

      {syncSuccess && (
        <div className="p-3 rounded-lg bg-status-success/10 border border-status-success/20 text-status-success text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{syncSuccess}</span>
          </div>
          <button onClick={() => setSyncSuccess(null)} className="font-semibold underline text-[11px]">
            Tutup
          </button>
        </div>
      )}

      {loading ? (
        <TableSkeleton rows={4} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <div className="space-y-6">
          {/* 1. EXECUTIVE LEADERSHIP APEX CARD (OWNER & MANAGING DIRECTOR) */}
          <div className="p-4 sm:p-5 rounded-xl border border-indigo-500/30 bg-gradient-to-r from-indigo-500/10 via-purple-500/5 to-transparent shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <Crown className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-base font-bold text-textPrimary-light dark:text-textPrimary-dark">
                      ANDA (Owner & Managing Director)
                    </h2>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30">
                      Supreme Decision Maker
                    </span>
                  </div>
                  <p className="text-xs text-textMuted-light dark:text-textMuted-dark">
                    Pemegang otoritas tertinggi, penentu visi bisnis agency, dan pemegang hak tanda tangan persetujuan gerbang SDLC (*Gated Approvals*).
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 text-xs">
                <div className="px-2.5 py-1.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textSecondary-light dark:text-textSecondary-dark flex items-center space-x-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-status-success" />
                  <span>3 Direktorat Aktif</span>
                </div>
                <div className="px-2.5 py-1.5 rounded-lg bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark text-textSecondary-light dark:text-textSecondary-dark flex items-center space-x-1.5">
                  <Users className="w-3.5 h-3.5 text-accent" />
                  <span>{roles.length} Jabatan Spesialis</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 border-t border-borderBase-light/40 dark:border-borderBase-dark/40 text-xs">
              <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Sign-off PRD & Scope (Gerbang Tahap 1)</span>
              </div>
              <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Persetujuan Memulai Sprint (Gerbang Tahap 3)</span>
              </div>
              <div className="flex items-center space-x-2 text-textMuted-light dark:text-textMuted-dark">
                <span className="w-2 h-2 rounded-full bg-indigo-500" />
                <span>Pengesahan Rilis ke Produksi (Gerbang Tahap 5)</span>
              </div>
            </div>
          </div>

          {/* 2. PRIMARY DIRECTORATES & DEPARTMENTS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-accent" />
                <span>Direktorat & Divisi Utama Agency ({departments.length})</span>
              </h3>
              <div className="flex items-center space-x-1.5 text-xs">
                <button
                  onClick={() => setSelectedDeptFilter("all")}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    selectedDeptFilter === "all"
                      ? "bg-accent text-white"
                      : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                  }`}
                >
                  Semua Divisi
                </button>
                {departments.map((d) => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDeptFilter(d.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                      selectedDeptFilter === d.id
                        ? "bg-accent text-white"
                        : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark"
                    }`}
                  >
                    {d.code}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {departments
                .filter((d) => ["PROD", "ENG", "OPS"].includes(d.code))
                .concat(departments.filter((d) => !["PROD", "ENG", "OPS"].includes(d.code)))
                .map((dept) => {
                  const isProd = dept.code === "PROD";
                  const isEng = dept.code === "ENG";
                  const isOps = dept.code === "OPS";

                  return (
                    <div
                      key={dept.id}
                      onClick={() => setSelectedDeptFilter(dept.id === selectedDeptFilter ? "all" : dept.id)}
                      className={`p-4 rounded-xl border transition-all cursor-pointer shadow-xs space-y-3 ${
                        selectedDeptFilter === dept.id
                          ? "border-accent ring-1 ring-accent bg-accent/5 dark:bg-accent/10"
                          : "border-borderBase-light dark:border-borderBase-dark bg-surface-light dark:bg-surface-dark hover:border-accent/40"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`font-mono text-[10px] px-2 py-0.5 rounded font-bold ${
                            isProd
                              ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                              : isEng
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                              : isOps
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
                              : "bg-accent/10 text-accent border border-accent/20"
                          }`}
                        >
                          DIVISI {dept.code}
                        </span>
                        <span className="text-xs font-mono text-textMuted-light dark:text-textMuted-dark">
                          {dept.roles_count} Jabatan
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-textPrimary-light dark:text-textPrimary-dark">
                          {dept.name}
                        </h4>
                        <p className="text-xs text-textMuted-light dark:text-textMuted-dark mt-1 line-clamp-2 leading-relaxed">
                          {dept.description || "Divisi operasional agency."}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-borderBase-light/60 dark:border-borderBase-dark/60 flex items-center justify-between text-xs">
                        <span className="text-textMuted-light dark:text-textMuted-dark flex items-center space-x-1">
                          <Users className="w-3.5 h-3.5 text-accent" />
                          <span>{dept.agents_count} Agen Spesialis</span>
                        </span>
                        <span className="text-accent text-[11px] font-semibold flex items-center space-x-1 hover:underline">
                          <span>Filter Jabatan</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 3. SPECIALIST JOB ROLES DIRECTORY */}
          <div className="border border-borderBase-light dark:border-borderBase-dark rounded-xl bg-surface-light dark:bg-surface-dark overflow-hidden shadow-xs">
            <div className="px-4 py-3.5 border-b border-borderBase-light dark:border-borderBase-dark flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-accent" />
                <h3 className="text-sm font-bold">Katalog Jabatan Spesialis ({filteredRoles.length})</h3>
                {selectedDeptFilter !== "all" && (
                  <span className="text-xs text-accent font-medium">
                    (Difilter: {departments.find((d) => d.id === selectedDeptFilter)?.name || ""})
                  </span>
                )}
              </div>
              <span className="text-xs text-textMuted-light dark:text-textMuted-dark">
                Terhubung ke Algoritma Smart Staffing & Alokasi Otomatis
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border-b border-borderBase-light dark:border-borderBase-dark text-textMuted-light dark:text-textMuted-dark font-medium">
                  <tr>
                    <th className="py-2.5 px-4 font-mono">Kode</th>
                    <th className="py-2.5 px-4">Nama Jabatan</th>
                    <th className="py-2.5 px-4">Divisi</th>
                    <th className="py-2.5 px-4">Kompetensi & Skills Utama</th>
                    <th className="py-2.5 px-4">Tanggung Jawab</th>
                    <th className="py-2.5 px-4 text-right">Agen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-borderBase-light dark:divide-borderBase-dark">
                  {filteredRoles.map((r) => (
                    <tr
                      key={r.id}
                      className="hover:bg-surfaceSecondary-light/50 dark:hover:bg-surfaceSecondary-dark/50 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-accent text-[11px] whitespace-nowrap">
                        {r.code}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-textPrimary-light dark:text-textPrimary-dark">
                          {r.name}
                        </div>
                        <div className="text-[11px] text-textMuted-light dark:text-textMuted-dark max-w-sm truncate">
                          {r.description || "Tidak ada deskripsi"}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-textMuted-light dark:text-textMuted-dark whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-mono">
                          {r.department_name || r.department_id}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {r.skills && r.skills.length > 0 ? (
                            r.skills.slice(0, 4).map((s, idx) => (
                              <span
                                key={idx}
                                className="px-1.5 py-0.2 rounded text-[10px] bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light/60 dark:border-borderBase-dark/60 font-mono text-textSecondary-light dark:text-textSecondary-dark"
                              >
                                {s}
                              </span>
                            ))
                          ) : (
                            <span className="text-textMuted-light dark:text-textMuted-dark text-[10px] italic">
                              Generalist
                            </span>
                          )}
                          {r.skills && r.skills.length > 4 && (
                            <span className="text-[10px] text-textMuted-light dark:text-textMuted-dark">
                              +{r.skills.length - 4} lagi
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-[11px] text-textMuted-light dark:text-textMuted-dark max-w-xs truncate">
                        {r.responsibilities && r.responsibilities.length > 0
                          ? r.responsibilities.slice(0, 2).join(", ")
                          : "Standard SDLC Delivery"}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-semibold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            r.agents_count > 0
                              ? "bg-status-success/15 text-status-success border border-status-success/30"
                              : "bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark text-textMuted-light dark:text-textMuted-dark"
                          }`}
                        >
                          {r.agents_count} Agen
                        </span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="bg-surface-light dark:bg-surface-dark border border-borderBase-light dark:border-borderBase-dark rounded-xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-borderBase-light dark:border-borderBase-dark">
              <h3 className="text-sm font-semibold">Usulkan Jabatan Baru</h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-textMuted-light dark:text-textMuted-dark hover:text-textPrimary-light dark:hover:text-textPrimary-dark" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 rounded bg-status-danger/10 border border-status-danger/20 text-status-danger text-xs">
                {modalError}
              </div>
            )}

            <form onSubmit={handleProposeRole} className="space-y-3 text-xs">
              <div>
                <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                  Nama Jabatan *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Misal: Senior Security Auditor"
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                    Kode Unik Jabatan *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="SEC_AUDITOR"
                    value={roleCode}
                    onChange={(e) => setRoleCode(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark font-mono uppercase focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                    Divisi *
                  </label>
                  <select
                    value={roleDeptId}
                    onChange={(e) => setRoleDeptId(e.target.value)}
                    className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent"
                  >
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                  Deskripsi Jabatan
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsikan peran dan output tugas spesialis ini..."
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent resize-none"
                />
              </div>

              <div>
                <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                  Keahlian Utama (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  placeholder="OWASP, Penetration Testing, Python, Kali Linux"
                  value={roleSkills}
                  onChange={(e) => setRoleSkills(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-textMuted-light dark:text-textMuted-dark mb-1 font-medium">
                  Tanggung Jawab Utama (Pisahkan dengan koma)
                </label>
                <input
                  type="text"
                  placeholder="Audit kode keamanan, Scanning kerentanan, Validasi enkripsi"
                  value={roleResp}
                  onChange={(e) => setRoleResp(e.target.value)}
                  className="w-full px-3 py-2 rounded bg-surfaceSecondary-light dark:bg-surfaceSecondary-dark border border-borderBase-light dark:border-borderBase-dark focus:ring-1 focus:ring-accent"
                />
              </div>

              <div className="pt-3 border-t border-borderBase-light dark:border-borderBase-dark flex items-center justify-end space-x-2">
                <Button variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" size="sm" isLoading={submitting}>
                  Simpan Jabatan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
