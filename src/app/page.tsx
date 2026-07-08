"use client";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/appStore";
import { useEffect, useState } from "react";

interface Stats {
  totalReports: number;
  resolvedPercent: number;
  recurringHotspots: number;
}

export default function HomePage() {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const [stats, setStats] = useState<Stats | null>(null);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setStats(data);
      })
      .catch(() => {});
  }, []);

  async function handleSeed() {
    setSeeding(true);
    await fetch("/api/seed", { method: "POST" });
    window.location.reload();
  }

  const features = [
    {
      icon: "📸",
      titleKey: "Citizen Reporting",
      desc: "Photo + GPS + AI classification in seconds",
    },
    {
      icon: "🗺️",
      titleKey: "Live Map",
      desc: "Color-coded pins, clustered hotspots, real-time data",
    },
    {
      icon: "🔁",
      titleKey: "Hotspot Detection",
      desc: "DBSCAN clustering flags recurring problem areas",
    },
    {
      icon: "🚛",
      titleKey: "Worker Routes",
      desc: "Optimized cleanup routes generated automatically",
    },
    {
      icon: "✅",
      titleKey: "AI Verification",
      desc: "Before/after photo comparison confirms resolution",
    },
    {
      icon: "📊",
      titleKey: "Transparency",
      desc: "Public stats build civic trust",
    },
  ];

  return (
    <div className="theme-bg-primary min-h-screen">
      {/* Hero */}
      <div
        className="relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, var(--nav-bg) 0%, var(--accent) 100%)",
          color: "var(--nav-text)",
        }}
      >
        <div className="page-container py-20 text-center relative z-10">
          <div className="text-6xl mb-4">🌬️</div>
          <h1 className="text-4xl md:text-6xl font-black mb-4 leading-tight">
            {t("app.name")}
          </h1>
          <p className="text-lg md:text-2xl mb-2 opacity-90">
            {t("app.tagline")}
          </p>
          <p className="text-sm md:text-base opacity-70 max-w-2xl mx-auto mb-10">
            AI-powered civic platform · Three languages · Five themes · Real-time hotspot prediction
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link href="/report" className="theme-btn text-lg px-8 py-3">
              📷 {t("nav.report")}
            </Link>
            <Link
              href="/map"
              className="theme-btn-secondary text-lg px-8 py-3"
              style={{ borderColor: "white", color: "white" }}
            >
              🗺️ {t("nav.map")}
            </Link>
          </div>
        </div>
        {/* Decorative circles */}
        <div
          className="absolute -top-20 -right-20 w-80 h-80 rounded-full opacity-10"
          style={{ backgroundColor: "white" }}
        />
        <div
          className="absolute -bottom-10 -left-10 w-60 h-60 rounded-full opacity-10"
          style={{ backgroundColor: "white" }}
        />
      </div>

      {/* Stats bar */}
      {stats && (
        <div
          className="border-y"
          style={{
            borderColor: "var(--border)",
            backgroundColor: "var(--bg-secondary)",
          }}
        >
          <div className="page-container py-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p
                  className="text-3xl font-black"
                  style={{ color: "var(--accent)" }}
                >
                  {stats.totalReports.toLocaleString()}
                </p>
                <p className="text-sm theme-text-muted">
                  {t("stats.totalReports")}
                </p>
              </div>
              <div>
                <p
                  className="text-3xl font-black"
                  style={{ color: "var(--success)" }}
                >
                  {stats.resolvedPercent}%
                </p>
                <p className="text-sm theme-text-muted">
                  {t("stats.resolvedPercent")}
                </p>
              </div>
              <div>
                <p
                  className="text-3xl font-black"
                  style={{ color: "var(--danger)" }}
                >
                  {stats.recurringHotspots}
                </p>
                <p className="text-sm theme-text-muted">
                  {t("stats.recurringHotspots")}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Features grid */}
      <div className="page-container py-16">
        <h2
          className="text-3xl font-bold text-center mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          How It Works
        </h2>
        <p
          className="text-center theme-text-muted mb-12"
          style={{ color: "var(--text-muted)" }}
        >
          A complete civic loop — from first photo to verified resolution
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div key={i} className="theme-card text-center hover:scale-105 transition-transform">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3
                className="font-bold text-lg mb-1"
                style={{ color: "var(--text-primary)" }}
              >
                {f.titleKey}
              </h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Demo CTA */}
      <div
        className="border-t py-12 text-center"
        style={{ borderColor: "var(--border)", backgroundColor: "var(--bg-secondary)" }}
      >
        <h3
          className="text-2xl font-bold mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          Try the Demo
        </h3>
        <p className="theme-text-muted mb-6 text-sm">
          Load sample data to explore all features
        </p>
        <div className="flex flex-wrap gap-4 justify-center">
          <button
            onClick={handleSeed}
            disabled={seeding}
            className="theme-btn"
          >
            {seeding ? "🔄 Loading..." : "🌱 Load Demo Data"}
          </button>
          <Link href="/login" className="theme-btn-secondary">
            🔐 Login (worker@cleanair.demo / demo123)
          </Link>
        </div>
        <p className="mt-4 text-xs theme-text-muted">
          Demo accounts: admin@cleanair.demo · worker@cleanair.demo · citizen@cleanair.demo (all: demo123)
        </p>
      </div>

      {/* Theme showcase */}
      <div className="page-container py-12">
        <h3
          className="text-xl font-bold text-center mb-2"
          style={{ color: "var(--text-primary)" }}
        >
          5 Visual Themes · 3 Languages
        </h3>
        <p className="text-center text-sm theme-text-muted mb-6">
          Use the 🎨 palette icon in the top navbar to switch themes and EN / हिं / த for language
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          {[
            { name: "CleanAir Day", color: "#0ea5e9", emoji: "☀️" },
            { name: "Night Patrol", color: "#00ff41", emoji: "🌙" },
            { name: "Alert Mode", color: "#ff4444", emoji: "🚨" },
            { name: "Eco Green", color: "#558b2f", emoji: "🌿" },
            { name: "High Visibility", color: "#000000", emoji: "⚡" },
          ].map((theme) => (
            <div
              key={theme.name}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-white text-sm font-medium"
              style={{ backgroundColor: theme.color }}
            >
              <span>{theme.emoji}</span>
              <span>{theme.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
