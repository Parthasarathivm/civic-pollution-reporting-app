"use client";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/appStore";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { MapReport } from "@/components/MapView";

const MapView = dynamic(
  () => import("@/components/MapView").then((m) => m.MapView),
  { ssr: false, loading: () => <div style={{ height: 400, backgroundColor: "var(--bg-secondary)", borderRadius: 12 }} /> }
);

interface Report {
  id: number;
  category: string;
  severity: string;
  lat: number;
  lng: number;
  status: string;
  description: string | null;
  isRecurringHotspot: boolean;
  photoBeforeUrl: string | null;
  photoAfterUrl: string | null;
  assignedWorkerId: number | null;
  wardId: number | null;
  createdAt: string;
  resolvedAt: string | null;
  aiVerificationResult: string | null;
}

const SEVERITY_SCORE: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 5 };
const CATEGORY_ICONS: Record<string, string> = {
  garbage: "🗑️", burning: "🔥", dust: "💨", smoke: "🚗", drainage: "🌊", industrial: "🏭", other: "⚠️",
};
const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e", medium: "#f59e0b", high: "#f97316", critical: "#ef4444",
};
const STATUS_FLOW = ["reported", "assigned", "inProgress", "resolved", "verified"];

function priorityScore(r: Report): number {
  const sev = SEVERITY_SCORE[r.severity] || 2;
  const hot = r.isRecurringHotspot ? 2 : 1;
  return sev * hot;
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user, token } = useAppStore();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "mine">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [routeIds, setRouteIds] = useState<number[]>([]);
  const [generatingRoute, setGeneratingRoute] = useState(false);
  const [routeGenerated, setRouteGenerated] = useState(false);
  const [mapKey, setMapKey] = useState(0);
  const [verifyModal, setVerifyModal] = useState<Report | null>(null);
  const [afterPhoto, setAfterPhoto] = useState<File | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ result: string; confidence: number; reasoning: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const isWorkerOrAdmin = user?.role === "worker" || user?.role === "admin";

  useEffect(() => {
    if (token) fetchReports();
  }, [token]);

  async function fetchReports() {
    setLoading(true);
    try {
      const res = await fetch("/api/reports?limit=100");
      const data = await res.json();
      if (Array.isArray(data)) {
        setReports(data.sort((a: Report, b: Report) => priorityScore(b) - priorityScore(a)));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function updateStatus(reportId: number, newStatus: string, extra?: Record<string, unknown>) {
    setUpdatingId(reportId);
    try {
      const body: Record<string, unknown> = { status: newStatus, ...extra };
      if (newStatus === "resolved" || newStatus === "verified") {
        body.resolvedAt = new Date().toISOString();
      }
      const res = await fetch(`/api/reports/${reportId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        await fetchReports();
        if (selectedReport?.id === reportId) {
          const updated = await res.json();
          setSelectedReport(updated);
        }
      }
    } catch (e) { console.error(e); }
    finally { setUpdatingId(null); }
  }

  async function generateRoute() {
    setGeneratingRoute(true);
    try {
      const res = await fetch("/api/routes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.orderedReportIds) {
        setRouteIds(data.orderedReportIds);
        setRouteGenerated(true);
        setMapKey(k => k + 1);
        await fetchReports();
      }
    } catch (e) { console.error(e); }
    finally { setGeneratingRoute(false); }
  }

  async function handleVerify() {
    if (!verifyModal || !afterPhoto) return;
    setVerifying(true);
    try {
      // Upload after photo
      const fd = new FormData();
      fd.append("file", afterPhoto);
      const upRes = await fetch("/api/upload", { method: "POST", body: fd });
      const upData = await upRes.json();
      const afterUrl = upData.url;

      // Update report with after photo
      await fetch(`/api/reports/${verifyModal.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ photoAfterUrl: afterUrl }),
      });

      // AI verification
      const verRes = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ beforeUrl: verifyModal.photoBeforeUrl, afterUrl }),
      });
      const verData = await verRes.json();
      setVerifyResult(verData);

      // Auto-update status based on AI
      if (verData.result === "resolved") {
        await updateStatus(verifyModal.id, "verified", { photoAfterUrl: afterUrl, aiVerificationResult: verData.result });
      } else {
        await updateStatus(verifyModal.id, "resolved", { photoAfterUrl: afterUrl, aiVerificationResult: verData.result });
      }
    } catch (e) { console.error(e); }
    finally { setVerifying(false); }
  }

  const filteredReports = reports.filter(r => {
    if (activeTab === "mine" && r.assignedWorkerId !== user?.id) return false;
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    return true;
  });

  const mapReports: MapReport[] = filteredReports.map(r => ({ ...r }));

  const stats = {
    total: reports.length,
    pending: reports.filter(r => r.status === "reported" || r.status === "assigned").length,
    inProgress: reports.filter(r => r.status === "inProgress").length,
    resolved: reports.filter(r => r.status === "resolved" || r.status === "verified").length,
  };

  if (!user) {
    return (
      <div className="page-container py-20 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <p className="theme-text-muted mb-4">{t("dashboard.loginRequired")}</p>
        <Link href="/login" className="theme-btn">{t("nav.login")}</Link>
      </div>
    );
  }

  if (!isWorkerOrAdmin) {
    return (
      <div className="page-container py-20 text-center">
        <div className="text-5xl mb-4">🚫</div>
        <p className="theme-text-muted mb-4">{t("dashboard.loginRequired")}</p>
        <Link href="/" className="theme-btn">{t("common.back")}</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg-primary)" }}>
      <div className="page-container py-6">
        <div className="page-header">
          <h1 className="page-title">📊 {t("dashboard.title")}</h1>
          <p className="page-subtitle">{t("dashboard.subtitle")}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { label: t("dashboard.totalReports"), value: stats.total, color: "var(--accent)" },
            { label: t("dashboard.pendingReports"), value: stats.pending, color: "#f59e0b" },
            { label: "In Progress", value: stats.inProgress, color: "#f97316" },
            { label: t("dashboard.resolvedToday"), value: stats.resolved, color: "#22c55e" },
          ].map(s => (
            <div key={s.label} className="theme-card text-center py-3">
              <p className="text-2xl font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs theme-text-muted">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Map */}
        <div className="theme-card mb-5">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <h2 className="font-bold" style={{ color: "var(--text-primary)" }}>
              🗺️ Live Map {routeGenerated && `— ${t("dashboard.routeStops", { count: routeIds.length })}`}
            </h2>
            <button
              onClick={generateRoute}
              disabled={generatingRoute}
              className="theme-btn"
            >
              {generatingRoute ? (
                <><span className="spinner" />{t("dashboard.generatingRoute")}</>
              ) : (
                `🚛 ${t("dashboard.generateRoute")}`
              )}
            </button>
          </div>
          {routeGenerated && (
            <div className="mb-3 p-2 rounded-lg text-sm font-medium" style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}>
              ✅ {t("dashboard.routeGenerated")} — {t("dashboard.routeStops", { count: routeIds.length })} in optimized order
            </div>
          )}
          <MapView
            key={mapKey}
            reports={mapReports}
            selectedReport={selectedReport as MapReport | null}
            onSelectReport={r => setSelectedReport(r as Report | null)}
            routeIds={routeGenerated ? routeIds : undefined}
            height="400px"
          />
        </div>

        {/* Reports list + detail */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* List */}
          <div className="lg:col-span-2">
            <div className="theme-card mb-3">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setActiveTab("all")}
                  className={activeTab === "all" ? "theme-btn text-sm" : "theme-btn-secondary text-sm"}
                >
                  {t("dashboard.allReports")}
                </button>
                <button
                  onClick={() => setActiveTab("mine")}
                  className={activeTab === "mine" ? "theme-btn text-sm" : "theme-btn-secondary text-sm"}
                >
                  {t("dashboard.myAssignments")}
                </button>
              </div>
              <select
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                className="theme-input text-sm"
              >
                <option value="all">All Statuses</option>
                {STATUS_FLOW.map(s => <option key={s} value={s}>{t(`status.${s}`)}</option>)}
              </select>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {loading ? (
                <div className="theme-card text-center py-8"><span className="spinner" /></div>
              ) : filteredReports.length === 0 ? (
                <div className="theme-card text-center py-8 theme-text-muted">{t("dashboard.noReports")}</div>
              ) : filteredReports.map((report, idx) => (
                <div
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className="theme-card cursor-pointer transition-all hover:scale-[1.01]"
                  style={{
                    borderColor: selectedReport?.id === report.id ? "var(--accent)" : "var(--border)",
                    borderWidth: selectedReport?.id === report.id ? 2 : 1,
                  }}
                >
                  <div className="flex items-start gap-2">
                    {routeGenerated && routeIds.includes(report.id) && (
                      <span className="text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center text-white flex-shrink-0" style={{ backgroundColor: "var(--accent)", fontSize: 10 }}>
                        {routeIds.indexOf(report.id) + 1}
                      </span>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span>{CATEGORY_ICONS[report.category]}</span>
                        <span className="text-sm font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                          {t(`categories.${report.category}`)}
                        </span>
                        {report.isRecurringHotspot && <span className="text-red-500 text-xs">🔄</span>}
                      </div>
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className={`severity-${report.severity} text-xs px-1.5 py-0.5 rounded-full`}>
                          {t(`severity.${report.severity}`)}
                        </span>
                        <span className="text-xs theme-text-muted">{t(`status.${report.status}`)}</span>
                        <span className="text-xs theme-text-muted font-bold">★ {priorityScore(report).toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3">
            {selectedReport ? (
              <div className="theme-card">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                      {CATEGORY_ICONS[selectedReport.category]} {t(`categories.${selectedReport.category}`)}
                    </h3>
                    <div className="flex gap-2 mt-1">
                      <span className={`severity-${selectedReport.severity} px-2 py-0.5 rounded-full text-xs`}>
                        {t(`severity.${selectedReport.severity}`)}
                      </span>
                      <span className="text-xs theme-text-muted">{t(`status.${selectedReport.status}`)}</span>
                      {selectedReport.isRecurringHotspot && (
                        <span className="text-red-500 text-xs font-bold">🔄 Recurring Hotspot</span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs theme-text-muted"># {selectedReport.id}</span>
                </div>

                {/* Status progress */}
                <div className="flex items-center gap-1 mb-4 overflow-x-auto pb-2">
                  {STATUS_FLOW.map((step, idx) => {
                    const currentIdx = STATUS_FLOW.indexOf(selectedReport.status);
                    const isDone = idx < currentIdx;
                    const isActive = idx === currentIdx;
                    return (
                      <div key={step} className="flex items-center">
                        <div className={`status-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                          <div className="status-circle">
                            {isDone ? "✓" : idx + 1}
                          </div>
                          <span className="text-xs whitespace-nowrap" style={{ color: isActive ? "var(--accent)" : isDone ? "var(--success)" : "var(--text-muted)" }}>
                            {t(`status.${step}`)}
                          </span>
                        </div>
                        {idx < STATUS_FLOW.length - 1 && (
                          <div className="w-4 h-px mx-1 flex-shrink-0" style={{ backgroundColor: idx < currentIdx ? "var(--success)" : "var(--border)" }} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {selectedReport.description && (
                  <p className="text-sm theme-text-muted mb-3">{selectedReport.description}</p>
                )}

                <div className="text-xs theme-text-muted mb-4">
                  📍 {selectedReport.lat.toFixed(4)}, {selectedReport.lng.toFixed(4)} ·{" "}
                  {new Date(selectedReport.createdAt).toLocaleDateString()}
                  {selectedReport.resolvedAt && ` · Resolved ${new Date(selectedReport.resolvedAt).toLocaleDateString()}`}
                </div>

                {/* Photos */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {selectedReport.photoBeforeUrl && (
                    <div>
                      <p className="text-xs font-bold theme-text-muted mb-1">{t("verification.beforePhoto")}</p>
                      <img src={selectedReport.photoBeforeUrl} alt="Before" className="w-full h-32 object-cover rounded-lg" />
                    </div>
                  )}
                  {selectedReport.photoAfterUrl ? (
                    <div>
                      <p className="text-xs font-bold theme-text-muted mb-1">{t("verification.afterPhoto")}</p>
                      <img src={selectedReport.photoAfterUrl} alt="After" className="w-full h-32 object-cover rounded-lg" />
                    </div>
                  ) : (
                    selectedReport.status !== "verified" && selectedReport.status !== "resolved" && (
                      <div className="border-2 border-dashed rounded-lg h-32 flex items-center justify-center" style={{ borderColor: "var(--border)" }}>
                        <span className="text-xs theme-text-muted text-center px-2">After photo will appear here</span>
                      </div>
                    )
                  )}
                </div>

                {selectedReport.aiVerificationResult && (
                  <div className="mb-4 p-2 rounded-lg text-sm" style={{
                    backgroundColor: selectedReport.aiVerificationResult === "resolved" ? "#dcfce7" : "#fee2e2",
                    color: selectedReport.aiVerificationResult === "resolved" ? "#15803d" : "#dc2626",
                  }}>
                    🤖 AI: {selectedReport.aiVerificationResult === "resolved" ? "✅ Resolved" : "❌ Not Resolved"}
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  {selectedReport.status === "reported" && (
                    <button
                      onClick={() => updateStatus(selectedReport.id, "assigned", { assignedWorkerId: user?.id })}
                      disabled={updatingId === selectedReport.id}
                      className="theme-btn text-sm"
                    >
                      {updatingId === selectedReport.id ? <span className="spinner" /> : null}
                      {t("dashboard.assignToMe")}
                    </button>
                  )}
                  {selectedReport.status === "assigned" && (
                    <button
                      onClick={() => updateStatus(selectedReport.id, "inProgress")}
                      disabled={updatingId === selectedReport.id}
                      className="theme-btn text-sm"
                    >
                      {t("dashboard.markInProgress")}
                    </button>
                  )}
                  {(selectedReport.status === "inProgress" || selectedReport.status === "assigned") && (
                    <button
                      onClick={() => setVerifyModal(selectedReport)}
                      className="theme-btn text-sm"
                      style={{ backgroundColor: "#22c55e" }}
                    >
                      📷 {t("dashboard.uploadAfterPhoto")}
                    </button>
                  )}
                  {selectedReport.status === "resolved" && (
                    <button
                      onClick={() => updateStatus(selectedReport.id, "verified")}
                      disabled={updatingId === selectedReport.id}
                      className="theme-btn text-sm"
                      style={{ backgroundColor: "#22c55e" }}
                    >
                      ✅ {t("dashboard.verifyResolution")}
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="theme-card h-64 flex items-center justify-center text-center">
                <div>
                  <div className="text-4xl mb-2">👆</div>
                  <p className="theme-text-muted text-sm">Select a report from the list to view details and take action</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Verify Modal */}
      {verifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: "rgba(0,0,0,0.6)" }}>
          <div className="theme-card max-w-lg w-full" style={{ backgroundColor: "var(--bg-card)" }}>
            <h3 className="font-bold text-lg mb-4" style={{ color: "var(--text-primary)" }}>
              {t("verification.title")}
            </h3>

            <div className="grid grid-cols-2 gap-3 mb-4">
              {verifyModal.photoBeforeUrl && (
                <div>
                  <p className="text-xs font-bold theme-text-muted mb-1">{t("verification.beforePhoto")}</p>
                  <img src={verifyModal.photoBeforeUrl} alt="Before" className="w-full h-32 object-cover rounded-lg" />
                </div>
              )}
              <div>
                <p className="text-xs font-bold theme-text-muted mb-1">{t("verification.afterPhoto")}</p>
                <label className="block">
                  <div className="border-2 border-dashed rounded-lg h-32 flex items-center justify-center cursor-pointer hover:bg-opacity-50 transition-colors" style={{ borderColor: afterPhoto ? "var(--success)" : "var(--border)", backgroundColor: "var(--bg-secondary)" }}>
                    {afterPhoto ? (
                      <img src={URL.createObjectURL(afterPhoto)} alt="After preview" className="h-28 object-cover rounded" />
                    ) : (
                      <span className="text-xs theme-text-muted text-center px-2">📷 {t("verification.uploadAfter")}</span>
                    )}
                  </div>
                  <input type="file" accept="image/*" capture="environment" onChange={e => setAfterPhoto(e.target.files?.[0] || null)} className="hidden" />
                </label>
              </div>
            </div>

            {verifyResult && (
              <div className="mb-4 p-3 rounded-lg" style={{
                backgroundColor: verifyResult.result === "resolved" ? "#dcfce7" : verifyResult.result === "uncertain" ? "#fef9c3" : "#fee2e2",
                color: verifyResult.result === "resolved" ? "#15803d" : verifyResult.result === "uncertain" ? "#854d0e" : "#dc2626",
              }}>
                <p className="font-bold text-sm">
                  🤖 {t("verification.aiSuggestion")}: {t(`verification.${verifyResult.result === "not_resolved" ? "notResolved" : verifyResult.result}`)}
                  {" "}({Math.round(verifyResult.confidence * 100)}%)
                </p>
                <p className="text-xs mt-1">{verifyResult.reasoning}</p>
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleVerify}
                disabled={!afterPhoto || verifying}
                className="theme-btn"
              >
                {verifying ? <><span className="spinner" />{t("verification.analyzing")}</> : `🤖 ${t("dashboard.verifyResolution")}`}
              </button>
              <button onClick={() => { setVerifyModal(null); setAfterPhoto(null); setVerifyResult(null); }} className="theme-btn-secondary">
                {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
