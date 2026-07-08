"use client";
import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/appStore";
import { useRouter } from "next/navigation";

interface ClassifyResult {
  category: string;
  severity: string;
  confidence: number;
  description: string;
}

const CATEGORIES = [
  "garbage",
  "burning",
  "dust",
  "smoke",
  "drainage",
  "industrial",
  "other",
] as const;
const SEVERITIES = ["low", "medium", "high", "critical"] as const;

export default function ReportPage() {
  const { t } = useTranslation();
  const { user, token, setTheme } = useAppStore();
  const router = useRouter();

  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<
    "idle" | "detecting" | "detected" | "error"
  >("idle");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("garbage");
  const [severity, setSeverity] = useState<string>("medium");
  const [classifyResult, setClassifyResult] =
    useState<ClassifyResult | null>(null);
  const [classifying, setClassifying] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const handlePhoto = useCallback(async (file: File) => {
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    // Upload photo
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPhotoUrl(data.url);

      // Classify
      setClassifying(true);
      const classRes = await fetch("/api/classify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: data.url }),
      });
      const classData = await classRes.json();
      setClassifyResult(classData);
      setCategory(classData.category);
      setSeverity(classData.severity);

      // Auto-switch to Alert Mode if critical
      if (classData.severity === "critical") {
        setTheme("alertmode");
      }
    } catch (err) {
      console.error(err);
      setError("Failed to process image");
    } finally {
      setUploading(false);
      setClassifying(false);
    }
  }, [setTheme]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handlePhoto(file);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) handlePhoto(file);
  }

  function detectLocation() {
    setLocationStatus("detecting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationStatus("detected");
      },
      () => {
        setLocationStatus("error");
        // Fallback: use Delhi coordinates for demo
        setLat(28.6315 + (Math.random() - 0.5) * 0.05);
        setLng(77.2167 + (Math.random() - 0.5) * 0.05);
        setLocationStatus("detected");
      },
      { timeout: 5000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!photoUrl) {
      setError(t("report.noPhoto"));
      return;
    }
    if (!lat || !lng) {
      setError(t("report.noLocation"));
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          category,
          severity,
          lat,
          lng,
          photoBeforeUrl: photoUrl,
          description,
        }),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError(t("common.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="page-container py-12 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          {t("report.successTitle")}
        </h2>
        <p className="theme-text-muted mb-8">{t("report.successMsg")}</p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={() => {
              setSubmitted(false);
              setPhoto(null);
              setPhotoPreview(null);
              setPhotoUrl(null);
              setLat(null);
              setLng(null);
              setLocationStatus("idle");
              setDescription("");
              setClassifyResult(null);
            }}
            className="theme-btn"
          >
            {t("report.reportAnother")}
          </button>
          <button
            onClick={() => router.push("/map")}
            className="theme-btn-secondary"
          >
            🗺️ {t("nav.map")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen py-8"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="page-container max-w-2xl">
        <div className="page-header">
          <h1 className="page-title">📷 {t("report.title")}</h1>
          <p className="page-subtitle">{t("report.subtitle")}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Photo Upload */}
          <div className="theme-card">
            <label
              className="block text-sm font-bold mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("report.photoLabel")} *
            </label>

            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all hover:bg-opacity-80"
              style={{
                borderColor: photoPreview ? "var(--success)" : "var(--border)",
                backgroundColor: "var(--bg-secondary)",
              }}
            >
              {photoPreview ? (
                <div className="space-y-3">
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="max-h-48 mx-auto rounded-lg object-cover"
                  />
                  {(uploading || classifying) && (
                    <div className="flex items-center justify-center gap-2">
                      <span className="spinner" />
                      <span className="text-sm theme-text-muted">
                        {classifying
                          ? t("report.aiClassifying")
                          : "Uploading..."}
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="text-4xl mb-2">📸</div>
                  <p className="text-sm theme-text-muted">
                    {t("report.photoHint")}
                  </p>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* AI Result */}
          {classifyResult && (
            <div
              className="theme-card"
              style={{ borderColor: "var(--accent)", borderWidth: 2 }}
            >
              <p
                className="text-sm font-bold mb-2"
                style={{ color: "var(--accent)" }}
              >
                🤖 {t("report.aiResult")}
              </p>
              <div className="flex flex-wrap gap-2 items-center">
                <span
                  className={`severity-${classifyResult.severity} px-3 py-1 rounded-full text-sm font-bold`}
                >
                  {t(`severity.${classifyResult.severity}`)}
                </span>
                <span
                  className="px-3 py-1 rounded-full text-sm text-white font-medium"
                  style={{ backgroundColor: "var(--accent)" }}
                >
                  {t(`categories.${classifyResult.category}`)}
                </span>
                <span className="text-sm theme-text-muted">
                  {t("report.aiConfidence")}:{" "}
                  {Math.round(classifyResult.confidence * 100)}%
                </span>
              </div>
              {classifyResult.description && (
                <p className="text-sm theme-text-muted mt-2">
                  {classifyResult.description}
                </p>
              )}
            </div>
          )}

          {/* Category & Severity */}
          <div className="theme-card">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  className="block text-sm font-bold mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Category
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="theme-input"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {t(`categories.${c}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  className="block text-sm font-bold mb-2"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Severity
                </label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="theme-input"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {t(`severity.${s}`)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Location */}
          <div className="theme-card">
            <label
              className="block text-sm font-bold mb-3"
              style={{ color: "var(--text-secondary)" }}
            >
              📍 {t("report.locationLabel")} *
            </label>
            <button
              type="button"
              onClick={detectLocation}
              disabled={locationStatus === "detecting"}
              className={
                locationStatus === "detected"
                  ? "theme-btn-secondary"
                  : "theme-btn"
              }
            >
              {locationStatus === "detecting" && (
                <span className="spinner" />
              )}
              {locationStatus === "detecting"
                ? "Detecting..."
                : locationStatus === "detected"
                ? `✅ ${t("report.locationDetected")}`
                : `📍 ${t("report.detectLocation")}`}
            </button>
            {lat && lng && (
              <p className="text-sm theme-text-muted mt-2">
                {lat.toFixed(5)}, {lng.toFixed(5)}
              </p>
            )}
            {locationStatus === "error" && (
              <p className="text-sm text-red-500 mt-2">
                {t("report.locationError")} (Using demo coordinates)
              </p>
            )}
          </div>

          {/* Description */}
          <div className="theme-card">
            <label
              className="block text-sm font-bold mb-2"
              style={{ color: "var(--text-secondary)" }}
            >
              {t("report.descriptionLabel")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("report.descriptionPlaceholder")}
              className="theme-input"
              rows={3}
              style={{ resize: "vertical" }}
            />
          </div>

          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || uploading || classifying || !photoUrl}
            className="theme-btn w-full justify-center py-4 text-base"
          >
            {submitting ? (
              <>
                <span className="spinner" />
                {t("report.submitting")}
              </>
            ) : (
              `📤 ${t("report.submitBtn")}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
