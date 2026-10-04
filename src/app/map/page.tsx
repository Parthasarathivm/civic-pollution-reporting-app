"use client";
import { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import type { MapReport } from "@/components/MapView";
import { useAppStore } from "@/store/appStore";
import Link from "next/link";

const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 520,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "var(--bg-secondary)",
          borderRadius: 12,
        }}
      >
        <span className="theme-text-muted flex items-center gap-2 text-sm">
          <span className="spinner" />
          <span>Loading interactive civic map...</span>
        </span>
      </div>
    ),
  }
);

const CATEGORIES = [
  "all",
  "garbage",
  "burning",
  "dust",
  "smoke",
  "drainage",
  "industrial",
  "plastic",
  "sewage",
  "noise",
  "soil",
  "other",
] as const;

const STATUSES = [
  "all",
  "submitted",
  "under_review",
  "verified",
  "assigned",
  "in_progress",
  "resolved",
] as const;

const SEVERITIES = ["all", "low", "medium", "high", "critical"] as const;

const TIME_RANGES = [
  { id: "all", label: "All Time" },
  { id: "7d", label: "Past 7 Days" },
  { id: "30d", label: "Past 30 Days" },
];

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

export default function MapPage() {
  const { user, token } = useAppStore();

  const [reports, setReports] = useState<MapReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MapReport | null>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [timeFilter, setTimeFilter] = useState("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);

  useEffect(() => {
    async function fetchReports() {
      setLoading(true);
      try {
        const res = await fetch("/api/reports?limit=250", {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const data = await res.json();
        if (Array.isArray(data)) setReports(data);
      } catch (e) {
        console.error("Error fetching map reports:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchReports();
  }, [token]);

  // Derive filtered reports with useMemo (NO synchronous setState in effect)
  const filteredReports = useMemo(() => {
    const now = new Date().getTime();
    return reports.filter((r) => {
      if (categoryFilter !== "all" && r.category !== categoryFilter) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (severityFilter !== "all" && r.severity !== severityFilter) return false;
      if (recurringOnly && !r.isRecurringHotspot) return false;

      if (timeFilter === "7d") {
        const reportTime = new Date(r.createdAt).getTime();
        if (now - reportTime > 7 * 24 * 60 * 60 * 1000) return false;
      } else if (timeFilter === "30d") {
        const reportTime = new Date(r.createdAt).getTime();
        if (now - reportTime > 30 * 24 * 60 * 60 * 1000) return false;
      }

      return true;
    });
  }, [reports, categoryFilter, statusFilter, severityFilter, recurringOnly, timeFilter]);

  const recurringCount = useMemo(
    () => reports.filter((r) => r.isRecurringHotspot).length,
    [reports]
  );
  const criticalCount = useMemo(
    () => reports.filter((r) => r.severity === "critical").length,
    [reports]
  );
  const resolvedCount = useMemo(
    () => reports.filter((r) => r.status === "resolved" || r.status === "verified").length,
    [reports]
  );

  return (
    <div className="min-h-screen py-8">
      <div className="page-container">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🗺️</span>
              <span
                className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
              >
                Geographic Environmental Telemetry
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
              Interactive Pollution & Hotspot Map
            </h1>
            <p className="text-xs theme-text-muted mt-1">
              Spatial visualization of citizen observations, clustered hotspots, and municipal remediation status.
            </p>
          </div>

          <Link href="/report" className="theme-btn text-xs py-2 px-4 self-start flex items-center gap-1.5">
            <span>➕ Report Pollution Here</span>
          </Link>
        </div>

        {/* Quick Stats Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="theme-card text-center py-3">
            <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
              {reports.length}
            </p>
            <p className="text-xs theme-text-muted">Total Plotted</p>
          </div>
          <div className="theme-card text-center py-3">
            <p className="text-2xl font-bold text-red-500">
              {criticalCount}
            </p>
            <p className="text-xs theme-text-muted">Critical Hazards</p>
          </div>
          <div className="theme-card text-center py-3">
            <p className="text-2xl font-bold text-amber-500">
              {recurringCount}
            </p>
            <p className="text-xs theme-text-muted">Active Hotspots</p>
          </div>
          <div className="theme-card text-center py-3">
            <p className="text-2xl font-bold text-emerald-500">
              {resolvedCount}
            </p>
            <p className="text-xs theme-text-muted">Remediated</p>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="theme-card mb-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {/* Category */}
            <div>
              <label className="block text-[11px] font-semibold theme-text-muted mb-1">
                Category
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="theme-input text-xs w-full"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c === "all" ? "All Categories" : `${CATEGORY_ICONS[c] || ""} ${c}`}
                  </option>
                ))}
              </select>
            </div>

            {/* Severity */}
            <div>
              <label className="block text-[11px] font-semibold theme-text-muted mb-1">
                Severity
              </label>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="theme-input text-xs w-full"
              >
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Severities" : s.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-[11px] font-semibold theme-text-muted mb-1">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="theme-input text-xs w-full"
              >
                {STATUSES.map((st) => (
                  <option key={st} value={st}>
                    {st === "all" ? "All Statuses" : st.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Time Window */}
            <div>
              <label className="block text-[11px] font-semibold theme-text-muted mb-1">
                Time Window
              </label>
              <select
                value={timeFilter}
                onChange={(e) => setTimeFilter(e.target.value)}
                className="theme-input text-xs w-full"
              >
                {TIME_RANGES.map((tr) => (
                  <option key={tr.id} value={tr.id}>
                    {tr.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Hotspot Toggle */}
            <div className="flex items-end">
              <button
                type="button"
                onClick={() => setRecurringOnly(!recurringOnly)}
                className={`w-full py-2 px-3 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  recurringOnly
                    ? "bg-amber-500/20 text-amber-600 border-amber-400"
                    : "border-black/10 dark:border-white/10 theme-text-muted hover:bg-black/5"
                }`}
              >
                <span>🔥</span>
                <span>{recurringOnly ? "Hotspots Only" : "Show Hotspots"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Map Container + Selected Detail Drawer */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="theme-card p-2">
              <MapView
                reports={filteredReports}
                selectedReport={selectedReport}
                onSelectReport={setSelectedReport}
                height="560px"
              />
            </div>
          </div>

          {/* Side Drawer: Selected Report / Legend */}
          <div className="space-y-4">
            {selectedReport ? (
              <div className="theme-card space-y-3 animate-fade-in border-2" style={{ borderColor: "var(--accent)" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                      CP-{selectedReport.id}
                    </span>
                    <h3 className="font-bold text-base capitalize mt-1" style={{ color: "var(--text-primary)" }}>
                      {CATEGORY_ICONS[selectedReport.category] || "⚠️"} {selectedReport.category} Hazard
                    </h3>
                  </div>
                  <button
                    onClick={() => setSelectedReport(null)}
                    className="p-1 text-xs theme-text-muted hover:bg-black/5 rounded"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5 text-[11px]">
                  <span className="font-bold px-2 py-0.5 rounded-full uppercase bg-black/5">
                    {selectedReport.severity}
                  </span>
                  <span className="px-2 py-0.5 rounded-full capitalize bg-sky-500/10 text-sky-600">
                    {selectedReport.status.replace("_", " ")}
                  </span>
                  {selectedReport.isRecurringHotspot && (
                    <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-600 font-bold">
                      🔥 Recurring Hotspot
                    </span>
                  )}
                </div>

                <p className="text-xs theme-text-muted leading-relaxed">
                  {selectedReport.description || "Reported environmental issue."}
                </p>

                <div className="text-xs space-y-1 pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <p className="theme-text-muted truncate">
                    📍 {selectedReport.address || `GPS: ${selectedReport.lat.toFixed(4)}, ${selectedReport.lng.toFixed(4)}`}
                  </p>
                  <p className="theme-text-muted text-[11px]">
                    Logged: {new Date(selectedReport.createdAt).toLocaleDateString()}
                  </p>
                </div>

                <div className="pt-2">
                  <Link
                    href={`/report/${selectedReport.id}`}
                    className="theme-btn text-xs w-full block text-center py-2"
                  >
                    Open Full Case File →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="theme-card text-center py-10 space-y-2">
                <span className="text-3xl block">📌</span>
                <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                  Select a Map Pin
                </p>
                <p className="text-xs theme-text-muted max-w-xs mx-auto">
                  Click any marker on the map to inspect case details, severity, and remediation timeline.
                </p>
              </div>
            )}

            {/* Privacy Protection Notice */}
            <div
              className="p-3.5 rounded-xl border text-xs space-y-1"
              style={{
                backgroundColor: "var(--bg-secondary)",
                borderColor: "var(--border)",
              }}
            >
              <div className="flex items-center gap-1.5 font-bold" style={{ color: "var(--text-primary)" }}>
                <span>🔒</span>
                <span>Address Privacy Protection</span>
              </div>
              <p className="theme-text-muted leading-relaxed text-[11px]">
                To safeguard citizen confidentiality, exact residential door numbers are masked. Only approximate intersection coordinates and public landmark names are visualized.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
