"use client";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppStore } from "@/store/appStore";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { setUser, setToken } = useAppStore();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"citizen" | "worker">("citizen");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setToken(data.token);
      setUser(data.user);
      router.push(data.user.role !== "citizen" ? "/dashboard" : "/map");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("auth.invalidCredentials"));
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone, role }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess(t("auth.registerSuccess"));
      setMode("login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("common.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "var(--bg-primary)" }}
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🌬️</div>
          <h1
            className="text-2xl font-bold"
            style={{ color: "var(--text-primary)" }}
          >
            {mode === "login" ? t("auth.loginTitle") : t("auth.registerTitle")}
          </h1>
        </div>

        <div className="theme-card">
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
            >
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div
              className="mb-4 p-3 rounded-lg text-sm"
              style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
            >
              ✅ {success}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="theme-input"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("auth.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="theme-input"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="theme-btn w-full justify-center py-3"
              >
                {loading ? t("auth.loggingIn") : t("auth.loginBtn")}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("auth.name")}
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="theme-input"
                  required
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("auth.email")}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="theme-input"
                  required
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("auth.phone")}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="theme-input"
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("auth.password")}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="theme-input"
                  required
                />
              </div>
              <div>
                <label
                  className="block text-sm font-medium mb-1"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {t("auth.roleLabel")}
                </label>
                <select
                  value={role}
                  onChange={(e) =>
                    setRole(e.target.value as "citizen" | "worker")
                  }
                  className="theme-input"
                >
                  <option value="citizen">{t("auth.roleCitizen")}</option>
                  <option value="worker">{t("auth.roleWorker")}</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="theme-btn w-full justify-center py-3"
              >
                {loading ? t("auth.registering") : t("auth.registerBtn")}
              </button>
            </form>
          )}

          <div className="mt-4 text-center text-sm">
            <span style={{ color: "var(--text-muted)" }}>
              {mode === "login"
                ? t("auth.noAccount")
                : t("auth.haveAccount")}
            </span>{" "}
            <button
              onClick={() => {
                setMode(mode === "login" ? "register" : "login");
                setError("");
                setSuccess("");
              }}
              className="font-medium hover:underline"
              style={{ color: "var(--accent)" }}
            >
              {mode === "login"
                ? t("auth.switchToRegister")
                : t("auth.switchToLogin")}
            </button>
          </div>
        </div>

        {/* Demo credentials */}
        <div className="mt-4 theme-card text-sm">
          <p
            className="font-bold mb-2"
            style={{ color: "var(--text-secondary)" }}
          >
            🔑 Demo Credentials
          </p>
          <div className="space-y-1" style={{ color: "var(--text-muted)" }}>
            <p>
              <strong>Admin:</strong> admin@cleanair.demo / demo123
            </p>
            <p>
              <strong>Worker:</strong> worker@cleanair.demo / demo123
            </p>
            <p>
              <strong>Citizen:</strong> citizen@cleanair.demo / demo123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
