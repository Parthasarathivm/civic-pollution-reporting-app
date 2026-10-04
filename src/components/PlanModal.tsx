"use client";
import { useState } from "react";
import { CIVIC_PLANS, CivicPlan } from "@/lib/plans";
import { useAppStore } from "@/store/appStore";

interface PlanModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PlanModal({ isOpen, onClose }: PlanModalProps) {
  const { activePlanId, setActivePlan } = useAppStore();
  const [billingCycle, setBillingCycle] = useState<"monthly" | "annual">("annual");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectPlan = (plan: CivicPlan) => {
    setActivePlan(plan.id);
    setStatusMessage(`Active tier switched to ${plan.name} in Civic Sandbox mode.`);
    setTimeout(() => {
      setStatusMessage(null);
      onClose();
    }, 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="plans-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      style={{ backgroundColor: "rgba(0, 0, 0, 0.75)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="theme-card max-w-5xl w-full my-auto max-h-[92vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--bg-card)",
          borderColor: "var(--border)",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.4)",
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b mb-4" style={{ borderColor: "var(--border)" }}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-2xl">🌱</span>
              <span
                className="text-xs font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                style={{ backgroundColor: "var(--accent-light)", color: "var(--accent)" }}
              >
                Civic Pulse Platform Tiers
              </span>
            </div>
            <h2 id="plans-modal-title" className="text-xl sm:text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Environmental Civic Intelligence Plans
            </h2>
            <p className="text-xs theme-text-muted mt-1">
              Designed for individual citizens, neighborhood associations, environmental NGOs, and municipal agencies.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="p-2 rounded-lg hover:bg-black/10 transition-colors text-base"
            style={{ color: "var(--text-muted)" }}
          >
            ✕
          </button>
        </div>

        {/* Sandbox Notice (Honest, No Fake Payments) */}
        <div
          className="mb-6 p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3"
          style={{
            backgroundColor: "var(--bg-secondary)",
            borderColor: "var(--border)",
          }}
        >
          <div className="flex items-center gap-2">
            <span className="text-lg">🧪</span>
            <div>
              <span className="font-bold" style={{ color: "var(--text-primary)" }}>
                Civic Sandbox Mode:
              </span>{" "}
              <span className="theme-text-muted">
                Commercial payment gateways are disabled in this demonstration deployment. You can freely toggle between tiers to test role and feature capabilities.
              </span>
            </div>
          </div>
          {statusMessage && (
            <span className="font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-950 px-3 py-1 rounded-full text-xs shrink-0 animate-fade-in">
              ✓ {statusMessage}
            </span>
          )}
        </div>

        {/* Billing Cycle Toggle */}
        <div className="flex justify-center mb-6">
          <div
            className="p-1 rounded-xl flex items-center gap-1 border"
            style={{ backgroundColor: "var(--bg-secondary)", borderColor: "var(--border)" }}
          >
            <button
              onClick={() => setBillingCycle("monthly")}
              className={`text-xs py-1.5 px-4 rounded-lg font-bold transition-all ${
                billingCycle === "monthly"
                  ? "bg-white dark:bg-slate-800 shadow-sm text-sky-600"
                  : "theme-text-muted"
              }`}
            >
              Monthly Billing
            </button>
            <button
              onClick={() => setBillingCycle("annual")}
              className={`text-xs py-1.5 px-4 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
                billingCycle === "annual"
                  ? "bg-white dark:bg-slate-800 shadow-sm text-emerald-600"
                  : "theme-text-muted"
              }`}
            >
              <span>Annual Billing</span>
              <span className="text-[10px] bg-emerald-500/20 text-emerald-600 px-1.5 py-0.2 rounded-full font-bold">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          {CIVIC_PLANS.map((plan) => {
            const isCurrent = plan.id === activePlanId;
            const price = billingCycle === "annual" ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`theme-card flex flex-col justify-between border-2 transition-all ${
                  isCurrent ? "ring-2 ring-offset-2" : ""
                }`}
                style={{
                  borderColor: isCurrent ? plan.color : "var(--border)",
                  backgroundColor: isCurrent ? "rgba(2, 132, 199, 0.03)" : undefined,
                }}
              >
                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold uppercase tracking-wider" style={{ color: plan.color }}>
                      {plan.name}
                    </span>
                    {plan.badge && (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full text-white"
                        style={{ backgroundColor: plan.color }}
                      >
                        {plan.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] theme-text-muted mb-3 min-h-[32px]">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="mb-4 pb-3 border-b" style={{ borderColor: "var(--border)" }}>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
                        {price === 0 ? "Free" : `$${price}`}
                      </span>
                      {price > 0 && (
                        <span className="text-xs theme-text-muted">
                          {billingCycle === "annual" ? "/ year" : "/ month"}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] theme-text-muted block mt-0.5">
                      Target: {plan.audience}
                    </span>
                  </div>

                  {/* Features */}
                  <div className="space-y-2 mb-6">
                    <p className="text-[11px] font-bold uppercase tracking-wider theme-text-muted">
                      Key Capabilities:
                    </p>
                    {plan.features.map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5 text-xs">
                        <span style={{ color: f.included ? plan.color : "var(--text-muted)" }}>
                          {f.included ? "✓" : "–"}
                        </span>
                        <span
                          className={`text-[11px] leading-tight ${
                            f.included ? "font-medium" : "opacity-50 line-through theme-text-muted"
                          }`}
                        >
                          {f.text}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Select Button */}
                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all ${
                    isCurrent
                      ? "bg-black/10 dark:bg-white/10 theme-text-muted cursor-default"
                      : "theme-btn"
                  }`}
                  style={!isCurrent ? { backgroundColor: plan.color } : {}}
                >
                  {isCurrent ? "✓ Active Tier" : `Activate ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
