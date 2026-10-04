"use client";
import { useState } from "react";
import { useAppStore } from "@/store/appStore";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const { setUser, setToken } = useAppStore();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
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
      if (!res.ok) throw new Error(data.error || "Login failed");
      setToken(data.token);
      setUser(data.user);
      // All authenticated users enter the same core CivicPulse application shell
      router.push("/dashboard");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
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
        body: JSON.stringify({ name, email, password, phone }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setSuccess("Account registered successfully! You can now log in.");
      setMode("login");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  function fillDemoAccount(demoEmail: string) {
    setEmail(demoEmail);
    setPassword("demo123");
    setError("");
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-transparent">
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link href="/" className="inline-block text-4xl mb-2">
            🌱
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            CivicPulse {mode === "login" ? "Portal Access" : "Citizen Registration"}
          </h1>
          <p className="text-xs theme-text-muted mt-1">
            Citizen-Powered Environmental Reporting Platform
          </p>
        </div>

        <div className="theme-card shadow-xl border" style={{ borderColor: "var(--border)" }}>
          {error && (
            <div
              className="mb-4 p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              style={{ backgroundColor: "#fee2e2", color: "#dc2626" }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              className="mb-4 p-3 rounded-lg text-xs font-semibold flex items-center gap-1.5"
              style={{ backgroundColor: "#dcfce7", color: "#16a34a" }}
            >
              <span>✅</span>
              <span>{success}</span>
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold theme-text-muted mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="theme-input text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-muted mb-1">
                  Password
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="theme-input text-xs w-full"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="theme-btn w-full text-xs py-2.5 font-bold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    <span>Signing In...</span>
                  </>
                ) : (
                  <span>Sign In to CivicPulse</span>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold theme-text-muted mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Your Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="theme-input text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-muted mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="name@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="theme-input text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-muted mb-1">
                  Password (min 6 characters) *
                </label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="theme-input text-xs w-full"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold theme-text-muted mb-1">
                  Phone (Optional)
                </label>
                <input
                  type="tel"
                  placeholder="+91..."
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="theme-input text-xs w-full"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="theme-btn w-full text-xs py-2.5 font-bold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    <span>Registering...</span>
                  </>
                ) : (
                  <span>Create Citizen Account</span>
                )}
              </button>
            </form>
          )}

          {/* Toggle Login/Register */}
          <div className="mt-4 pt-3 border-t text-center text-xs theme-text-muted" style={{ borderColor: "var(--border)" }}>
            {mode === "login" ? (
              <p>
                New community observer?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                  }}
                  className="text-sky-600 font-bold hover:underline"
                >
                  Register here
                </button>
              </p>
            ) : (
              <p>
                Already registered?{" "}
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className="text-sky-600 font-bold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>

          {/* Demo Sandbox Credentials */}
          <div className="mt-5 pt-3 border-t" style={{ borderColor: "var(--border)" }}>
            <span className="text-[10px] font-bold uppercase tracking-wider theme-text-muted block mb-2">
              🧪 Demonstration Sandbox Logins:
            </span>
            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <button
                type="button"
                onClick={() => fillDemoAccount("citizen@cleanair.demo")}
                className="py-1 px-2 rounded border text-left hover:bg-black/5 truncate"
                style={{ borderColor: "var(--border)" }}
              >
                🌱 <strong>Citizen</strong>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("moderator@cleanair.demo")}
                className="py-1 px-2 rounded border text-left hover:bg-black/5 truncate"
                style={{ borderColor: "var(--border)" }}
              >
                🛡️ <strong>Moderator</strong>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("authority@cleanair.demo")}
                className="py-1 px-2 rounded border text-left hover:bg-black/5 truncate"
                style={{ borderColor: "var(--border)" }}
              >
                ⚡ <strong>Authority</strong>
              </button>
              <button
                type="button"
                onClick={() => fillDemoAccount("admin@cleanair.demo")}
                className="py-1 px-2 rounded border text-left hover:bg-black/5 truncate"
                style={{ borderColor: "var(--border)" }}
              >
                ⚙️ <strong>Admin</strong>
              </button>
            </div>
            <p className="text-[10px] theme-text-muted mt-1.5 text-center">
              Password for all demo accounts: <code>demo123</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
