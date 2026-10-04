"use client";
import Link from "next/link";
import { useAppStore } from "@/store/appStore";
import { useEffect, useState } from "react";
import { PlanModal } from "@/components/PlanModal";

interface StatsData {
  totalReports: number;
  resolvedPercent: number;
  activeIssues: number;
  recurringHotspots: number;
  totalConfirmations: number;
}

export default function HomePage() {
  const { user } = useAppStore();
  const [stats, setStats] = useState<StatsData | null>(null);
  const [showPlans, setShowPlans] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch(() => {});
  }, []);

  const lifecycleStages = [
    { step: 1, title: "Citizen Report", icon: "📸", desc: "Citizen captures photo, GPS location, and pollution severity." },
    { step: 2, title: "Case Triage", icon: "🔍", desc: "Moderators triage reports, filter duplicates, and validate evidence." },
    { step: 3, title: "Priority & Assignment", icon: "⚡", desc: "Assigned to specialized municipal departments and response squads." },
    { step: 4, title: "Investigation & Cleanup", icon: "🚛", desc: "Field authorities mobilize on-site remediation and hazardous waste removal." },
    { step: 5, title: "Resolution & Audit", icon: "✅", desc: "Remediation verified with public note and site audit photos." },
    { step: 6, title: "Community Confirmation", icon: "👥", desc: "Local citizens confirm remediation and track environmental health." },
  ];

  const pillarCards = [
    {
      icon: "📸",
      title: "Citizen-Powered Reporting",
      desc: "Instant hazard logging with photo evidence, GPS auto-detection, and structured severity classification.",
    },
    {
      icon: "🗺️",
      title: "Interactive Live Map",
      desc: "Real-time geographic visualization of pollution incidents, active hotspots, and remediation status.",
    },
    {
      icon: "🔁",
      title: "Hotspot Cluster Detection",
      desc: "Backend spatial clustering detects recurring pollution hazards to direct systemic municipal resources.",
    },
    {
      icon: "👥",
      title: "Community Confirmation",
      desc: "Authenticated citizens corroborate observed local issues to prevent false alarms and aid prioritization.",
    },
    {
      icon: "🏛️",
      title: "Verified Civic Helplines",
      desc: "Direct directory of statutory pollution control boards, emergency dispatch, and municipal control rooms.",
    },
    {
      icon: "📈",
      title: "Open Civic Transparency",
      desc: "Live PostgreSQL insights into resolution rates, response timelines, and neighborhood environmental health.",
    },
  ];

  return (
    <div className="min-h-screen py-10">
      <div className="page-container space-y-12">
        {/* Hero Section */}
        <div className="theme-card text-center py-16 px-4 md:px-8 border shadow-xl relative overflow-hidden" style={{ borderColor: "var(--border)" }}>
          <div className="max-w-3xl mx-auto space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600">
              <span>🌱</span>
              <span>CivicPulse Platform</span>
            </div>

            <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-tight" style={{ color: "var(--text-primary)" }}>
              Report. Track. Improve.
            </h1>

            <p className="text-sm sm:text-lg theme-text-muted leading-relaxed max-w-2xl mx-auto">
              A citizen-powered environmental pollution reporting and response platform. Connect directly with municipal departments to identify hazards, verify cleanups, and protect our shared civic spaces.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3 pt-3">
              <Link
                href="/report"
                className="theme-btn py-3 px-6 text-sm font-bold flex items-center gap-2 shadow-lg"
              >
                <span>📸</span>
                <span>Report an Issue</span>
              </Link>
              <Link
                href="/dashboard"
                className="theme-btn-secondary py-3 px-6 text-sm font-bold flex items-center gap-2"
              >
                <span>📊</span>
                <span>Open Dashboard</span>
              </Link>
              <Link
                href="/map"
                className="theme-btn-secondary py-3 px-5 text-sm font-bold flex items-center gap-2"
              >
                <span>🗺️</span>
                <span>Explore Map</span>
              </Link>
            </div>
          </div>

          {/* Real-time KPI summary bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-12 pt-8 border-t max-w-4xl mx-auto" style={{ borderColor: "var(--border)" }}>
            <div className="p-2">
              <p className="text-2xl sm:text-3xl font-extrabold" style={{ color: "var(--accent)" }}>
                {stats ? stats.totalReports : "–"}
              </p>
              <p className="text-xs theme-text-muted">Total Recorded Reports</p>
            </div>
            <div className="p-2">
              <p className="text-2xl sm:text-3xl font-extrabold text-emerald-600">
                {stats ? `${stats.resolvedPercent}%` : "–"}
              </p>
              <p className="text-xs theme-text-muted">Remediation Rate</p>
            </div>
            <div className="p-2">
              <p className="text-2xl sm:text-3xl font-extrabold text-amber-600">
                {stats ? stats.activeIssues : "–"}
              </p>
              <p className="text-xs theme-text-muted">Active In Triage</p>
            </div>
            <div className="p-2">
              <p className="text-2xl sm:text-3xl font-extrabold text-sky-600">
                {stats ? stats.totalConfirmations : "–"}
              </p>
              <p className="text-xs theme-text-muted">Community Corroborations</p>
            </div>
          </div>
        </div>

        {/* Product Lifecycle Case Flow */}
        <div className="theme-card py-10 px-6">
          <div className="text-center max-w-xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-wider text-sky-600">
              End-To-End Case Lifecycle
            </span>
            <h2 className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>
              How CivicPulse Works
            </h2>
            <p className="text-xs theme-text-muted mt-1">
              From observation to remediation verification: a transparent municipal case management pipeline.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lifecycleStages.map((stage) => (
              <div
                key={stage.step}
                className="p-4 rounded-xl border flex items-start gap-3 bg-black/[0.02] dark:bg-white/[0.02]"
                style={{ borderColor: "var(--border)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0"
                  style={{ backgroundColor: "var(--accent-light)" }}
                >
                  {stage.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-black/10 dark:bg-white/10 text-sky-600">
                      STEP {stage.step}
                    </span>
                    <h3 className="font-bold text-sm" style={{ color: "var(--text-primary)" }}>
                      {stage.title}
                    </h3>
                  </div>
                  <p className="text-xs theme-text-muted leading-relaxed">
                    {stage.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Platform Pillars */}
        <div className="space-y-4">
          <div className="text-center max-w-xl mx-auto">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Core Capabilities
            </span>
            <h2 className="text-2xl font-bold mt-1" style={{ color: "var(--text-primary)" }}>
              Built for Citizens & Municipal Teams
            </h2>
            <p className="text-xs theme-text-muted mt-1">
              Engineered with PostgreSQL spatial clustering, server-side authorization, and zero fake data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pillarCards.map((p, i) => (
              <div key={i} className="theme-card space-y-2">
                <span className="text-3xl block">{p.icon}</span>
                <h3 className="font-bold text-base" style={{ color: "var(--text-primary)" }}>
                  {p.title}
                </h3>
                <p className="text-xs theme-text-muted leading-relaxed">
                  {p.desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Call to Action Footer Card */}
        <div
          className="theme-card p-8 text-center rounded-2xl border"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <div className="max-w-xl mx-auto space-y-3">
            <h2 className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Ready to Improve Your Local Environment?
            </h2>
            <p className="text-xs theme-text-muted leading-relaxed">
              Join community members, ward stewards, and local authorities working together for cleaner, healthier neighborhoods.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
              <Link href="/report" className="theme-btn text-xs py-2.5 px-5 font-bold">
                Report a Hazard Now
              </Link>
              <button
                onClick={() => setShowPlans(true)}
                className="theme-btn-secondary text-xs py-2.5 px-5 font-bold"
              >
                View Civic Tiers
              </button>
            </div>
          </div>
        </div>
      </div>

      <PlanModal isOpen={showPlans} onClose={() => setShowPlans(false)} />
    </div>
  );
}
