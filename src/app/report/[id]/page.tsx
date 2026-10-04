"use client";
import { useState, useEffect, use } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/appStore";
import { isStaffRole } from "@/lib/auth";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface EvidenceItem {
  id: number;
  photoUrl: string;
  caption: string | null;
  evidenceType: string;
  createdAt: string;
}

interface HistoryItem {
  id: number;
  oldStatus: string | null;
  newStatus: string;
  notes: string | null;
  createdAt: string;
  changedByName: string | null;
}

interface AssignmentItem {
  id: number;
  departmentName: string | null;
  teamName: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  assignedByName: string | null;
}

interface ReportDetail {
  id: number;
  displayId: string;
  userId: number | null;
  category: string;
  severity: string;
  priority: string;
  lat: number;
  lng: number;
  address: string | null;
  wardId: number | null;
  photoBeforeUrl: string | null;
  photoAfterUrl: string | null;
  description: string | null;
  status: string;
  clusterId: number | null;
  isRecurringHotspot: boolean;
  aiConfidence: number | null;
  aiVerificationResult: string | null;
  assignedWorkerId: number | null;
  assignedDepartmentId: number | null;
  assignedTeamId: number | null;
  resolutionNotes: string | null;
  resolutionDepartment: string | null;
  resolvedByUserId: number | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  departmentName: string | null;
  departmentCode: string | null;
  teamName: string | null;
  reporterName: string | null;
  confirmationCount: number;
  hasConfirmed: boolean;
  evidence: EvidenceItem[];
  history: HistoryItem[];
  assignments: AssignmentItem[];
}

interface Department {
  id: number;
  name: string;
  code: string;
  teams: Array<{ id: number; name: string }>;
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

const SEVERITY_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  low: { bg: "rgba(34, 197, 94, 0.15)", text: "#22c55e", border: "rgba(34, 197, 94, 0.3)" },
  medium: { bg: "rgba(245, 158, 11, 0.15)", text: "#f59e0b", border: "rgba(245, 158, 11, 0.3)" },
  high: { bg: "rgba(249, 115, 22, 0.15)", text: "#f97316", border: "rgba(249, 115, 22, 0.3)" },
  critical: { bg: "rgba(239, 68, 68, 0.18)", text: "#ef4444", border: "rgba(239, 68, 68, 0.4)" },
};

const STATUS_LABELS: Record<string, { label: string; color: string; step: number }> = {
  submitted: { label: "Submitted", color: "#64748b", step: 1 },
  under_review: { label: "Under Review", color: "#3b82f6", step: 2 },
  verified: { label: "Verified", color: "#8b5cf6", step: 3 },
  assigned: { label: "Assigned", color: "#06b6d4", step: 4 },
  in_progress: { label: "In Progress", color: "#f59e0b", step: 5 },
  resolved: { label: "Resolved", color: "#10b981", step: 6 },
  rejected: { label: "Closed / Rejected", color: "#ef4444", step: 0 },
  duplicate: { label: "Duplicate", color: "#94a3b8", step: 0 },
  needs_information: { label: "Needs Information", color: "#d97706", step: 0 },
};

export default function ReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { user, token } = useAppStore();
  const isStaff = isStaffRole(user?.role);

  const [report, setReport] = useState<ReportDetail | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  // Authority actions state
  const [showActionModal, setShowActionModal] = useState(false);
  const [actionStatus, setActionStatus] = useState("");
  const [actionPriority, setActionPriority] = useState("");
  const [selectedDeptId, setSelectedDeptId] = useState<string>("");
  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [actionNotes, setActionNotes] = useState("");
  const [actionResolutionSummary, setActionResolutionSummary] = useState("");
  const [resolutionPhoto, setResolutionPhoto] = useState<File | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/reports/${id}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        if (res.status === 404) throw new Error("Report not found");
        throw new Error("Failed to load report");
      }
      const data = await res.json();
      setReport(data);
      setActionStatus(data.status);
      setActionPriority(data.priority);
      setSelectedDeptId(data.assignedDepartmentId ? String(data.assignedDepartmentId) : "");
      setSelectedTeamId(data.assignedTeamId ? String(data.assignedTeamId) : "");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error loading report");
    } finally {
      setLoading(false);
    }
  };

  const loadDepartments = async () => {
    try {
      const res = await fetch("/api/departments");
      if (res.ok) {
        const data = await res.json();
        setDepartments(data);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (!id) return;
    let ignore = false;
    fetch(`/api/reports/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 404) throw new Error("Report not found");
          throw new Error("Failed to load report");
        }
        return res.json();
      })
      .then((data) => {
        if (ignore) return;
        setReport(data);
        setActionStatus(data.status);
        setActionPriority(data.priority);
        setSelectedDeptId(data.assignedDepartmentId ? String(data.assignedDepartmentId) : "");
        setSelectedTeamId(data.assignedTeamId ? String(data.assignedTeamId) : "");
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (ignore) return;
        setError(err instanceof Error ? err.message : "Error loading report");
        setLoading(false);
      });

    if (isStaff) {
      fetch("/api/departments")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (ignore || !data) return;
          setDepartments(data);
        })
        .catch(console.error);
    }

    return () => {
      ignore = true;
    };
  }, [id, token, isStaff]);

  // Toggle community confirmation
  const handleToggleConfirm = async () => {
    if (!token) {
      alert("Please log in to confirm community issues.");
      router.push("/login");
      return;
    }
    if (!report) return;

    if (report.userId === user?.id) {
      alert("You cannot confirm an issue you submitted yourself.");
      return;
    }

    setConfirming(true);
    try {
      const method = report.hasConfirmed ? "DELETE" : "POST";
      const res = await fetch(`/api/reports/${report.id}/confirm`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Confirmation failed");

      setReport((prev) =>
        prev
          ? {
              ...prev,
              hasConfirmed: data.hasConfirmed,
              confirmationCount: data.confirmationCount,
            }
          : null
      );
      setConfirmMessage(
        data.hasConfirmed
          ? "Thank you! Your observation has been recorded to aid municipal prioritization."
          : "Your confirmation was removed."
      );
      setTimeout(() => setConfirmMessage(null), 3500);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Action failed");
    } finally {
      setConfirming(false);
    }
  };

  // Submit authority action / status update
  const handleAuthorityUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !report) return;
    setUpdating(true);

    try {
      let photoAfterUrl: string | undefined = undefined;

      // If resolving and photo was attached, upload it first
      if (resolutionPhoto) {
        const fd = new FormData();
        fd.append("file", resolutionPhoto);
        const upRes = await fetch("/api/upload", { method: "POST", body: fd });
        const upData = await upRes.json();
        if (!upRes.ok) throw new Error(upData.error || "Failed to upload photo");
        photoAfterUrl = upData.url;
      }

      const body: Record<string, unknown> = {
        status: actionStatus,
        priority: actionPriority,
        notes: actionNotes.trim() || undefined,
      };

      if (selectedDeptId) {
        body.assignedDepartmentId = parseInt(selectedDeptId);
      }
      if (selectedTeamId) {
        body.assignedTeamId = parseInt(selectedTeamId);
      }
      if (actionStatus === "resolved") {
        body.resolutionNotes = actionResolutionSummary.trim() || "Hazard remediation completed.";
        const deptObj = departments.find((d) => String(d.id) === selectedDeptId);
        body.resolutionDepartment = deptObj?.name || report.departmentName || "Municipal Operations";
      }
      if (photoAfterUrl) {
        body.photoAfterUrl = photoAfterUrl;
      }

      const patchRes = await fetch(`/api/reports/${report.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!patchRes.ok) {
        const pData = await patchRes.json();
        throw new Error(pData.error || "Update failed");
      }

      setShowActionModal(false);
      setResolutionPhoto(null);
      await loadReport();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen py-20 text-center">
        <span className="spinner mb-3 inline-block" />
        <p className="text-sm theme-text-muted">Loading report case details...</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="min-h-screen py-16">
        <div className="page-container max-w-2xl text-center">
          <div className="theme-card py-12">
            <span className="text-4xl block mb-2">⚠️</span>
            <h2 className="text-xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              {error || "Report Not Found"}
            </h2>
            <p className="text-xs theme-text-muted mb-6">
              The requested report ID could not be retrieved from the database.
            </p>
            <Link href="/dashboard" className="theme-btn">
              ← Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const sevStyle = SEVERITY_COLORS[report.severity] || SEVERITY_COLORS.medium;
  const currentStatusConfig = STATUS_LABELS[report.status] || {
    label: report.status,
    color: "#64748b",
    step: 1,
  };

  const lifecycleSteps = [
    { key: "submitted", label: "Submitted" },
    { key: "under_review", label: "Under Review" },
    { key: "verified", label: "Verified" },
    { key: "assigned", label: "Assigned" },
    { key: "in_progress", label: "In Progress" },
    { key: "resolved", label: "Resolved" },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="page-container max-w-5xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between mb-6">
          <Link
            href="/dashboard"
            className="text-xs font-semibold theme-text-muted hover:text-sky-500 transition-colors flex items-center gap-1"
          >
            ← Back to Dashboard
          </Link>

          {isStaff && (
            <button
              onClick={() => setShowActionModal(true)}
              className="theme-btn text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <span>⚙️ Manage Case</span>
            </button>
          )}
        </div>

        {/* Case Header Banner */}
        <div className="theme-card mb-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-black/10 dark:bg-white/10">
                  {report.displayId}
                </span>
                <span
                  className="text-xs font-bold px-2.5 py-1 rounded-full uppercase"
                  style={{
                    backgroundColor: sevStyle.bg,
                    color: sevStyle.text,
                    border: `1px solid ${sevStyle.border}`,
                  }}
                >
                  {report.severity} Severity
                </span>
                <span className="text-xs font-medium px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 capitalize">
                  Priority: {report.priority}
                </span>
                {report.isRecurringHotspot && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-600 flex items-center gap-1">
                    🔥 Hotspot Zone
                  </span>
                )}
              </div>

              <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2" style={{ color: "var(--text-primary)" }}>
                <span>{CATEGORY_ICONS[report.category] || "⚠️"}</span>
                <span className="capitalize">{report.category} Pollution Report</span>
              </h1>

              <p className="text-xs theme-text-muted mt-1.5 flex items-center gap-2">
                <span>📍 {report.address || `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}`}</span>
                <span>•</span>
                <span>
                  Logged {new Date(report.createdAt).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </p>
            </div>

            {/* Current Status Badge */}
            <div className="flex flex-col items-start md:items-end">
              <span className="text-[11px] uppercase tracking-wider theme-text-muted font-bold mb-1">
                Current Case Status
              </span>
              <span
                className="text-sm font-bold px-3.5 py-1.5 rounded-full text-white"
                style={{ backgroundColor: currentStatusConfig.color }}
              >
                {currentStatusConfig.label}
              </span>
            </div>
          </div>

          {/* Stepper Progress */}
          {currentStatusConfig.step > 0 && (
            <div className="mt-6 pt-5 border-t" style={{ borderColor: "var(--border)" }}>
              <div className="grid grid-cols-6 gap-1 md:gap-2 text-center">
                {lifecycleSteps.map((step, idx) => {
                  const stepNumber = idx + 1;
                  const isDone = currentStatusConfig.step >= stepNumber;
                  const isCurrent = currentStatusConfig.step === stepNumber;
                  return (
                    <div key={step.key} className="flex flex-col items-center">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 transition-all ${
                          isDone
                            ? "bg-emerald-500 text-white"
                            : "bg-black/10 dark:bg-white/10 theme-text-muted"
                        } ${isCurrent ? "ring-2 ring-emerald-400 ring-offset-2" : ""}`}
                      >
                        {isDone ? "✓" : stepNumber}
                      </div>
                      <span
                        className={`text-[10px] md:text-xs truncate w-full ${
                          isDone ? "font-bold text-emerald-600 dark:text-emerald-400" : "theme-text-muted"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Description, Evidence, Resolution */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description & Context */}
            <div className="theme-card">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-2 theme-text-muted">
                Issue Description
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>
                {report.description || "No detailed description was provided by the reporter."}
              </p>

              {/* Community Confirmation Section */}
              <div
                className="mt-5 p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                style={{
                  backgroundColor: "var(--bg-secondary)",
                  borderColor: "var(--border)",
                }}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <span className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                      {report.confirmationCount === 0
                        ? "No community confirmations yet"
                        : report.confirmationCount === 1
                        ? "1 community member confirmed this issue"
                        : `${report.confirmationCount} community members confirmed this issue`}
                    </span>
                  </div>
                  <p className="text-xs theme-text-muted mt-0.5">
                    Have you also observed this pollution hazard in your locality?
                  </p>
                </div>

                <button
                  onClick={handleToggleConfirm}
                  disabled={confirming}
                  className={`text-xs py-2 px-4 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                    report.hasConfirmed
                      ? "bg-emerald-600 text-white hover:bg-emerald-700"
                      : "theme-btn"
                  }`}
                >
                  {confirming ? (
                    <span className="spinner" />
                  ) : report.hasConfirmed ? (
                    <>
                      <span>✓</span>
                      <span>Confirmed by You</span>
                    </>
                  ) : (
                    <>
                      <span>👍</span>
                      <span>Confirm Issue</span>
                    </>
                  )}
                </button>
              </div>

              {confirmMessage && (
                <p className="text-xs text-emerald-600 mt-2 font-medium animate-fade-in">
                  ✓ {confirmMessage}
                </p>
              )}
            </div>

            {/* Evidence Gallery */}
            <div className="theme-card">
              <h2 className="text-sm font-bold uppercase tracking-wider mb-3 theme-text-muted flex items-center justify-between">
                <span>Photographic Evidence</span>
                <span className="text-xs font-normal theme-text-muted">
                  {report.evidence.length} photo(s)
                </span>
              </h2>

              {report.evidence.length === 0 && !report.photoBeforeUrl ? (
                <p className="text-xs theme-text-muted py-4 text-center">
                  No photographic evidence uploaded with this report.
                </p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {report.photoBeforeUrl && (
                    <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--border)" }}>
                      <div className="relative aspect-video bg-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={report.photoBeforeUrl}
                          alt="Citizen initial submission evidence"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Initial Citizen Photo
                        </span>
                      </div>
                      <div className="p-2.5 text-xs theme-text-muted">
                        Recorded at initial submission
                      </div>
                    </div>
                  )}

                  {report.photoAfterUrl && (
                    <div className="border rounded-xl overflow-hidden" style={{ borderColor: "var(--border)" }}>
                      <div className="relative aspect-video bg-black/10">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={report.photoAfterUrl}
                          alt="Remediation verification photo"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                          Remediation Confirmation
                        </span>
                      </div>
                      <div className="p-2.5 text-xs theme-text-muted">
                        Official remediated site audit photo
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Resolution Information if Resolved */}
            {report.status === "resolved" && (
              <div
                className="theme-card border-l-4 border-emerald-500"
                style={{ backgroundColor: "var(--bg-card)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">✅</span>
                  <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                    Official Municipal Resolution Note
                  </h3>
                </div>
                <p className="text-sm leading-relaxed mb-3" style={{ color: "var(--text-primary)" }}>
                  {report.resolutionNotes || "Remediation verified by municipal operations."}
                </p>
                <div className="flex flex-wrap gap-4 text-xs theme-text-muted pt-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <span>
                    Department: <strong className="font-semibold">{report.resolutionDepartment || report.departmentName || "Municipal Services"}</strong>
                  </span>
                  {report.resolvedAt && (
                    <span>
                      Resolved On:{" "}
                      <strong className="font-semibold">
                        {new Date(report.resolvedAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Case Metadata & Timeline */}
          <div className="space-y-6">
            {/* Operational Metadata */}
            <div className="theme-card space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider theme-text-muted border-b pb-2" style={{ borderColor: "var(--border)" }}>
                Case Information
              </h2>

              <div className="text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="theme-text-muted">Tracking ID:</span>
                  <span className="font-mono font-bold">{report.displayId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="theme-text-muted">Assigned Dept:</span>
                  <span className="font-semibold">{report.departmentName || "Unassigned"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="theme-text-muted">Response Team:</span>
                  <span className="font-semibold">{report.teamName || "Queue Pending"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="theme-text-muted">Reporter:</span>
                  <span className="font-semibold">{report.reporterName || "Anonymous Citizen"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="theme-text-muted">GPS Coordinates:</span>
                  <span className="font-mono">{report.lat.toFixed(4)}, {report.lng.toFixed(4)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="theme-text-muted">Last Updated:</span>
                  <span>{new Date(report.updatedAt).toLocaleDateString()}</span>
                </div>
              </div>

              <div className="pt-3 border-t">
                <a
                  href={`https://www.openstreetmap.org/?mlat=${report.lat}&mlon=${report.lng}#map=16/${report.lat}/${report.lng}`}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="theme-btn-secondary text-xs w-full text-center block py-1.5"
                >
                  🗺️ View Location on External GIS Map
                </a>
              </div>
            </div>

            {/* Case Timeline / Status History */}
            <div className="theme-card">
              <h2 className="text-sm font-bold uppercase tracking-wider theme-text-muted mb-3">
                Audit Timeline
              </h2>

              {report.history.length === 0 ? (
                <p className="text-xs theme-text-muted py-2">No history recorded yet.</p>
              ) : (
                <div className="relative pl-5 border-l-2 space-y-4" style={{ borderColor: "var(--border)" }}>
                  {report.history.map((hist) => (
                    <div key={hist.id} className="relative">
                      <div
                        className="absolute -left-[27px] top-0.5 w-3 h-3 rounded-full border-2 bg-white dark:bg-slate-900"
                        style={{ borderColor: "var(--accent)" }}
                      />
                      <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                        {hist.newStatus.toUpperCase().replace("_", " ")}
                      </p>
                      {hist.notes && (
                        <p className="text-xs theme-text-muted mt-0.5">{hist.notes}</p>
                      )}
                      <p className="text-[10px] theme-text-muted mt-1">
                        {new Date(hist.createdAt).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {hist.changedByName ? ` by ${hist.changedByName}` : ""}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Staff Case Management Modal */}
        {showActionModal && (
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
                  <h3 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
                    Update Report Case {report.displayId}
                  </h3>
                  <p className="text-xs theme-text-muted">Authorized Authority & Moderator Control</p>
                </div>
                <button
                  onClick={() => setShowActionModal(false)}
                  className="p-1.5 rounded hover:bg-black/5 text-sm theme-text-muted"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleAuthorityUpdate} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Status
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
                      <option value="needs_information">Needs Information</option>
                      <option value="duplicate">Duplicate</option>
                      <option value="rejected">Closed / Rejected</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold theme-text-muted mb-1">
                      Priority Level
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
                      value={selectedDeptId}
                      onChange={(e) => {
                        setSelectedDeptId(e.target.value);
                        setSelectedTeamId("");
                      }}
                      className="theme-input text-xs w-full"
                    >
                      <option value="">-- Select Department --</option>
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
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                      className="theme-input text-xs w-full"
                    >
                      <option value="">-- Select Team --</option>
                      {departments
                        .find((d) => String(d.id) === selectedDeptId)
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
                      placeholder="e.g. 450kg waste cleared from the site and hauled to municipal recycling plant."
                    />

                    <div className="mt-2">
                      <label className="block text-xs font-semibold theme-text-muted mb-1">
                        Optional Remediated Site Photo
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setResolutionPhoto(e.target.files?.[0] || null)}
                        className="text-xs"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Internal Investigation / Triage Note
                  </label>
                  <textarea
                    rows={2}
                    value={actionNotes}
                    onChange={(e) => setActionNotes(e.target.value)}
                    className="theme-input text-xs w-full"
                    placeholder="Staff notes logged into case history"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2 border-t" style={{ borderColor: "var(--border)" }}>
                  <button
                    type="button"
                    onClick={() => setShowActionModal(false)}
                    className="theme-btn-secondary text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updating}
                    className="theme-btn text-xs"
                  >
                    {updating ? "Saving Updates..." : "Save Case Changes"}
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
