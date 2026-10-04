"use client";
import { useState, useEffect } from "react";
import { useAppStore } from "@/store/appStore";
import Link from "next/link";

interface CategoryStat {
  category: string;
  count: number;
}

interface SeverityStat {
  severity: string;
  count: number;
}

interface TrendStat {
  date: string;
  count: number;
}

interface AchievementItem {
  id: number;
  badgeKey: string;
  title: string;
  description: string;
  earnedAt: string;
}

interface UserImpactData {
  reportsSubmitted: number;
  reportsResolved: number;
  confirmationsGiven: number;
  achievements: AchievementItem[];
}

interface StatsResponse {
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
  categoryBreakdown: CategoryStat[];
  severityBreakdown: SeverityStat[];
  trendData: TrendStat[];
  userImpact?: UserImpactData | null;
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

const CATEGORY_COLORS: Record<string, string> = {
  garbage: "#78716c",
  burning: "#f97316",
  dust: "#d97706",
  smoke: "#64748b",
  drainage: "#0284c7",
  industrial: "#8b5cf6",
  plastic: "#0ea5e9",
  sewage: "#0d9488",
  noise: "#e11d48",
  soil: "#84cc16",
  other: "#94a3b8",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const BADGE_ICONS: Record<string, string> = {
  first_report: "🌱",
  community_contributor: "🤝",
  community_watcher: "👁️",
  local_impact: "🏆",
};

export default function InsightsPage() {
  const { user, token } = useAppStore();
  const [activeTab, setActiveTab] = useState<"city" | "myImpact">("city");
  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stats", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to load statistics");
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error(err);
      setError("Unable to retrieve live environmental insights.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let ignore = false;
    fetch("/api/stats", {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load statistics");
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setStats(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!ignore) {
          console.error(err);
          setError("Unable to retrieve live environmental insights.");
          setLoading(false);
        }
      });
    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <div className="min-h-screen py-8">
      <div className="page-container max-w-6xl">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">📊</span>
              <span
                className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
              >
                PostgreSQL Civic Analytics
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              Environmental Insights & Transparency
            </h1>
            <p className="text-xs theme-text-muted mt-1">
              Real calculations computed from verified citizen submissions and municipal operations records.
            </p>
          </div>

          {/* View Mode Tabs */}
          <div
            className="p-1 rounded-xl flex items-center border self-start"
            style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
          >
            <button
              onClick={() => setActiveTab("city")}
              className={`text-xs py-1.5 px-4 rounded-lg font-bold transition-all ${
                activeTab === "city"
                  ? "bg-white dark:bg-slate-800 shadow-sm text-sky-600"
                  : "theme-text-muted hover:text-sky-500"
              }`}
            >
              City-Wide Insights
            </button>
            <button
              onClick={() => setActiveTab("myImpact")}
              className={`text-xs py-1.5 px-4 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "myImpact"
                  ? "bg-white dark:bg-slate-800 shadow-sm text-emerald-600"
                  : "theme-text-muted hover:text-emerald-500"
              }`}
            >
              <span>My Impact</span>
              {user && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center">
            <span className="spinner mb-3 inline-block" />
            <p className="text-sm theme-text-muted">Computing environmental metrics from database...</p>
          </div>
        ) : error || !stats ? (
          <div className="theme-card text-center py-12">
            <p className="text-base text-red-500 font-medium mb-3">{error || "No data available"}</p>
            <button onClick={loadStats} className="theme-btn text-xs">
              Retry Calculation
            </button>
          </div>
        ) : activeTab === "city" ? (
          /* CITY-WIDE INSIGHTS VIEW */
          <div className="space-y-6 animate-fade-in">
            {/* Top KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="theme-card">
                <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
                  Total Case Records
                </span>
                <p className="text-3xl font-extrabold mt-1" style={{ color: "var(--accent)" }}>
                  {stats.totalReports}
                </p>
                <span className="text-[11px] theme-text-muted block mt-1">
                  Active in Queue: {stats.activeIssues}
                </span>
              </div>

              <div className="theme-card">
                <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
                  Resolution Rate
                </span>
                <p className="text-3xl font-extrabold mt-1 text-emerald-600">
                  {stats.resolvedPercent}%
                </p>
                <span className="text-[11px] theme-text-muted block mt-1">
                  {stats.resolvedCount} of {stats.totalReports} cases remediated
                </span>
              </div>

              <div className="theme-card">
                <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
                  Avg. Resolution Time
                </span>
                <p className="text-3xl font-extrabold mt-1 text-sky-600">
                  {stats.avgResolutionDays > 0
                    ? `${stats.avgResolutionDays} days`
                    : stats.avgResolutionHours > 0
                    ? `${stats.avgResolutionHours} hrs`
                    : "N/A"}
                </p>
                <span className="text-[11px] theme-text-muted block mt-1">
                  {stats.resolvedCount > 0 ? "From actual remediation timestamps" : "Awaiting first resolution"}
                </span>
              </div>

              <div className="theme-card">
                <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
                  Community Confirmations
                </span>
                <p className="text-3xl font-extrabold mt-1 text-amber-600">
                  {stats.totalConfirmations}
                </p>
                <span className="text-[11px] theme-text-muted block mt-1">
                  Citizen corroborations recorded
                </span>
              </div>
            </div>

            {/* Environmental Summary Highlights */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="theme-card flex items-center gap-3">
                <span className="text-3xl p-2.5 rounded-xl bg-sky-500/10 text-sky-600">
                  {CATEGORY_ICONS[stats.mostReportedCategory || ""] || "⚠️"}
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
                    Most Reported Hazard
                  </span>
                  <p className="text-base font-bold capitalize" style={{ color: "var(--text-primary)" }}>
                    {stats.mostReportedCategory || "No data recorded"}
                  </p>
                  <p className="text-xs theme-text-muted">Primary civic concern</p>
                </div>
              </div>

              <div className="theme-card flex items-center gap-3">
                <span className="text-3xl p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                  📍
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
                    Most Affected Locality
                  </span>
                  <p className="text-base font-bold truncate max-w-[200px]" style={{ color: "var(--text-primary)" }}>
                    {stats.mostAffectedArea}
                  </p>
                  <p className="text-xs theme-text-muted">Top dispatch concentration</p>
                </div>
              </div>

              <div className="theme-card flex items-center gap-3">
                <span className="text-3xl p-2.5 rounded-xl bg-red-500/10 text-red-600">
                  🔥
                </span>
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
                    Persistent Hotspots
                  </span>
                  <p className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                    {stats.recurringHotspots} Active Zone(s)
                  </p>
                  <p className="text-xs theme-text-muted">Spatial proximity cluster</p>
                </div>
              </div>
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Category Breakdown */}
              <div className="theme-card">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4 theme-text-muted flex items-center justify-between">
                  <span>Pollution Category Distribution</span>
                  <span className="text-xs font-normal">Real Counts</span>
                </h2>

                {stats.categoryBreakdown.length === 0 ? (
                  <p className="text-xs theme-text-muted py-8 text-center">
                    No pollution categories recorded in database yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.categoryBreakdown.map((item) => {
                      const max = Math.max(...stats.categoryBreakdown.map((c) => c.count), 1);
                      const pct = Math.round((item.count / stats.totalReports) * 100);
                      const color = CATEGORY_COLORS[item.category] || "#0284c7";
                      return (
                        <div key={item.category}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold flex items-center gap-1.5 capitalize" style={{ color: "var(--text-primary)" }}>
                              <span>{CATEGORY_ICONS[item.category] || "⚠️"}</span>
                              <span>{item.category}</span>
                            </span>
                            <span className="theme-text-muted">
                              {item.count} reports ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(item.count / max) * 100}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Severity Breakdown */}
              <div className="theme-card">
                <h2 className="text-sm font-bold uppercase tracking-wider mb-4 theme-text-muted flex items-center justify-between">
                  <span>Severity Distribution</span>
                  <span className="text-xs font-normal">Risk Levels</span>
                </h2>

                {stats.severityBreakdown.length === 0 ? (
                  <p className="text-xs theme-text-muted py-8 text-center">
                    No severity breakdown recorded in database yet.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {stats.severityBreakdown.map((item) => {
                      const max = Math.max(...stats.severityBreakdown.map((s) => s.count), 1);
                      const pct = Math.round((item.count / stats.totalReports) * 100);
                      const color = SEVERITY_COLORS[item.severity] || "#f59e0b";
                      return (
                        <div key={item.severity}>
                          <div className="flex justify-between text-xs mb-1">
                            <span className="font-semibold uppercase" style={{ color }}>
                              {item.severity} Severity
                            </span>
                            <span className="theme-text-muted">
                              {item.count} ({pct}%)
                            </span>
                          </div>
                          <div className="h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${(item.count / max) * 100}%`,
                                backgroundColor: color,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* 30-Day Trend Timeline Chart */}
            <div className="theme-card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider theme-text-muted">
                    30-Day Reporting Frequency Timeline
                  </h2>
                  <p className="text-xs theme-text-muted mt-0.5">
                    Daily report submission volume logged in PostgreSQL
                  </p>
                </div>
              </div>

              {stats.trendData.length === 0 ? (
                <div className="py-12 text-center text-xs theme-text-muted">
                  No submissions recorded during the last 30 days.
                </div>
              ) : (
                <div className="overflow-x-auto pt-4">
                  <div className="min-w-[600px] h-40 flex items-end gap-1.5 pb-6 border-b border-black/10 dark:border-white/10 relative">
                    {stats.trendData.map((d) => {
                      const maxVal = Math.max(...stats.trendData.map((t) => t.count), 1);
                      const barHeight = Math.max((d.count / maxVal) * 110, 6);
                      return (
                        <div
                          key={d.date}
                          className="flex-1 flex flex-col items-center group relative"
                        >
                          {/* Tooltip */}
                          <div className="absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity bg-black text-white text-[10px] py-0.5 px-1.5 rounded pointer-events-none whitespace-nowrap z-10">
                            {d.date}: {d.count} report(s)
                          </div>
                          <div
                            className="w-full rounded-t transition-all group-hover:brightness-110"
                            style={{
                              height: `${barHeight}px`,
                              backgroundColor: "var(--accent)",
                            }}
                          />
                          <span className="text-[9px] theme-text-muted mt-1 transform -rotate-45 origin-top-left truncate block w-6">
                            {d.date.slice(5)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* MY COMMUNITY IMPACT VIEW */
          <div className="space-y-6 animate-fade-in">
            {!user ? (
              <div className="theme-card text-center py-14">
                <span className="text-4xl block mb-3">🔐</span>
                <h3 className="font-bold text-lg mb-1" style={{ color: "var(--text-primary)" }}>
                  Log In to View Personal Impact
                </h3>
                <p className="text-xs theme-text-muted max-w-md mx-auto mb-6">
                  Track your personal civic contribution history, verified issues submitted, and earned achievements.
                </p>
                <Link href="/login" className="theme-btn text-xs py-2 px-6 font-bold">
                  Log In to CivicPulse
                </Link>
              </div>
            ) : !stats.userImpact ? (
              <div className="theme-card text-center py-10">
                <p className="text-xs theme-text-muted">Loading personal impact profile...</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Personal KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="theme-card border-l-4 border-sky-500">
                    <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
                      My Reports Submitted
                    </span>
                    <p className="text-3xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>
                      {stats.userImpact.reportsSubmitted}
                    </p>
                    <span className="text-[11px] theme-text-muted mt-1 block">
                      Logged under {user.name}
                    </span>
                  </div>

                  <div className="theme-card border-l-4 border-emerald-500">
                    <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
                      Remediated by Municipalities
                    </span>
                    <p className="text-3xl font-bold mt-1 text-emerald-600">
                      {stats.userImpact.reportsResolved}
                    </p>
                    <span className="text-[11px] theme-text-muted mt-1 block">
                      Successful cleanup operations
                    </span>
                  </div>

                  <div className="theme-card border-l-4 border-amber-500">
                    <span className="text-xs font-semibold theme-text-muted uppercase tracking-wider">
                      Community Confirmations
                    </span>
                    <p className="text-3xl font-bold mt-1 text-amber-600">
                      {stats.userImpact.confirmationsGiven}
                    </p>
                    <span className="text-[11px] theme-text-muted mt-1 block">
                      Corroborated nearby issues
                    </span>
                  </div>
                </div>

                {/* Real Earned Achievements */}
                <div className="theme-card">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-wider theme-text-muted">
                        Earned Civic Badges & Milestones
                      </h2>
                      <p className="text-xs theme-text-muted mt-0.5">
                        Awarded strictly based on verified database activity (no fake gamification)
                      </p>
                    </div>
                  </div>

                  {stats.userImpact.achievements.length === 0 ? (
                    <div className="p-8 text-center border-2 border-dashed rounded-xl">
                      <span className="text-3xl block mb-2">🌱</span>
                      <p className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        No badges earned yet
                      </p>
                      <p className="text-xs theme-text-muted mt-1 max-w-sm mx-auto">
                        Submit your first verified pollution report or corroborate community issues to earn your first civic badges.
                      </p>
                      <Link href="/report" className="theme-btn text-xs py-1.5 px-4 mt-4 inline-block">
                        File First Report
                      </Link>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {stats.userImpact.achievements.map((ach) => (
                        <div
                          key={ach.id}
                          className="p-4 rounded-xl border flex items-start gap-3 bg-black/5 dark:bg-white/5"
                          style={{ borderColor: "var(--border)" }}
                        >
                          <span className="text-2xl p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                            {BADGE_ICONS[ach.badgeKey] || "🏅"}
                          </span>
                          <div>
                            <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                              {ach.title}
                            </p>
                            <p className="text-xs theme-text-muted mt-0.5 leading-snug">
                              {ach.description}
                            </p>
                            <span className="text-[10px] theme-text-muted block mt-2">
                              Earned {new Date(ach.earnedAt).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
