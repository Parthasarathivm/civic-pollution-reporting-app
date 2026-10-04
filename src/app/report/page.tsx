"use client";
import { useState, useRef, useCallback } from "react";
import { useAppStore } from "@/store/appStore";
import { useRouter } from "next/navigation";
import Link from "next/link";

const POLLUTION_CATEGORIES = [
  { id: "garbage", label: "Waste / Garbage", icon: "🗑️", desc: "Overflowing bins, uncollected refuse, or municipal dumping" },
  { id: "plastic", label: "Plastic Pollution", icon: "🧴", desc: "Non-biodegradable debris, microplastics, canal choking" },
  { id: "industrial", label: "Industrial Pollution", icon: "🏭", desc: "Factory emissions, toxic discharges, or hazardous effluent" },
  { id: "burning", label: "Open Burning", icon: "🔥", desc: "Agricultural residue, leaf burning, or plastic bonfire smoke" },
  { id: "drainage", label: "Drainage Blockage", icon: "🌊", desc: "Stagnant stormwater, clogged culverts, waterlogging" },
  { id: "sewage", label: "Sewage Overflow", icon: "🚰", desc: "Untreated raw sewage line leaks or bio-hazard discharge" },
  { id: "dust", label: "Construction Dust", icon: "💨", desc: "Uncovered sand/aggregate, demolition dust, particulate drift" },
  { id: "smoke", label: "Vehicular Exhaust / Smoke", icon: "🚗", desc: "Excessive diesel black smoke or gross-polluting transit" },
  { id: "noise", label: "Noise Pollution", icon: "📢", desc: "Industrial sirens, non-compliant diesel generators, loudspeakers" },
  { id: "soil", label: "Soil & Ground Contamination", icon: "🌱", desc: "Chemical dumping, battery leakage, or underground seepage" },
  { id: "other", label: "Other Environmental Hazard", icon: "⚠️", desc: "Unclassified civic or ecological environmental concern" },
];

const SEVERITY_LEVELS = [
  { id: "low", label: "Low", color: "#22c55e", bg: "rgba(34, 197, 94, 0.1)", desc: "Minor localized concern, no immediate health or structural risk" },
  { id: "medium", label: "Medium", color: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)", desc: "Noticeable nuisance or public health hazard needing municipal queue" },
  { id: "high", label: "High", color: "#f97316", bg: "rgba(249, 115, 22, 0.1)", desc: "Significant health risk, severe contamination, urgent attention needed" },
  { id: "critical", label: "Critical", color: "#ef4444", bg: "rgba(239, 68, 68, 0.15)", desc: "Emergency toxicity, bio-hazard, active fire, or blocked vital waterway" },
];

export default function ReportPage() {
  const { user, token, setTheme } = useAppStore();
  const router = useRouter();

  // Wizard step: 1 (Category), 2 (Severity), 3 (Description), 4 (Location), 5 (Evidence), 6 (Review)
  const [currentStep, setCurrentStep] = useState(1);

  // Form data
  const [category, setCategory] = useState<string>("garbage");
  const [severity, setSeverity] = useState<string>("medium");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "detecting" | "detected" | "error">("idle");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Status flags
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedReport, setSubmittedReport] = useState<{ id: number; displayId: string } | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Photo Selection & Upload
  const handlePhotoUpload = useCallback(async (file: File) => {
    setPhoto(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    setErrorMessage("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      setPhotoUrl(data.url);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to upload image evidence");
    } finally {
      setUploading(false);
    }
  }, []);

  // Detect GPS Location
  const detectLocation = () => {
    setLocationStatus("detecting");
    setErrorMessage("");
    if (!navigator.geolocation) {
      setLocationStatus("error");
      setErrorMessage("Geolocation is not supported by your browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationStatus("detected");
        if (!address) {
          setAddress(`GPS Lat: ${pos.coords.latitude.toFixed(4)}, Lng: ${pos.coords.longitude.toFixed(4)}`);
        }
      },
      (err) => {
        console.warn("Geolocation fallback:", err);
        setLocationStatus("error");
        // Fallback to capital coords with notice
        setLat(28.6315);
        setLng(77.2167);
        if (!address) setAddress("Central Urban Region (Manual Pin)");
        setLocationStatus("detected");
      },
      { timeout: 8000 }
    );
  };

  // Step Validation
  const canProceed = () => {
    if (currentStep === 1) return !!category;
    if (currentStep === 2) return !!severity;
    if (currentStep === 3) return description.trim().length >= 10;
    if (currentStep === 4) return lat !== null && lng !== null;
    return true;
  };

  // Final Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return; // Prevent duplicate clicks

    if (lat === null || lng === null) {
      setErrorMessage("Please set a valid geographical location.");
      return;
    }

    setSubmitting(true);
    setErrorMessage("");

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
          description: description.trim(),
          address: address.trim() || undefined,
          lat,
          lng,
          photoBeforeUrl: photoUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Submission failed");

      setSubmittedReport({
        id: data.id,
        displayId: data.displayId || `CP-${data.id}`,
      });
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to record report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Confirmation Screen
  if (submittedReport) {
    return (
      <div className="min-h-screen py-16">
        <div className="page-container max-w-xl text-center">
          <div className="theme-card py-10 px-6 border-2 border-emerald-500 shadow-xl">
            <span className="text-5xl block mb-3 animate-bounce">🎉</span>
            <div className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-600 font-bold text-xs uppercase tracking-wider mb-2">
              Report Successfully Logged
            </div>
            <h1 className="text-2xl font-bold mb-2" style={{ color: "var(--text-primary)" }}>
              Environmental Report {submittedReport.displayId}
            </h1>
            <p className="text-xs theme-text-muted max-w-md mx-auto mb-6">
              Your civic observation has been assigned official tracking number <strong>{submittedReport.displayId}</strong>. It is now registered in the municipal triage queue.
            </p>

            <div className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 text-xs text-left space-y-2 mb-8">
              <div className="flex justify-between">
                <span className="theme-text-muted">Category:</span>
                <span className="font-semibold capitalize">{category}</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-muted">Severity:</span>
                <span className="font-semibold uppercase">{severity}</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-muted">Location:</span>
                <span className="font-semibold truncate max-w-[240px]">{address || `${lat?.toFixed(4)}, ${lng?.toFixed(4)}`}</span>
              </div>
              <div className="flex justify-between">
                <span className="theme-text-muted">Status:</span>
                <span className="font-bold text-sky-600">Submitted (Awaiting Triage)</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href={`/report/${submittedReport.id}`}
                className="theme-btn py-2.5 px-5 font-bold"
              >
                🔍 Track Report Case Details
              </Link>
              <Link
                href="/dashboard"
                className="theme-btn-secondary py-2.5 px-5 font-bold"
              >
                📊 Go to Dashboard
              </Link>
              <button
                onClick={() => {
                  setSubmittedReport(null);
                  setCurrentStep(1);
                  setDescription("");
                  setAddress("");
                  setLat(null);
                  setLng(null);
                  setPhoto(null);
                  setPhotoPreview(null);
                  setPhotoUrl(null);
                }}
                className="theme-btn-secondary text-xs"
              >
                ➕ File Another Report
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stepsList = [
    { num: 1, label: "Category" },
    { num: 2, label: "Severity" },
    { num: 3, label: "Description" },
    { num: 4, label: "Location" },
    { num: 5, label: "Evidence" },
    { num: 6, label: "Review & Submit" },
  ];

  return (
    <div className="min-h-screen py-8">
      <div className="page-container max-w-3xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🌱</span>
            <span
              className="text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full"
              style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
            >
              Citizen Pollution Report
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: "var(--text-primary)" }}>
            Report an Environmental Hazard
          </h1>
          <p className="text-xs theme-text-muted mt-1">
            Your verified report directly alerts municipal response squads and statutory pollution control authorities.
          </p>
        </div>

        {/* Wizard Stepper */}
        <div className="theme-card mb-6 py-3 px-4">
          <div className="flex items-center justify-between relative">
            {stepsList.map((step) => {
              const isPast = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <button
                  key={step.num}
                  type="button"
                  onClick={() => {
                    if (isPast) setCurrentStep(step.num);
                  }}
                  className={`flex flex-col items-center z-10 transition-all ${
                    isPast ? "cursor-pointer" : isCurrent ? "cursor-default" : "opacity-40 cursor-not-allowed"
                  }`}
                >
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      isPast
                        ? "bg-emerald-500 text-white"
                        : isCurrent
                        ? "bg-sky-600 text-white ring-2 ring-sky-300 ring-offset-2"
                        : "bg-black/10 dark:bg-white/10 theme-text-muted"
                    }`}
                  >
                    {isPast ? "✓" : step.num}
                  </div>
                  <span className={`text-[10px] sm:text-xs mt-1 truncate ${isCurrent ? "font-bold text-sky-600" : "theme-text-muted"}`}>
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div
            className="mb-6 p-4 rounded-xl text-xs font-semibold flex items-center gap-2"
            style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
          >
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Step Forms */}
        <form onSubmit={handleSubmit} className="theme-card space-y-6">
          {/* STEP 1: CATEGORY */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Step 1: Select Pollution Category
                </h2>
                <p className="text-xs theme-text-muted">
                  Choose the environmental hazard that best matches the issue.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {POLLUTION_CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      type="button"
                      key={cat.id}
                      onClick={() => setCategory(cat.id)}
                      className={`p-3.5 rounded-xl border text-left flex items-start gap-3 transition-all ${
                        isSelected
                          ? "border-sky-500 bg-sky-500/10 shadow-sm ring-1 ring-sky-400"
                          : "border-black/10 dark:border-white/10 hover:bg-black/5"
                      }`}
                    >
                      <span className="text-2xl p-2 rounded-lg bg-black/5 dark:bg-white/5">
                        {cat.icon}
                      </span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                          {cat.label}
                        </p>
                        <p className="text-xs theme-text-muted mt-0.5 leading-snug">
                          {cat.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: SEVERITY */}
          {currentStep === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Step 2: Assess Severity Level
                </h2>
                <p className="text-xs theme-text-muted">
                  Evaluate the urgency of physical remediation needed.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {SEVERITY_LEVELS.map((sev) => {
                  const isSelected = severity === sev.id;
                  return (
                    <button
                      type="button"
                      key={sev.id}
                      onClick={() => {
                        setSeverity(sev.id);
                        if (sev.id === "critical") setTheme("alertmode");
                      }}
                      className={`p-4 rounded-xl border text-left flex items-center justify-between transition-all ${
                        isSelected
                          ? "shadow-sm ring-2 ring-offset-2"
                          : "border-black/10 dark:border-white/10 hover:bg-black/5"
                      }`}
                      style={{
                        borderColor: isSelected ? sev.color : undefined,
                        backgroundColor: isSelected ? sev.bg : undefined,
                      }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: sev.color }}
                          />
                          <p className="font-bold text-sm uppercase" style={{ color: sev.color }}>
                            {sev.label} Severity
                          </p>
                        </div>
                        <p className="text-xs theme-text-muted mt-1">{sev.desc}</p>
                      </div>
                      <span className="text-lg font-bold" style={{ color: sev.color }}>
                        {isSelected ? "●" : "○"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: DESCRIPTION */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Step 3: Detail the Environmental Hazard
                </h2>
                <p className="text-xs theme-text-muted">
                  Provide factual context: source, observable odor, duration, or risk to residents.
                </p>
              </div>

              <div>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you observed (minimum 10 characters)... e.g., Substantial plastic and municipal refuse dumped along canal embankment, producing strong foul odors and risk of waterway blockage."
                  className="theme-input text-sm w-full leading-relaxed"
                />
                <div className="flex justify-between items-center text-xs theme-text-muted mt-1">
                  <span>Minimum 10 characters</span>
                  <span>{description.length} characters</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: LOCATION */}
          {currentStep === 4 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Step 4: Location & Landmarks
                </h2>
                <p className="text-xs theme-text-muted">
                  Accurate coordinates ensure the municipal squad dispatches to the exact location.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-3">
                <button
                  type="button"
                  onClick={detectLocation}
                  disabled={locationStatus === "detecting"}
                  className="theme-btn text-xs py-2.5 px-4 flex items-center gap-2 w-full sm:w-auto"
                >
                  {locationStatus === "detecting" ? (
                    <span className="spinner" />
                  ) : (
                    <span>📍</span>
                  )}
                  <span>Auto-Detect My GPS Coordinates</span>
                </button>

                {locationStatus === "detected" && (
                  <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                    ✓ Coordinates Acquired ({lat?.toFixed(4)}, {lng?.toFixed(4)})
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-muted mb-1">
                  Street Address / Landmark Description *
                </label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Near Metro Pillar 142, Outer Ring Road, East Gate"
                  className="theme-input text-sm w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Latitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lat ?? ""}
                    onChange={(e) => setLat(parseFloat(e.target.value) || null)}
                    placeholder="28.6315"
                    className="theme-input text-sm w-full font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold theme-text-muted mb-1">
                    Longitude
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={lng ?? ""}
                    onChange={(e) => setLng(parseFloat(e.target.value) || null)}
                    placeholder="77.2167"
                    className="theme-input text-sm w-full font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: EVIDENCE */}
          {currentStep === 5 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Step 5: Attach Evidence Photo (Optional)
                </h2>
                <p className="text-xs theme-text-muted">
                  A photo greatly speeds up authority verification and municipal dispatch.
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed rounded-xl p-8 text-center cursor-pointer hover:bg-black/5 transition-all"
                style={{ borderColor: "var(--border)" }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePhotoUpload(f);
                  }}
                  className="hidden"
                />

                {uploading ? (
                  <div className="py-4">
                    <span className="spinner mb-2 inline-block" />
                    <p className="text-xs theme-text-muted">Uploading and securing photo...</p>
                  </div>
                ) : photoPreview ? (
                  <div className="space-y-3">
                    <div className="max-w-xs mx-auto aspect-video rounded-lg overflow-hidden border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photoPreview}
                        alt="Uploaded preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-emerald-600 font-semibold">
                      ✓ Evidence photo attached. Click to change.
                    </p>
                  </div>
                ) : (
                  <div>
                    <span className="text-4xl block mb-2">📸</span>
                    <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      Click to upload photo evidence
                    </p>
                    <p className="text-xs theme-text-muted mt-1">
                      PNG, JPG, WEBP, or GIF up to 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 6: REVIEW */}
          {currentStep === 6 && (
            <div className="space-y-4 animate-fade-in">
              <div>
                <h2 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                  Step 6: Review & Confirm Submission
                </h2>
                <p className="text-xs theme-text-muted">
                  Please review the case details before publishing to the civic ledger.
                </p>
              </div>

              <div className="p-4 rounded-xl border bg-black/5 dark:bg-white/5 space-y-3 text-xs">
                <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                  <span className="theme-text-muted">Hazard Category:</span>
                  <span className="font-bold capitalize">{category}</span>
                </div>
                <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                  <span className="theme-text-muted">Assessed Severity:</span>
                  <span className="font-bold uppercase text-amber-600">{severity}</span>
                </div>
                <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                  <span className="theme-text-muted">Location:</span>
                  <span className="font-semibold text-right max-w-xs truncate">{address}</span>
                </div>
                <div className="flex justify-between border-b pb-2" style={{ borderColor: "var(--border)" }}>
                  <span className="theme-text-muted">GPS Coordinates:</span>
                  <span className="font-mono">{lat?.toFixed(4)}, {lng?.toFixed(4)}</span>
                </div>
                <div className="border-b pb-2" style={{ borderColor: "var(--border)" }}>
                  <span className="theme-text-muted block mb-1">Description:</span>
                  <p className="font-medium text-xs leading-relaxed" style={{ color: "var(--text-primary)" }}>
                    {description}
                  </p>
                </div>
                <div className="flex justify-between">
                  <span className="theme-text-muted">Evidence Attached:</span>
                  <span className="font-semibold">{photoUrl ? "Yes (1 Photo)" : "None"}</span>
                </div>
              </div>

              <div className="p-3 rounded-lg border text-xs text-sky-700 bg-sky-50 dark:bg-sky-950/30 border-sky-300">
                ℹ️ Once submitted, your report receives an official tracking ID and is routed to the municipal environmental operations department.
              </div>
            </div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t" style={{ borderColor: "var(--border)" }}>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={() => setCurrentStep((s) => s - 1)}
                className="theme-btn-secondary text-xs py-2 px-4"
              >
                ← Back
              </button>
            ) : (
              <div />
            )}

            {currentStep < 6 ? (
              <button
                type="button"
                disabled={!canProceed()}
                onClick={() => setCurrentStep((s) => s + 1)}
                className="theme-btn text-xs py-2 px-5 disabled:opacity-40"
              >
                Next Step →
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                className="theme-btn text-xs py-2.5 px-6 font-bold flex items-center gap-2"
              >
                {submitting ? (
                  <>
                    <span className="spinner" />
                    <span>Submitting to CivicPulse...</span>
                  </>
                ) : (
                  <span>🚀 Confirm & Submit Report</span>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
