"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/appStore";
import type { Theme, Language } from "@/store/appStore";
import i18n from "@/lib/i18n";

const THEMES: { key: Theme; emoji: string }[] = [
  { key: "cleanairday", emoji: "☀️" },
  { key: "nightpatrol", emoji: "🌙" },
  { key: "alertmode", emoji: "🚨" },
  { key: "ecogreen", emoji: "🌿" },
  { key: "highvisibility", emoji: "⚡" },
];

const LANGS: { key: Language; label: string }[] = [
  { key: "en", label: "EN" },
  { key: "hi", label: "हिं" },
  { key: "ta", label: "த" },
];

export function Navbar() {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { theme, language, user, unreadCount, setTheme, setLanguage, logout } =
    useAppStore();
  const [showThemes, setShowThemes] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<
    Array<{ id: number; messageKey: string; messageParams?: Record<string, string>; read: boolean; createdAt: string }>
  >([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const themeRef = useRef<HTMLDivElement>(null);

  const token = useAppStore((s) => s.token);

  useEffect(() => {
    if (!token) return;
    fetch("/api/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setNotifications(data);
          useAppStore.getState().setUnreadCount(data.filter((n) => !n.read).length);
        }
      })
      .catch(() => {});
  }, [token]);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemes(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function handleTheme(t: Theme) {
    setTheme(t);
    setShowThemes(false);
  }

  function handleLang(l: Language) {
    setLanguage(l);
    i18n.changeLanguage(l);
  }

  async function markAllRead() {
    if (!token) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    useAppStore.getState().setUnreadCount(0);
  }

  const navLinks = [
    { href: "/report", key: "nav.report", icon: "📷" },
    { href: "/map", key: "nav.map", icon: "🗺️" },
    ...(user?.role === "worker" || user?.role === "admin"
      ? [{ href: "/dashboard", key: "nav.dashboard", icon: "📊" }]
      : []),
    { href: "/stats", key: "nav.stats", icon: "📈" },
  ];

  return (
    <nav className="theme-nav sticky top-0 z-50 shadow-lg">
      <div className="page-container">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-2xl">🌬️</span>
            <span className="hidden sm:block">{t("app.name")}</span>
            <span className="sm:hidden">CleanAir</span>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-1 ${
                  pathname === link.href
                    ? "bg-white/20 font-bold"
                    : "hover:bg-white/10"
                }`}
              >
                <span>{link.icon}</span>
                <span>{t(link.key)}</span>
              </Link>
            ))}
          </div>

          {/* Right controls */}
          <div className="flex items-center gap-2">
            {/* Language switcher */}
            <div className="flex items-center gap-0.5 bg-white/10 rounded-lg p-0.5">
              {LANGS.map((l) => (
                <button
                  key={l.key}
                  onClick={() => handleLang(l.key)}
                  className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                    language === l.key
                      ? "bg-white/30 shadow"
                      : "hover:bg-white/15"
                  }`}
                  aria-label={`Switch to ${l.key}`}
                >
                  {l.label}
                </button>
              ))}
            </div>

            {/* Theme switcher */}
            <div className="relative" ref={themeRef}>
              <button
                onClick={() => setShowThemes(!showThemes)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                aria-label={t("themes.label")}
                title={t("themes.label")}
              >
                🎨
              </button>
              {showThemes && (
                <div
                  className="absolute right-0 top-12 theme-card z-50 min-w-48 no-pulse"
                  style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
                >
                  <p className="text-xs font-bold theme-text-muted mb-2 uppercase tracking-wider">
                    {t("themes.label")}
                  </p>
                  {THEMES.map((th) => (
                    <button
                      key={th.key}
                      onClick={() => handleTheme(th.key)}
                      className={`w-full text-left px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition-colors ${
                        theme === th.key ? "font-bold" : "hover:bg-black/10"
                      }`}
                      style={{
                        color: "var(--text-primary)",
                        backgroundColor:
                          theme === th.key ? "var(--accent-light)" : undefined,
                      }}
                    >
                      <span>{th.emoji}</span>
                      <span>{t(`themes.${th.key}`)}</span>
                      {theme === th.key && <span className="ml-auto">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notifications */}
            {user && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifs(!showNotifs)}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors relative"
                  aria-label={t("nav.notifications")}
                >
                  🔔
                  {unreadCount > 0 && (
                    <span className="notif-dot">{unreadCount}</span>
                  )}
                </button>
                {showNotifs && (
                  <div
                    className="absolute right-0 top-12 theme-card z-50 w-80 no-pulse max-h-96 overflow-y-auto"
                    style={{ backgroundColor: "var(--bg-card)", borderColor: "var(--border)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-bold theme-text-primary">
                        {t("notifications.title")}
                      </p>
                      {unreadCount > 0 && (
                        <button
                          onClick={markAllRead}
                          className="text-xs theme-accent-text hover:underline"
                        >
                          {t("notifications.markAllRead")}
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <p className="theme-text-muted text-sm text-center py-4">
                        {t("notifications.noNotifications")}
                      </p>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`p-2 rounded-lg mb-1 text-sm ${
                            !n.read ? "font-medium" : ""
                          }`}
                          style={{
                            backgroundColor: !n.read
                              ? "var(--accent-light)"
                              : undefined,
                            color: "var(--text-primary)",
                          }}
                        >
                          <p>{t(n.messageKey, n.messageParams || {})}</p>
                          <p className="text-xs theme-text-muted mt-0.5">
                            {new Date(n.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Auth */}
            {user ? (
              <div className="flex items-center gap-2">
                <span className="hidden sm:block text-sm font-medium">
                  {user.name.split(" ")[0]}
                </span>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-bold"
                  style={{
                    backgroundColor: "var(--badge-bg)",
                    color: "var(--badge-text)",
                  }}
                >
                  {user.role}
                </span>
                <button
                  onClick={logout}
                  className="text-sm hover:bg-white/10 px-2 py-1 rounded-lg transition-colors"
                >
                  {t("nav.logout")}
                </button>
              </div>
            ) : (
              <Link href="/login" className="theme-btn text-sm">
                {t("nav.login")}
              </Link>
            )}

            {/* Mobile menu */}
            <button
              className="md:hidden p-2 hover:bg-white/10 rounded-lg"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-white/20">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2 px-3 py-3 hover:bg-white/10 rounded-lg text-sm font-medium"
              >
                <span>{link.icon}</span>
                <span>{t(link.key)}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
}
