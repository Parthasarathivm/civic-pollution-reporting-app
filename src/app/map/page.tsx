"use client";
import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import dynamic from "next/dynamic";
import type { MapReport } from "@/components/MapView";

const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <div style={{ height: 500, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "var(--bg-secondary)", borderRadius: 12 }}><span className="theme-text-muted">Loading map...</span></div> }
);

const CATEGORIES = ["all", "garbage", "burning", "dust", "smoke", "drainage", "industrial", "other"] as const;
const STATUSES = ["all", "reported", "assigned", "inProgress", "resolved", "verified"] as const;

const CATEGORY_ICONS: Record<string, string> = {
  garbage: "🗑️", burning: "🔥", dust: "💨", smoke: "🚗", drainage: "🌊", industrial: "🏭", other: "⚠️",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e", medium: "#f59e0b", high: "#f97316", critical: "#ef4444",
};

export default function MapPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<MapReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<MapReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<MapReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [mapKey, setMapKey] = useState(0);

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    let filtered = [...reports];
    if (categoryFilter !== "all") filtered = filtered.filter(r => r.category === categoryFilter);
    if (statusFilter !== "all") filtered = filtered.filter(r => r.status === statusFilter);
    if (recurringOnly) filtered = filtered.filter(r => r.isRecurringHotspot);
    setFilteredReports(filtered);
    setMapKey(k => k + 1);
  }, [reports, categoryFilter, statusFilter, recurringOnly]);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports?limit=200");
      const data = await res.json();
      if (Array.isArray(data)) setReports(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const recurringCount = reports.filter(r => r.isRecurringHotspot).length;
  const criticalCount = reports.filter(r => r.severity === "critical").length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="page-container py-6">
        <div className="page-header">
          <h1 className="page-title">🗺️ {t("map.title")}</h1>
          <p className="page-subtitle">{t("map.subtitle")}</p>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { label: "Total", value: reports.length, color: "var(--accent)" },
            { label: "Critical", value: criticalCount, color: "#ef4444" },
            { label: "Recurring", value: recurringCount, color: "#f59e0b" },
            { label: "Resolved", value: reports.filter(r => r.status === "verified" || r.status === "resolved").length, color: "#22c55e" },
          ].map(stat => (
            <div key={stat.label} className="theme-card text-center py-3">
              <p className="text-2xl font-black" style={{ color: stat.color }}>{stat.value}</p>
              <p className="text-xs theme-text-muted">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="theme-card mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex-1 min-w-36">
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="theme-input text-sm"
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>
                    {c === "all" ? t("map.filterAll") : `${CATEGORY_ICONS[c]} ${t(`categories.${c}`)}`}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-36">
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="theme-input text-sm"
              >
                {STATUSES.map(s => (
                  <option key={s} value={s}>
                    {s === "all" ? "All Statuses" : t(`status.${s}`)}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={recurringOnly}
                onChange={e => setRecurringOnly(e.target.checked)}
                className="w-4 h-4 accent-red-500"
              />
              <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                🔄 {t("map.recurringOnly")}
              </span>
            </label>
            <button onClick={fetchReports} className="theme-btn-secondary text-sm">
              🔄 Refresh
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Map */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="theme-card h-96 flex items-center justify-center">
                <span className="spinner" />
              </div>
            ) : filteredReports.length === 0 ? (
              <div className="theme-card h-96 flex flex-col items-center justify-center text-center">
                <div className="text-5xl mb-3">🗺️</div>
                <p className="theme-text-muted">{t("map.noReports")}</p>
              </div>
            ) : (
              <MapView
                key={mapKey}
                reports={filteredReports}
                selectedReport={selectedReport}
                onSelectReport={setSelectedReport}
                height="520px"
              />
            )}

            {/* Legend */}
            <div className="theme-card mt-3">
              <p className="text-xs font-bold theme-text-muted mb-2 uppercase tracking-wider">{t("map.legend")}</p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(SEVERITY_COLORS).map(([sev, color]) => (
                  <div key={sev} className="flex items-center gap-1">
                    <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: color }} />
                    <span className="text-xs theme-text-muted">{t(`severity.${sev}`)}</span>
                  </div>
                ))}
                <div className="flex items-center gap-1">
                  <div style={{ width: 14, height: 14, borderRadius: "50%", backgroundColor: "#ef444433", border: "2px solid #ef4444", animation: "pulse-dot 2s infinite" }} />
                  <span className="text-xs theme-text-muted">{t("map.recurringHotspot")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Report list */}
          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            <p className="text-sm font-bold theme-text-muted">
              {t("map.reportCount", { count: filteredReports.length })}
            </p>
            {filteredReports.slice(0, 30).map(report => (
              <div
                key={report.id}
                onClick={() => setSelectedReport(report)}
                className="theme-card cursor-pointer hover:scale-[1.01] transition-transform"
                style={{
                  borderColor: selectedReport?.id === report.id ? "var(--accent)" : "var(--border)",
                  borderWidth: selectedReport?.id === report.id ? 2 : 1,
                }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{CATEGORY_ICONS[report.category]}</span>
                      <span className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
                        {t(`categories.${report.category}`)}
                      </span>
                      {report.isRecurringHotspot && (
                        <span className="text-xs text-red-500 font-bold">🔄</span>
                      )}
                    </div>
                    {report.description && (
                      <p className="text-xs theme-text-muted truncate">{report.description}</p>
                    )}
                    <p className="text-xs theme-text-muted mt-1">
                      {new Date(report.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`severity-${report.severity} px-2 py-0.5 rounded-full text-xs font-bold`}>
                      {t(`severity.${report.severity}`)}
                    </span>
                    <span className="text-xs theme-text-muted">{t(`status.${report.status}`)}</span>
                  </div>
                </div>
                {report.photoBeforeUrl && (
                  <img src={report.photoBeforeUrl} alt="" className="w-full h-20 object-cover rounded-lg mt-2" />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
