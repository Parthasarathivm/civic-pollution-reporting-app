"use client";
import { useState, useEffect, useMemo } from "react";
import { useAppStore } from "@/store/appStore";
import { isStaffRole, isAdminRole } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface ReportItem {
  id: number;
  userId: number | null;
  category: string;
  severity: string;
  priority: string;
  lat: number;
  lng: number;
  address: string | null;
  description: string | null;
  status: string;
  isRecurringHotspot: boolean;
  photoBeforeUrl: string | null;
  photoAfterUrl: string | null;
  departmentName: string | null;
  teamName: string | null;
  createdAt: string;
  resolvedAt: string | null;
  confirmationCount: number;
  hasConfirmed: boolean;
}

interface StatsData {
  totalReports: number;
  resolvedCount: number;
  activeIssues: number;
  underReviewCount: number;
  inProgressCount: number;
  resolvedPercent: number;
  avgResolutionHours: number;
  avgResolutionDays: number;
  recurringHotspots: number;
  totalConfirmations: number;
  mostReportedCategory: string | null;
  mostAffectedArea: string;
}

interface AdminUser {
  id: number;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

interface AuditLogItem {
  id: number;
  actorEmail: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  createdAt: string;
}

interface Department {
  id: number;
  name: string;
  code: string;
  teams: Array<{ id: number; name: string }>;
}

interface HotspotItem {
  id: number;
  zone: string;
  reportCount: number;
  recentSevenDays: number;
  primaryIssue: string;
  trend: "Increasing" | "Stable" | "Decreasing";
  criticalCount: number;
}

const CATEGORY_ICONS: Record<string, string> = {
  garbage: "🗑️",
  burning: "🔥",
  dust: "💨",
  smoke: "🚗",
  drainage: "🌊",
  industrial: "🏭",
  plastic: "🧴",
  sewage: "🚰",
  noise: "📢",
  soil: "🌱",
  other: "⚠️",
};

const SEVERITY_COLORS: Record<string, { bg: string; text: string }> = {
  low: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e" },
  medium: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b" },
  high: { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316" },
  critical: { bg: "rgba(239, 68, 68, 0.18)", text: "#ef4444" },
};

const STATUS_CONFIGS: Record<string, { label: string; color: string }> = {
  submitted: { label: "Submitted", color: "#64748b" },
  under_review: { label: "Under Review", color: "#3b82f6" },
  verified: { label: "Verified", color: "#8b5cf6" },
  assigned: { label: "Assigned", color: "#06b6d4" },
  in_progress: { label: "In Progress", color: "#f59e0b" },
  resolved: { label: "Resolved", color: "#10b981" },
  rejected: { label: "Closed / Rejected", color: "#ef4444" },
  duplicate: { label: "Duplicate", color: "#94a3b8" },
  needs_information: { label: "Needs Info", color: "#d97706" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, token } = useAppStore();

  const isStaff = isStaffRole(user?.role);
  const isAdmin = isAdminRole(user?.role);

  // Shell Tabs
  const [activeTab, setActiveTab] = useState<"overview" | "operations" | "admin">("overview");

  // Data states
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [stats, setStats] = useState<StatsData | null>(null);
  const [hotspots, setHotspots] = useState<HotspotItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Overview sub-filter
  const [overviewFilter, setOverviewFilter] = useState<"all" | "mine" | "resolved">("all");

  // Operations queue filters
  const [opStatusFilter, setOpStatusFilter] = useState("all");
  const [opCategoryFilter, setOpCategoryFilter] = useState("all");
  const [opSeverityFilter, setOpSeverityFilter] = useState("all");

  // Admin section states
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminLogs, setAdminLogs] = useState<AuditLogItem[]>([]);
  const [loadingAdmin, setLoadingAdmin] = useState(false);

  // Quick Action Modal for Authority triage
  const [selectedCase, setSelectedCase] = useState<ReportItem | null>(null);
  const [actionStatus, setActionStatus] = useState("");
  const [actionPriority, setActionPriority] = useState("");
  const [actionDeptId, setActionDeptId] = useState("");
  const [actionTeamId, setActionTeamId] = useState("");
  const [actionNotes, setActionNotes] = useState("");
  const [actionResolutionSummary, setActionResolutionSummary] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Refresh timer for real-time feel
  const [lastRefreshed, setLastRefreshed] = useState<string>("Just now");

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [repRes, statRes, hotRes, deptRes] = await Promise.all([
        fetch("/api/reports?limit=150", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch("/api/stats", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        }),
        fetch("/api/hotspots?threshold=2"),
        fetch("/api/departments"),
      ]);

      if (repRes.ok) {
        const rData = await repRes.json();
        if (Array.isArray(rData)) setReports(rData);
      }

      if (statRes.ok) {
        const sData = await statRes.json();
        setStats(sData);
      }

      if (hotRes.ok) {
        const hData = await hotRes.json();
        if (hData.hotspots) setHotspots(hData.hotspots);
      }

      if (deptRes.ok) {
        const dData = await deptRes.json();
        if (Array.isArray(dData)) setDepartments(dData);
      }

      const now = new Date();
      setLastRefreshed(
        `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
      );
    } catch (err) {
      console.error(err);
      setError("Unable to retrieve latest civic telemetry. Showing local cache.");
    } finally {
      setLoading(false);
    }
  };

  const loadAdminData = async () => {
    if (!token || !isAdmin) return;
    setLoadingAdmin(true);
    try {
      const [uRes, lRes] = await Promise.all([
        fetch("/api/admin/users", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/audit-logs", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (uRes.ok) {
        const uData = await uRes.json();
        if (Array.isArray(uData)) setAdminUsers(uData);
      }

      if (lRes.ok) {
        const lData = await lRes.json();
        if (Array.isArray(lData)) setAdminLogs(lData);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingAdmin(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    Promise.all([
      fetch("/api/reports?limit=150", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
      fetch("/api/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
      fetch("/api/hotspots?threshold=2"),
      fetch("/api/departments"),
    ])
      .then(async ([repRes, statRes, hotRes, deptRes]) => {
        if (ignore) return;
        if (repRes.ok) {
          const rData = await repRes.json();
          if (Array.isArray(rData)) setReports(rData);
        }
        if (statRes.ok) {
          const sData = await statRes.json();
          setStats(sData);
        }
        if (hotRes.ok) {
          const hData = await hotRes.json();
          if (hData.hotspots) setHotspots(hData.hotspots);
        }
        if (deptRes.ok) {
          const dData = await deptRes.json();
          if (Array.isArray(dData)) setDepartments(dData);
        }
        const now = new Date();
        setLastRefreshed(
          `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}`
        );
        setLoading(false);
      })
      .catch((err) => {
        if (!ignore) {
          console.error(err);
          setError("Unable to retrieve latest civic telemetry. Showing local cache.");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  useEffect(() => {
    if (activeTab !== "admin" || !token || !isAdmin) return;
    let ignore = false;
    Promise.all([
      fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      }),
      fetch("/api/admin/audit-logs", {
        headers: { Authorization: `Bearer ${token}` },
      }),
    ])
      .then(async ([uRes, lRes]) => {
        if (ignore) return;
        if (uRes.ok) {
          const uData = await uRes.json();
          if (Array.isArray(uData)) setAdminUsers(uData);
        }
        if (lRes.ok) {
          const lData = await lRes.json();
          if (Array.isArray(lData)) setAdminLogs(lData);
        }
      })
      .catch(console.error);
    return () => {
      ignore = true;
    };
  }, [activeTab, token, isAdmin]);

  // Handle User Role Change (Admin action)
  const handleChangeUserRole = async (targetUserId: number, newRole: string) => {
    if (!token || !isAdmin) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId, newRole }),
      });
      if (res.ok) {
        await loadAdminData();
      } else {
        alert("Failed to update user role");
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Handle Authority Case Action
  const handleUpdateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedCase) return;
    setIsUpdating(true);

    try {
      const body: Record<string, unknown> = {
        status: actionStatus,
        priority: actionPriority,
        notes: actionNotes.trim() || undefined,
      };

      if (actionDeptId) {
        body.assignedDepartmentId = parseInt(actionDeptId);
      }
      if (actionTeamId) {
        body.assignedTeamId = parseInt(actionTeamId);
      }
      if (actionStatus === "resolved") {
        body.resolutionNotes = actionResolutionSummary.trim() || "Hazard remediation completed.";
        const deptObj = departments.find((d) => String(d.id) === actionDeptId);
        body.resolutionDepartment = deptObj?.name || selectedCase.departmentName || "Municipal Operations";
      }

      const res = await fetch(`/api/reports/${selectedCase.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error("Case update failed");

      setSelectedCase(null);
      await loadData();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Error updating case");
    } finally {
      setIsUpdating(false);
    }
  };

  // Filtered Overview reports
  const displayedOverviewReports = useMemo(() => {
    if (overviewFilter === "mine" && user?.id) {
      return reports.filter((r) => r.userId === user.id);
    }
    if (overviewFilter === "resolved") {
      return reports.filter((r) => r.status === "resolved" || r.status === "verified");
    }
    return reports.slice(0, 10);
  }, [reports, overviewFilter, user]);

  // Filtered Operations reports
  const displayedOperationReports = useMemo(() => {
    return reports.filter((r) => {
      if (opStatusFilter !== "all" && r.status !== opStatusFilter) return false;
      if (opCategoryFilter !== "all" && r.category !== opCategoryFilter) return false;
      if (opSeverityFilter !== "all" && r.severity !== opSeverityFilter) return false;
      return true;
    });
  }, [reports, opStatusFilter, opCategoryFilter, opSeverityFilter]);

  // User-specific counts
  const userReportsCount = useMemo(
    () => (user ? reports.filter((r) => r.userId === user.id).length : 0),
    [reports, user]
  );
  const activeReportsCount = useMemo(
    () => reports.filter((r) => r.status !== "resolved" && r.status !== "rejected").length,
    [reports]
  );
  const resolvedReportsCount = useMemo(
    () => reports.filter((r) => r.status === "resolved" || r.status === "verified").length,
    [reports]
  );
  const userConfirmationsCount = stats?.totalConfirmations || 0;

  return (
    <div className="min-h-screen py-8">
      <div className="page-container max-w-6xl">
        {/* Top Hero / Welcome Banner */}
        <div className="theme-card mb-6 overflow-hidden relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600">
                  CivicPulse Central Hub
                </span>
                <span className="text-xs theme-text-muted capitalize font-semibold px-2 py-0.5 rounded bg-black/5 dark:bg-white/5">
                  Role: {user?.role || "Citizen"}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
                Welcome back, {user?.name || "Community Member"}
              </h1>
              <p className="text-xs sm:text-sm theme-text-muted mt-1 max-w-xl">
                Track environmental issues, verify municipal response, and help improve your community.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5 self-start md:self-auto">
              <Link
                href="/report"
                className="theme-btn text-xs py-2.5 px-4 font-bold flex items-center gap-1.5"
              >
                <span>📸</span>
                <span>Report Pollution</span>
              </Link>
              <Link
                href="/map"
                className="theme-btn-secondary text-xs py-2.5 px-3.5 flex items-center gap-1.5"
              >
                <span>🗺️</span>
                <span>Live Map</span>
              </Link>
              <Link
                href="/contacts"
                className="theme-btn-secondary text-xs py-2.5 px-3.5 flex items-center gap-1.5"
              >
                <span>🏛️</span>
                <span>Helplines</span>
              </Link>
            </div>
          </div>

          {/* Real-time Indicator Footer */}
          <div className="flex items-center justify-between mt-5 pt-3 border-t text-[11px] theme-text-muted" style={{ borderColor: "var(--border)" }}>
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span>PostgreSQL Telemetry Connected • Refreshed at {lastRefreshed}</span>
            </span>
            <button
              onClick={loadData}
              className="hover:underline flex items-center gap-1 cursor-pointer"
            >
              🔄 Refresh Data
            </button>
          </div>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          <div className="theme-card">
            <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
              My Submissions
            </span>
            <p className="text-2xl sm:text-3xl font-bold mt-1" style={{ color: "var(--accent)" }}>
              {user ? userReportsCount : "–"}
            </p>
            <span className="text-[11px] theme-text-muted block mt-0.5">
              {user ? "Your filed reports" : "Log in to track"}
            </span>
          </div>

          <div className="theme-card">
            <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
              Active Issues
            </span>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-amber-500">
              {activeReportsCount}
            </p>
            <span className="text-[11px] theme-text-muted block mt-0.5">
              Pending municipal cleanup
            </span>
          </div>

          <div className="theme-card">
            <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
              Resolved Cases
            </span>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-emerald-500">
              {resolvedReportsCount}
            </p>
            <span className="text-[11px] theme-text-muted block mt-0.5">
              Successfully remediated
            </span>
          </div>

          <div className="theme-card">
            <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
              Community Corroborations
            </span>
            <p className="text-2xl sm:text-3xl font-bold mt-1 text-sky-500">
              {userConfirmationsCount}
            </p>
            <span className="text-[11px] theme-text-muted block mt-0.5">
              Citizen confirmations recorded
            </span>
          </div>
        </div>

        {/* Shared Dashboard Shell Navigation */}
        <div className="flex border-b mb-6 space-x-2" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => setActiveTab("overview")}
            className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "overview"
                ? "border-sky-500 text-sky-600 dark:text-sky-400"
                : "border-transparent theme-text-muted hover:text-sky-500"
            }`}
          >
            <span>🌿</span>
            <span>Civic Overview & Activity</span>
          </button>

          {isStaff && (
            <button
              onClick={() => setActiveTab("operations")}
              className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "operations"
                  ? "border-sky-500 text-sky-600 dark:text-sky-400"
                  : "border-transparent theme-text-muted hover:text-sky-500"
              }`}
            >
              <span>⚡</span>
              <span>Authority & Operations Queue</span>
              <span className="bg-sky-500/20 text-sky-600 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                Staff
              </span>
            </button>
          )}

          {isAdmin && (
            <button
              onClick={() => setActiveTab("admin")}
              className={`pb-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === "admin"
                  ? "border-sky-500 text-sky-600 dark:text-sky-400"
                  : "border-transparent theme-text-muted hover:text-sky-500"
              }`}
            >
              <span>⚙️</span>
              <span>Platform Administration</span>
              <span className="bg-purple-500/20 text-purple-600 text-[10px] px-1.5 py-0.2 rounded-full font-bold">
                Admin
              </span>
            </button>
          )}
        </div>

        {/* TAB 1: CIVIC OVERVIEW */}
        {activeTab === "overview" && (
          <div className="space-y-6 animate-fade-in">
            {/* Hotspots Alert Banner */}
            {hotspots.length > 0 ? (
              <div
                className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4"
                style={{
                  backgroundColor: "rgba(239, 68, 68, 0.08)",
                  borderColor: "rgba(239, 68, 68, 0.3)",
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <h3 className="font-bold text-sm text-red-600 dark:text-red-400">
                      Pollution Hotspot Detected: {hotspots[0].zone}
                    </h3>
                    <p className="text-xs theme-text-muted mt-0.5">
                      {hotspots[0].reportCount} reports in locality (Primary issue: <strong className="capitalize">{hotspots[0].primaryIssue}</strong>). Trend: {hotspots[0].trend}.
                    </p>
                  </div>
                </div>
                <Link
                  href="/map"
                  className="theme-btn text-xs py-1.5 px-3 self-start md:self-auto shrink-0 bg-red-600 hover:bg-red-700 text-white"
                >
                  Inspect Hotspots Map →
                </Link>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl border text-xs theme-text-muted flex items-center gap-2 bg-black/5 dark:bg-white/5">
                <span>🛡️</span>
                <span>No recurring pollution hotspots detected from current cluster thresholds.</span>
              </div>
            )}

            {/* Environmental Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="theme-card flex items-center gap-3">
                <span className="text-2xl p-2 rounded-xl bg-sky-500/10 text-sky-600">
                  {CATEGORY_ICONS[stats?.mostReportedCategory || ""] || "⚠️"}
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase theme-text-muted">Top Hazard Category</span>
                  <p className="font-bold text-sm capitalize" style={{ color: "var(--text-primary)" }}>
                    {stats?.mostReportedCategory || "None Recorded"}
                  </p>
                </div>
              </div>

              <div className="theme-card flex items-center gap-3">
                <span className="text-2xl p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                  ⏱️
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase theme-text-muted">Avg. Resolution Speed</span>
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                    {stats?.avgResolutionDays ? `${stats.avgResolutionDays} days` : "Under 24 hours"}
                  </p>
                </div>
              </div>

              <div className="theme-card flex items-center gap-3">
                <span className="text-2xl p-2 rounded-xl bg-purple-500/10 text-purple-600">
                  📈
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase theme-text-muted">Resolution Rate</span>
                  <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                    {stats?.resolvedPercent || 0}% Cleared
                  </p>
                </div>
              </div>
            </div>

            {/* Recent Reports Section */}
            <div className="theme-card">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    Verified Civic Reports Feed
                  </h2>
                  <p className="text-xs theme-text-muted">Real database records of citizen environmental observations</p>
                </div>

                <div className="flex items-center gap-1.5 self-start">
                  <button
                    onClick={() => setOverviewFilter("all")}
                    className={`text-xs py-1 px-3 rounded-lg font-bold transition-all ${
                      overviewFilter === "all"
                        ? "bg-sky-500/20 text-sky-600"
                        : "theme-text-muted hover:bg-black/5"
                    }`}
                  >
                    All Reports
                  </button>
                  {user && (
                    <button
                      onClick={() => setOverviewFilter("mine")}
                      className={`text-xs py-1 px-3 rounded-lg font-bold transition-all ${
                        overviewFilter === "mine"
                          ? "bg-sky-500/20 text-sky-600"
                          : "theme-text-muted hover:bg-black/5"
                      }`}
                    >
                      My Reports ({userReportsCount})
                    </button>
                  )}
                  <button
                    onClick={() => setOverviewFilter("resolved")}
                    className={`text-xs py-1 px-3 rounded-lg font-bold transition-all ${
                      overviewFilter === "resolved"
                        ? "bg-emerald-500/20 text-emerald-600"
                        : "theme-text-muted hover:bg-black/5"
                    }`}
                  >
                    Resolved ({resolvedReportsCount})
                  </button>
                </div>
              </div>

              {loading ? (
                <div className="py-12 text-center text-xs theme-text-muted">
                  <span className="spinner mb-2 inline-block" />
                  <p>Loading real reports...</p>
                </div>
              ) : displayedOverviewReports.length === 0 ? (
                <div className="py-12 text-center">
                  <span className="text-3xl block mb-2">📋</span>
                  <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                    No reports match this criteria
                  </p>
                  <p className="text-xs theme-text-muted mt-1">
                    {overviewFilter === "mine"
                      ? "You haven't submitted any reports yet."
                      : "No civic reports logged in this filter."}
                  </p>
                  {overviewFilter === "mine" && (
                    <Link href="/report" className="theme-btn text-xs py-1.5 px-4 mt-3 inline-block">
                      Submit Your First Report
                    </Link>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  {displayedOverviewReports.map((report) => {
                    const sev = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.medium;
                    const st = STATUS_CONFIGS[report.status] || { label: report.status, color: "#64748b" };

                    return (
                      <div
                        key={report.id}
                        className="p-4 rounded-xl border flex flex-col justify-between transition-all hover:shadow-md bg-black/[0.02] dark:bg-white/[0.02]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div>
                          {/* Header row */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                              CP-{report.id}
                            </span>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                                style={{ backgroundColor: sev.bg, color: sev.text }}
                              >
                                {report.severity}
                              </span>
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                                style={{ backgroundColor: st.color }}
                              >
                                {st.label}
                              </span>
                            </div>
                          </div>

                          {/* Category & Description */}
                          <h3 className="font-bold text-sm capitalize flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                            <span>{CATEGORY_ICONS[report.category] || "⚠️"}</span>
                            <span>{report.category} Hazard</span>
                          </h3>
                          <p className="text-xs theme-text-muted mt-1 line-clamp-2 leading-relaxed">
                            {report.description || "Environmental observation recorded."}
                          </p>
                        </div>

                        {/* Footer row */}
                        <div className="mt-4 pt-2.5 border-t flex items-center justify-between text-[11px] theme-text-muted" style={{ borderColor: "var(--border)" }}>
                          <span className="truncate max-w-[180px]">
                            📍 {report.address || `${report.lat.toFixed(3)}, ${report.lng.toFixed(3)}`}
                          </span>

                          <div className="flex items-center gap-3">
                            <span className="flex items-center gap-1 font-semibold text-amber-600">
                              <span>👥</span> {report.confirmationCount}
                            </span>
                            <Link
                              href={`/report/${report.id}`}
                              className="font-bold text-sky-600 hover:underline"
                            >
                              Track Case →
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: AUTHORITY OPERATIONS QUEUE */}
        {activeTab === "operations" && isStaff && (
          <div className="space-y-6 animate-fade-in">
            {/* Filters Bar */}
            <div className="theme-card">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Queue Stage
                  </label>
                  <select
                    value={opStatusFilter}
                    onChange={(e) => setOpStatusFilter(e.target.value)}
                    className="theme-input text-xs w-full"
                  >
                    <option value="all">All Stages</option>
                    <option value="submitted">Submitted (New)</option>
                    <option value="under_review">Under Review</option>
                    <option value="verified">Verified</option>
                    <option value="assigned">Assigned</option>
                    <option value="in_progress">In Progress</option>
                    <option value="resolved">Resolved</option>
                    <option value="needs_information">Needs Info</option>
                    <option value="rejected">Rejected / Duplicate</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Hazard Category
                  </label>
                  <select
                    value={opCategoryFilter}
                    onChange={(e) => setOpCategoryFilter(e.target.value)}
                    className="theme-input text-xs w-full"
                  >
                    <option value="all">All Categories</option>
                    {Object.keys(CATEGORY_ICONS).map((k) => (
                      <option key={k} value={k}>
                        {CATEGORY_ICONS[k]} {k}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Severity
                  </label>
                  <select
                    value={opSeverityFilter}
                    onChange={(e) => setOpSeverityFilter(e.target.value)}
                    className="theme-input text-xs w-full"
                  >
                    <option value="all">All Severities</option>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Operations Cases Table / Cards */}
            <div className="theme-card">
              <div className="flex items-center justify-between mb-4 pb-2 border-b" style={{ borderColor: "var(--border)" }}>
                <div>
                  <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    Municipal Case Management Queue
                  </h2>
                  <p className="text-xs theme-text-muted">
                    {displayedOperationReports.length} cases awaiting triage, team dispatch, or remediation sign-off
                  </p>
                </div>
              </div>

              {displayedOperationReports.length === 0 ? (
                <div className="py-12 text-center text-xs theme-text-muted">
                  No cases match the selected operations filter.
                </div>
              ) : (
                <div className="space-y-3">
                  {displayedOperationReports.map((c) => {
                    const st = STATUS_CONFIGS[c.status] || { label: c.status, color: "#64748b" };
                    const sev = SEVERITY_COLORS[c.severity] || SEVERITY_COLORS.medium;

                    return (
                      <div
                        key={c.id}
                        className="p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 bg-black/[0.01] dark:bg-white/[0.01]"
                        style={{ borderColor: "var(--border)" }}
                      >
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                              CP-{c.id}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                              style={{ backgroundColor: sev.bg, color: sev.text }}
                            >
                              {c.severity}
                            </span>
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: st.color }}
                            >
                              {st.label}
                            </span>
                            <span className="text-[10px] font-semibold theme-text-muted">
                              Dept: {c.departmentName || "Unassigned"}
                            </span>
                            {c.teamName && (
                              <span className="text-[10px] bg-sky-500/10 text-sky-600 px-1.5 py-0.2 rounded font-semibold">
                                {c.teamName}
                              </span>
                            )}
                          </div>

                          <h4 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                            {CATEGORY_ICONS[c.category] || "⚠️"} {c.category.toUpperCase()} — {c.address || `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`}
                          </h4>
                          <p className="text-xs theme-text-muted mt-1 line-clamp-1">
                            {c.description || "No description."}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => {
                              setSelectedCase(c);
                              setActionStatus(c.status);
                              setActionPriority(c.priority);
                              setActionNotes("");
                              setActionResolutionSummary("");
                            }}
                            className="theme-btn text-xs py-1.5 px-3 flex items-center gap-1 font-bold"
                          >
                            <span>⚡</span>
                            <span>Triage / Update</span>
                          </button>
                          <Link
                            href={`/report/${c.id}`}
                            className="theme-btn-secondary text-xs py-1.5 px-3"
                          >
                            Case File
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: PLATFORM ADMINISTRATION */}
        {activeTab === "admin" && isAdmin && (
          <div className="space-y-6 animate-fade-in">
            {/* User & Role Management */}
            <div className="theme-card">
              <h2 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                User Directory & Role Authorizations
              </h2>
              <p className="text-xs theme-text-muted mb-4">
                Assign and modify role access across Citizen, Moderator, Authority, and Administrator tiers.
              </p>

              {loadingAdmin ? (
                <div className="py-8 text-center text-xs theme-text-muted">
                  Loading users...
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead className="border-b uppercase font-bold text-gray-500 text-[10px]" style={{ borderColor: "var(--border)" }}>
                      <tr>
                        <th className="py-2 px-3">Name</th>
                        <th className="py-2 px-3">Email</th>
                        <th className="py-2 px-3">Current Role</th>
                        <th className="py-2 px-3">Joined Date</th>
                        <th className="py-2 px-3 text-right">Assign Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                      {adminUsers.map((u) => (
                        <tr key={u.id}>
                          <td className="py-2.5 px-3 font-semibold" style={{ color: "var(--text-primary)" }}>
                            {u.name}
                          </td>
                          <td className="py-2.5 px-3 theme-text-muted font-mono text-[11px]">
                            {u.email}
                          </td>
                          <td className="py-2.5 px-3">
                            <span className="capitalize font-bold text-sky-600 bg-sky-500/10 px-2 py-0.5 rounded">
                              {u.role}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 theme-text-muted">
                            {new Date(u.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <select
                              value={u.role}
                              onChange={(e) => handleChangeUserRole(u.id, e.target.value)}
                              className="theme-input text-xs py-1 px-2"
                            >
                              <option value="citizen">Citizen</option>
                              <option value="moderator">Moderator</option>
                              <option value="authority">Authority</option>
                              <option value="admin">Administrator</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Audit Logs */}
            <div className="theme-card">
              <h2 className="text-base font-bold mb-1" style={{ color: "var(--text-primary)" }}>
                Tamper-Evident System Audit Trail
              </h2>
              <p className="text-xs theme-text-muted mb-4">
                Recorded administrative actions, role alterations, and official report status modifications
              </p>

              {adminLogs.length === 0 ? (
                <p className="text-xs theme-text-muted py-6 text-center">
                  No administrative actions logged yet.
                </p>
              ) : (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
                  {adminLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-2.5 rounded-lg border text-xs flex items-center justify-between gap-3 bg-black/5 dark:bg-white/5"
                      style={{ borderColor: "var(--border)" }}
                    >
                      <div>
                        <span className="font-bold text-purple-600 mr-2">
                          [{log.action}]
                        </span>
                        <span className="theme-text-muted">
                          {log.entityType} (ID: {log.entityId || "N/A"}) by {log.actorEmail || "System"}
                        </span>
                      </div>
                      <span className="text-[10px] theme-text-muted font-mono shrink-0">
                        {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Authority Quick Action Modal */}
        {selectedCase && (
          <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div
              className="theme-card max-w-lg w-full max-h-[90vh] overflow-y-auto"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex items-center justify-between pb-3 border-b mb-4" style={{ borderColor: "var(--border)" }}>
                <div>
                  <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                    Triage Report CP-{selectedCase.id}
                  </h3>
                  <p className="text-xs theme-text-muted capitalize">
                    {selectedCase.category} • {selectedCase.address || "Coordinates"}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedCase(null)}
                  className="p-1.5 rounded hover:bg-black/5 text-sm theme-text-muted"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleUpdateCase} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Case Status *
                    </label>
                    <select
                      value={actionStatus}
                      onChange={(e) => setActionStatus(e.target.value)}
                      className="theme-input text-xs w-full"
                    >
                      <option value="submitted">Submitted</option>
                      <option value="under_review">Under Review</option>
                      <option value="verified">Verified</option>
                      <option value="assigned">Assigned</option>
                      <option value="in_progress">In Progress</option>
                      <option value="resolved">Resolved</option>
                      <option value="needs_information">Needs Info</option>
                      <option value="duplicate">Duplicate</option>
                      <option value="rejected">Rejected / Closed</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Priority Level *
                    </label>
                    <select
                      value={actionPriority}
                      onChange={(e) => setActionPriority(e.target.value)}
                      className="theme-input text-xs w-full"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Assign Department
                    </label>
                    <select
                      value={actionDeptId}
                      onChange={(e) => {
                        setActionDeptId(e.target.value);
                        setActionTeamId("");
                      }}
                      className="theme-input text-xs w-full"
                    >
                      <option value="">-- Unassigned --</option>
                      {departments.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name} ({d.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Assign Response Team
                    </label>
                    <select
                      value={actionTeamId}
                      onChange={(e) => setActionTeamId(e.target.value)}
                      className="theme-input text-xs w-full"
                    >
                      <option value="">-- Select Team --</option>
                      {departments
                        .find((d) => String(d.id) === actionDeptId)
                        ?.teams.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                {actionStatus === "resolved" && (
                  <div>
                    <label className="block text-xs font-semibold text-emerald-600 mb-1">
                      Public Resolution Summary *
                    </label>
                    <textarea
                      rows={2}
                      required
                      value={actionResolutionSummary}
                      onChange={(e) => setActionResolutionSummary(e.target.value)}
                      className="theme-input text-xs w-full"
                      placeholder="e.g. Hazardous accumulation removed and transferred to processing unit."
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Internal Staff Triage Note
                  </label>
                  <textarea
                    rows={2}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="theme-input text-xs w-full"
                    placeholder="Staff observations recorded in case history"
                  />
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setSelectedCase(null)}
                    className="theme-btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="theme-btn text-xs"
                  >
                    {isUpdating ? "Saving..." : "Commit Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
