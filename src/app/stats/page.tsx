"use client";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

interface Stats {
  totalReports: number;
  resolvedCount: number;
  resolvedPercent: number;
  avgResolutionHours: number;
  recurringHotspots: number;
  categoryBreakdown: Array<{ category: string; count: number }>;
  severityBreakdown: Array<{ severity: string; count: number }>;
  recentReports: Array<{ id: number; category: string; severity: string; status: string; createdAt: string; description: string | null }>;
  topHotspots: Array<{ id: number; centerLat: number; centerLng: number; reportCount: number }>;
  trendData: Array<{ date: string; count: number }>;
}

const CATEGORY_ICONS: Record<string, string> = {
  garbage: "🗑️", burning: "🔥", dust: "💨", smoke: "🚗", drainage: "🌊", industrial: "🏭", other: "⚠️",
};

const CATEGORY_COLORS: Record<string, string> = {
  garbage: "#78716c", burning: "#f97316", dust: "#d97706", smoke: "#6b7280",
  drainage: "#0ea5e9", industrial: "#8b5cf6", other: "#94a3b8",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e", medium: "#f59e0b", high: "#f97316", critical: "#ef4444",
};

function BarChart({ data, colorFn, labelFn }: {
  data: Array<{ label: string; count: number }>;
  colorFn: (label: string) => string;
  labelFn: (label: string) => string;
}) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="space-y-2">
      {data.map(item => (
        <div key={item.label}>
          <div className="flex justify-between text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            <span>{labelFn(item.label)}</span>
            <span className="font-bold">{item.count}</span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(item.count / max) * 100}%`, backgroundColor: colorFn(item.label) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) return <p className="text-xs theme-text-muted text-center py-4">No trend data yet</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  const chartHeight = 80;

  return (
    <div style={{ overflowX: "auto" }}>
      <svg width={Math.max(300, data.length * 20)} height={chartHeight + 30} style={{ display: "block" }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(frac => (
          <line
            key={frac}
            x1={0}
            x2={Math.max(300, data.length * 20)}
            y1={chartHeight - frac * chartHeight}
            y2={chartHeight - frac * chartHeight}
            stroke="var(--border)"
            strokeWidth={0.5}
          />
        ))}
        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.count / max) * chartHeight;
          const barWidth = Math.max(14, (Math.max(300, data.length * 20) / data.length) - 2);
          const x = i * (Math.max(300, data.length * 20) / data.length);
          return (
            <g key={d.date}>
              <rect
                x={x + 1}
                y={chartHeight - barHeight}
                width={barWidth}
                height={barHeight}
                fill="var(--accent)"
                rx={2}
                opacity={0.8}
              />
              {i % 5 === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={chartHeight + 15}
                  textAnchor="middle"
                  fontSize={9}
                  fill="var(--text-muted)"
                >
                  {d.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export default function StatsPage() {
  const { t, i18n } = useTranslation();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  const locale = i18n.language || "en";
  const fmt = new Intl.NumberFormat(locale);

  useEffect(() => {
    fetch("/api/stats")
      .then(r => r.json())
      .then(data => { if (!data.error) setStats(data); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="page-container py-20 text-center">
        <span className="spinner" style={{ width: 40, height: 40, margin: "0 auto" }} />
        <p className="theme-text-muted mt-4">{t("common.loading")}</p>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="page-container py-20 text-center">
        <p className="theme-text-muted">{t("common.error")}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="page-container py-6">
        <div className="page-header">
          <h1 className="page-title">📈 {t("stats.title")}</h1>
          <p className="page-subtitle">{t("stats.subtitle")}</p>
        </div>

        {/* Hero stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            {
              label: t("stats.totalReports"),
              value: fmt.format(stats.totalReports),
              icon: "📋",
              color: "var(--accent)",
            },
            {
              label: t("stats.resolvedPercent"),
              value: `${stats.resolvedPercent}%`,
              icon: "✅",
              color: "#22c55e",
            },
            {
              label: t("stats.avgResolutionTime"),
              value: `${fmt.format(stats.avgResolutionHours)} ${t("stats.avgResolutionUnit")}`,
              icon: "⏱️",
              color: "#f59e0b",
            },
            {
              label: t("stats.recurringHotspots"),
              value: fmt.format(stats.recurringHotspots),
              icon: "🔄",
              color: "#ef4444",
            },
          ].map(item => (
            <div key={item.label} className="theme-card text-center">
              <div className="text-3xl mb-1">{item.icon}</div>
              <p className="text-3xl font-black" style={{ color: item.color }}>{item.value}</p>
              <p className="text-xs theme-text-muted mt-1">{item.label}</p>
            </div>
          ))}
        </div>

        {/* Resolution progress */}
        <div className="theme-card mb-6">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold" style={{ color: "var(--text-primary)" }}>Overall Resolution Progress</h3>
            <span className="font-bold" style={{ color: "#22c55e" }}>{stats.resolvedPercent}%</span>
          </div>
          <div className="progress-bar" style={{ height: 12 }}>
            <div
              className="progress-fill"
              style={{ width: `${stats.resolvedPercent}%`, backgroundColor: "#22c55e" }}
            />
          </div>
          <div className="flex justify-between text-xs theme-text-muted mt-1">
            <span>{stats.resolvedCount} resolved</span>
            <span>{stats.totalReports} total</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          {/* Category breakdown */}
          <div className="theme-card">
            <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              📊 {t("stats.categoryBreakdown")}
            </h3>
            <BarChart
              data={stats.categoryBreakdown.map(c => ({ label: c.category, count: c.count }))}
              colorFn={label => CATEGORY_COLORS[label] || "#6b7280"}
              labelFn={label => `${CATEGORY_ICONS[label] || ""} ${t(`categories.${label}`)}`}
            />
          </div>

          {/* Severity breakdown */}
          <div className="theme-card">
            <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              ⚠️ {t("stats.severityBreakdown")}
            </h3>
            <BarChart
              data={["critical", "high", "medium", "low"]
                .map(sev => {
                  const found = stats.severityBreakdown.find(s => s.severity === sev);
                  return { label: sev, count: found?.count || 0 };
                })
                .filter(s => s.count > 0)}
              colorFn={label => SEVERITY_COLORS[label] || "#f59e0b"}
              labelFn={label => t(`severity.${label}`)}
            />
          </div>
        </div>

        {/* 30-day trend */}
        <div className="theme-card mb-6">
          <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            📈 {t("stats.trend")}
          </h3>
          <TrendChart data={stats.trendData} />
        </div>

        {/* Top recurring hotspots */}
        {stats.topHotspots.length > 0 && (
          <div className="theme-card mb-6">
            <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
              🔴 {t("stats.topHotspots")}
            </h3>
            <div className="space-y-3">
              {stats.topHotspots.map((hs, idx) => (
                <div key={hs.id} className="flex items-center gap-3">
                  <div
                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"][idx] || "#6b7280" }}
                  >
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                        📍 {hs.centerLat.toFixed(4)}, {hs.centerLng.toFixed(4)}
                      </span>
                      <span
                        className="text-sm font-bold"
                        style={{ color: "#ef4444" }}
                      >
                        {hs.reportCount} reports
                      </span>
                    </div>
                    <div className="progress-bar mt-1" style={{ height: 5 }}>
                      <div
                        className="progress-fill"
                        style={{
                          width: `${(hs.reportCount / (stats.topHotspots[0]?.reportCount || 1)) * 100}%`,
                          backgroundColor: "#ef4444",
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent activity */}
        <div className="theme-card">
          <h3 className="font-bold mb-4" style={{ color: "var(--text-primary)" }}>
            🕐 {t("stats.recentActivity")}
          </h3>
          <div className="space-y-2">
            {stats.recentReports.slice(0, 8).map(report => (
              <div key={report.id} className="flex items-center gap-3 py-2 border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                <span className="text-xl">{CATEGORY_ICONS[report.category]}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                      {t(`categories.${report.category}`)}
                    </span>
                    <span className={`severity-${report.severity} text-xs px-1.5 py-0.5 rounded-full`}>
                      {t(`severity.${report.severity}`)}
                    </span>
                  </div>
                  {report.description && (
                    <p className="text-xs theme-text-muted truncate">{report.description}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-xs theme-text-muted block">
                    {new Date(report.createdAt).toLocaleDateString(locale)}
                  </span>
                  <span className="text-xs font-medium" style={{
                    color: report.status === "verified" ? "#22c55e" : report.status === "resolved" ? "#86efac" : "var(--text-muted)"
                  }}>
                    {t(`status.${report.status}`)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
