"use client";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore, Theme } from "@/store/appStore";
import { PlanModal } from "@/components/PlanModal";
import { CIVIC_PLANS } from "@/lib/plans";

const THEMES: { key: Theme; emoji: string; name: string }[] = [
  { key: "cleanairday", emoji: "🏙️", name: "Clean Modern City" },
  { key: "ecogreen", emoji: "🌲", name: "Green Forest Canopy" },
  { key: "nightpatrol", emoji: "🏔️", name: "Mountain Twilight" },
  { key: "highvisibility", emoji: "🌊", name: "Ocean & Coastal" },
  { key: "livingplanet", emoji: "🪐", name: "Sustainable Eco-City" },
  { key: "alertmode", emoji: "🚨", name: "Environmental Alert" },
];

interface NotificationItem {
  id: number;
  title: string | null;
  messageKey: string;
  messageParams?: Record<string, string>;
  link: string | null;
  type: string | null;
  read: boolean;
  createdAt: string;
}

interface SearchResultItem {
  id: number;
  displayId: string;
  category: string;
  severity: string;
  status: string;
  address: string | null;
  description: string | null;
}

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const {
    theme,
    user,
    token,
    unreadCount,
    activePlanId,
    setTheme,
    setUnreadCount,
    logout,
  } = useAppStore();

  const [showThemes, setShowThemes] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const themeRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Async notifications fetcher without synchronous setState in effect
  useEffect(() => {
    if (!token) return;
    let isCurrent = true;

    const fetchNotifs = () => {
      fetch("/api/notifications", {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : []))
        .then((data) => {
          if (isCurrent && Array.isArray(data)) {
            setNotifications(data);
            const unread = data.filter((n: NotificationItem) => !n.read).length;
            setUnreadCount(unread);
          }
        })
        .catch(() => {});
    };

    fetchNotifs();
    const interval = setInterval(fetchNotifs, 20000);

    return () => {
      isCurrent = false;
      clearInterval(interval);
    };
  }, [token, setUnreadCount]);

  // Mark all notifications as read
  const handleMarkAllRead = async () => {
    if (!token) return;
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  // Close menus on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (themeRef.current && !themeRef.current.contains(e.target as Node)) {
        setShowThemes(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setShowNotifs(false);
      }
      if (userRef.current && !userRef.current.contains(e.target as Node)) {
        setShowUserMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Async Search with debouncing
  useEffect(() => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;

    let isCurrent = true;
    const handler = setTimeout(() => {
      setSearching(true);
      fetch(`/api/search?q=${encodeURIComponent(trimmed)}`)
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((data) => {
          if (isCurrent) {
            setSearchResults(data.results || []);
            setShowSearchResults(true);
            setSearching(false);
          }
        })
        .catch(() => {
          if (isCurrent) setSearching(false);
        });
    }, 280);

    return () => {
      isCurrent = false;
      clearTimeout(handler);
    };
  }, [searchQuery]);

  const activePlan = CIVIC_PLANS.find((p) => p.id === activePlanId) || CIVIC_PLANS[0];

  const navLinks = [
    { href: "/report", label: "Report Hazard", icon: "📸" },
    { href: "/map", label: "Live Map", icon: "🗺️" },
    { href: "/dashboard", label: "Dashboard", icon: "📊" },
    { href: "/stats", label: "Insights", icon: "📈" },
    { href: "/contacts", label: "Official Helplines", icon: "🏛️" },
  ];

  return (
    <>
      <header className="theme-nav sticky top-0 z-50 shadow-md border-b border-black/10 dark:border-white/10 backdrop-blur-md">
        <div className="page-container">
          <div className="flex items-center justify-between h-16 gap-3">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg font-bold text-white shadow-md transition-transform group-hover:scale-105"
                style={{ backgroundColor: "var(--accent)" }}
              >
                🌱
              </div>
              <div>
                <span className="font-extrabold text-lg tracking-tight block leading-tight" style={{ color: "var(--text-primary)" }}>
                  CivicPulse
                </span>
                <span className="text-[10px] theme-text-muted font-semibold tracking-wider uppercase block">
                  Report • Track • Improve
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                      isActive
                        ? "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                        : "theme-text-muted hover:text-sky-500 hover:bg-black/5 dark:hover:bg-white/5"
                    }`}
                  >
                    <span>{link.icon}</span>
                    <span>{link.label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* Global Search Bar */}
            <div ref={searchRef} className="hidden md:block relative flex-1 max-w-xs">
              <input
                type="text"
                value={searchQuery}
                onFocus={() => {
                  if (searchResults.length > 0) setShowSearchResults(true);
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  setSearchQuery(val);
                  if (!val.trim()) {
                    setSearchResults([]);
                    setShowSearchResults(false);
                  }
                }}
                placeholder="Search CP-ID, address, category..."
                className="theme-input text-xs w-full py-1.5 pl-8 pr-3"
              />
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs theme-text-muted">
                🔍
              </span>

              {/* Search Results Dropdown */}
              {showSearchResults && searchQuery.trim().length > 0 && (
                <div
                  className="absolute left-0 right-0 top-full mt-1.5 p-2 rounded-xl shadow-2xl border z-50 max-h-80 overflow-y-auto animate-fade-in"
                  style={{
                    backgroundColor: "var(--bg-card)",
                    borderColor: "var(--border)",
                  }}
                >
                  {searching ? (
                    <div className="p-3 text-center text-xs theme-text-muted">
                      <span className="spinner mb-1 inline-block" />
                      <p>Searching verified cases...</p>
                    </div>
                  ) : searchResults.length === 0 ? (
                    <div className="p-3 text-center text-xs theme-text-muted">
                      No matching reports found in database.
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {searchResults.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setShowSearchResults(false);
                            setSearchQuery("");
                            router.push(`/report/${r.id}`);
                          }}
                          className="w-full text-left p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors flex items-center justify-between text-xs"
                        >
                          <div className="truncate mr-2">
                            <div className="flex items-center gap-1.5 font-bold">
                              <span className="font-mono text-sky-600">{r.displayId}</span>
                              <span className="capitalize">{r.category}</span>
                            </div>
                            <p className="text-[11px] theme-text-muted truncate">
                              {r.address || r.description || "Location coordinates"}
                            </p>
                          </div>
                          <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-black/5 dark:bg-white/10 shrink-0">
                            {r.status.replace("_", " ")}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Right Tools: Theme, Notifications, Tier, User */}
            <div className="flex items-center gap-2">
              {/* Theme Picker */}
              <div ref={themeRef} className="relative">
                <button
                  onClick={() => setShowThemes(!showThemes)}
                  aria-label="Change environmental theme"
                  className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm flex items-center gap-1"
                >
                  <span>🎨</span>
                </button>

                {showThemes && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 p-2 rounded-xl shadow-xl border z-50 space-y-1 animate-fade-in"
                    style={{
                      backgroundColor: "var(--bg-card)",
                      borderColor: "var(--border)",
                    }}
                  >
                    <p className="text-[10px] font-bold uppercase tracking-wider theme-text-muted px-2 py-1">
                      Photographic Themes
                    </p>
                    {THEMES.map((th) => (
                      <button
                        key={th.key}
                        onClick={() => {
                          setTheme(th.key);
                          setShowThemes(false);
                        }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition-colors ${
                          theme === th.key
                            ? "bg-sky-500/15 text-sky-600 font-bold"
                            : "hover:bg-black/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span>{th.emoji}</span>
                          <span>{th.name}</span>
                        </span>
                        {theme === th.key && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Notification Center */}
              {user && (
                <div ref={notifRef} className="relative">
                  <button
                    onClick={() => {
                      setShowNotifs(!showNotifs);
                    }}
                    aria-label="Notification center"
                    className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-sm relative"
                  >
                    <span>🔔</span>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center animate-pulse">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                  </button>

                  {showNotifs && (
                    <div
                      className="absolute right-0 top-full mt-2 w-80 p-2 rounded-xl shadow-2xl border z-50 animate-fade-in"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="flex items-center justify-between pb-2 mb-2 border-b px-2" style={{ borderColor: "var(--border)" }}>
                        <span className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                          Notifications ({unreadCount} unread)
                        </span>
                        {unreadCount > 0 && (
                          <button
                            onClick={handleMarkAllRead}
                            className="text-[11px] text-sky-600 hover:underline font-semibold"
                          >
                            Mark all read
                          </button>
                        )}
                      </div>

                      {notifications.length === 0 ? (
                        <p className="text-xs theme-text-muted text-center py-6">
                          No notifications received yet.
                        </p>
                      ) : (
                        <div className="space-y-1 max-h-72 overflow-y-auto">
                          {notifications.slice(0, 10).map((n) => (
                            <Link
                              key={n.id}
                              href={n.link || "/dashboard"}
                              onClick={() => setShowNotifs(false)}
                              className={`block p-2 rounded-lg text-xs transition-colors ${
                                !n.read
                                  ? "bg-sky-500/10 font-medium"
                                  : "hover:bg-black/5 dark:hover:bg-white/5 theme-text-muted"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-0.5">
                                <span className="font-bold text-[11px] text-sky-600">
                                  {n.title || "CivicPulse Update"}
                                </span>
                                <span className="text-[9px] theme-text-muted">
                                  {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                </span>
                              </div>
                              <p className="text-[11px] leading-snug">
                                {n.messageParams?.status
                                  ? `Case status changed to ${n.messageParams.status}.`
                                  : n.messageKey}
                              </p>
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Plan Tier Badge */}
              <button
                onClick={() => setShowPlanModal(true)}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-colors hover:shadow-sm"
                style={{
                  borderColor: activePlan.color,
                  backgroundColor: "var(--bg-card)",
                  color: activePlan.color,
                }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: activePlan.color }} />
                <span>{activePlan.name}</span>
              </button>

              {/* User Account / Auth Menu */}
              {user ? (
                <div ref={userRef} className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-1.5 py-1 px-2.5 rounded-lg border hover:bg-black/5 transition-colors"
                    style={{ borderColor: "var(--border)" }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white uppercase"
                      style={{ backgroundColor: "var(--accent)" }}
                    >
                      {user.name.charAt(0)}
                    </div>
                    <span className="text-xs font-bold hidden sm:inline" style={{ color: "var(--text-primary)" }}>
                      {user.name.split(" ")[0]}
                    </span>
                  </button>

                  {showUserMenu && (
                    <div
                      className="absolute right-0 top-full mt-2 w-52 p-2 rounded-xl shadow-xl border z-50 animate-fade-in"
                      style={{
                        backgroundColor: "var(--bg-card)",
                        borderColor: "var(--border)",
                      }}
                    >
                      <div className="p-2 border-b mb-1" style={{ borderColor: "var(--border)" }}>
                        <p className="text-xs font-bold" style={{ color: "var(--text-primary)" }}>
                          {user.name}
                        </p>
                        <p className="text-[11px] theme-text-muted truncate">{user.email}</p>
                        <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-sky-500/15 text-sky-600 capitalize">
                          {user.role} Account
                        </span>
                      </div>

                      <Link
                        href="/dashboard"
                        onClick={() => setShowUserMenu(false)}
                        className="block px-2.5 py-1.5 rounded text-xs hover:bg-black/5 transition-colors"
                      >
                        📊 Central Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          setShowPlanModal(true);
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded text-xs hover:bg-black/5 transition-colors"
                      >
                        🌱 Tier: {activePlan.name}
                      </button>
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          logout();
                          router.push("/");
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded text-xs text-red-500 hover:bg-red-50 transition-colors font-semibold"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  href="/login"
                  className="theme-btn text-xs py-1.5 px-3.5 font-bold"
                >
                  Sign In
                </Link>
              )}

              {/* Mobile Menu Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 rounded-lg hover:bg-black/5 text-lg theme-text-muted"
                aria-label="Toggle navigation"
              >
                {mobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            className="lg:hidden p-4 border-t space-y-2 animate-fade-in"
            style={{
              backgroundColor: "var(--bg-card)",
              borderColor: "var(--border)",
            }}
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-semibold hover:bg-black/5"
              >
                <span>{link.icon}</span>
                <span>{link.label}</span>
              </Link>
            ))}
            <div className="pt-2 border-t flex items-center justify-between">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowPlanModal(true);
                }}
                className="text-xs font-bold text-sky-600"
              >
                Plan: {activePlan.name}
              </button>
              {user && (
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    logout();
                  }}
                  className="text-xs font-bold text-red-500"
                >
                  Sign Out
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Plan Modal Component */}
      <PlanModal isOpen={showPlanModal} onClose={() => setShowPlanModal(false)} />
    </>
  );
}
