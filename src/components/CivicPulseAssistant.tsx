"use client";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, Theme } from "@/store/appStore";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  action?: {
    label: string;
    route?: string;
    theme?: Theme;
  };
  timestamp: string;
}

let messageSeq = 1;

const KNOWLEDGE_BASE: Array<{
  triggers: string[];
  answer: string;
  action?: { label: string; route?: string; theme?: Theme };
}> = [
  {
    triggers: [
      "how do i report",
      "report pollution",
      "new report",
      "submit report",
      "file a complaint",
      "how to report",
    ],
    answer:
      "To report an environmental hazard:\n1. Click the 'Report' button in the navigation or on the dashboard.\n2. Select the hazard category (e.g. Waste, Industrial, Sewage, Burning).\n3. Assess severity (Low, Medium, High, Critical).\n4. Enter a factual description (minimum 10 characters).\n5. Use GPS auto-detect or enter your landmark address.\n6. Optionally attach an image evidence photo.\n7. Review and submit! You will receive an official CP- tracking ID.",
    action: { label: "📷 Report Pollution Now", route: "/report" },
  },
  {
    triggers: [
      "how do i track",
      "track my report",
      "where can i see my reports",
      "find report",
      "my reports",
      "what are my reports",
    ],
    answer:
      "You can track any report by its tracking ID (e.g. CP-1042) or view your personal submission history on the Dashboard under the 'My Reports' filter tab. Click any report to view its full case timeline, assigned municipal team, and verification status.",
    action: { label: "📊 Go to Dashboard", route: "/dashboard" },
  },
  {
    triggers: [
      "under review",
      "what does under review mean",
      "what does verified mean",
      "report statuses",
      "status flow",
      "lifecycle",
    ],
    answer:
      "CivicPulse uses a realistic case management lifecycle:\n• Submitted: Citizen report recorded in the civic registry.\n• Under Review: Case triaged by a civic moderator for validity.\n• Verified: Field authenticity confirmed.\n• Assigned: Dispatched to a municipal department and rapid response squad.\n• In Progress: Cleanup and physical remediation underway.\n• Resolved: Official remediation completed with public verification note.",
  },
  {
    triggers: [
      "confirm",
      "how do i confirm",
      "community confirmation",
      "have you also noticed",
      "confirm issue",
    ],
    answer:
      "Community Confirmation allows nearby citizens to verify that they have also observed a reported pollution hazard. On any report details page, click the 'Confirm Issue' button. Confirmations are stored in the database, prevent self-confirmation, and help municipal authorities prioritize persistent community issues!",
    action: { label: "🗺️ Explore Reports to Confirm", route: "/map" },
  },
  {
    triggers: [
      "hotspots",
      "where can i see hotspots",
      "pollution hotspot",
      "recurring hotspot",
      "clusters",
    ],
    answer:
      "Hotspots are detected by our backend system when multiple pollution reports cluster in the same geographic locality. You can inspect active hotspots on the Interactive Map (with pulsing red markers) and view top affected zones on the City Stats & Insights page.",
    action: { label: "🗺️ View Live Hotspots Map", route: "/map" },
  },
  {
    triggers: [
      "who can resolve",
      "resolve a report",
      "who resolves",
      "authority",
      "worker",
      "resolution",
    ],
    answer:
      "Reports can only be resolved by authorized Municipal Authorities and Administrators. When remediating an issue, authorities record a public resolution note, responsible department, and optionally attach a post-remediation audit photo.",
  },
  {
    triggers: [
      "official contacts",
      "emergency",
      "where are official contacts",
      "phone number",
      "government helpline",
      "cpcb",
      "dpcc",
    ],
    answer:
      "CivicPulse provides a dedicated 'Official Contacts' directory with verified telephone numbers and portals for statutory agencies including the Central Pollution Control Board (CPCB), State Pollution Control Committees, Emergency Dispatch (112), and Municipal Solid Waste Control Rooms.",
    action: { label: "🏛️ Open Official Contacts", route: "/contacts" },
  },
  {
    triggers: ["role", "roles", "moderator", "admin", "citizen", "authority"],
    answer:
      "CivicPulse supports 4 role-aware tiers:\n• Citizen: Submit reports, track cases, confirm community issues, view insights.\n• Moderator: Review incoming reports, triage validity, filter duplicates.\n• Authority: Operations queue, assign teams, conduct remediation, resolve cases.\n• Admin: Full platform governance, user management, official contacts directory, audit logs.",
  },
  {
    triggers: ["theme", "change theme", "dark mode", "palette", "background"],
    answer:
      "You can switch between photographic environmental themes using the 🎨 palette icon in the navigation bar. Themes include Clean Modern City, Green Forest Canopy, Mountain Twilight, Ocean Waters, Sustainable Future City, and Alert Mode!",
  },
  {
    triggers: ["plans", "pricing", "civic plus", "starter", "tier", "organization"],
    answer:
      "CivicPulse offers 4 civic tiers: Civic Starter (free for citizens), Civic Plus (ward stewards & analytics), Civic Impact (NGOs & resident welfare associations), and Civic Intelligence (municipal fleet routing and GIS integration).",
  },
];

const SUGGESTED_QUESTIONS = [
  "How do I report pollution?",
  "What does Under Review mean?",
  "How do I confirm an issue?",
  "Where are official contacts?",
  "Where can I see hotspots?",
  "What are my reports?",
];

export function CivicPulseAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial-assistant-msg",
      sender: "assistant",
      text: "Hello! I am your CivicPulse Assistant. How can I help you report an environmental issue, track a case, or navigate municipal resources today?",
      timestamp: "Just now",
    },
  ]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isTyping]);

  const handleSend = (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query) return;

    const currentSeq = messageSeq++;
    const now = new Date();
    const timeString = `${now.getHours().toString().padStart(2, "0")}:${now.getMinutes().toString().padStart(2, "0")}`;

    const userMsg: Message = {
      id: `usr-${currentSeq}`,
      sender: "user",
      text: query,
      timestamp: timeString,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput("");
    setIsTyping(true);

    const lower = query.toLowerCase();
    const match = KNOWLEDGE_BASE.find((k) =>
      k.triggers.some((t) => lower.includes(t))
    );

    setTimeout(() => {
      let replyText =
        "I'm here to assist with CivicPulse environmental workflows: reporting pollution, checking case statuses, community confirmations, finding official government helplines, or exploring city stats. Click one of the quick options or ask a question!";
      let action = undefined;

      if (match) {
        replyText = match.answer;
        action = match.action;
      } else if (lower.includes("hello") || lower.includes("hi") || lower.includes("hey")) {
        replyText = "Hello! What civic environmental question or report can I assist you with?";
      } else if (lower.includes("thank")) {
        replyText = "You're very welcome! Together we keep our civic spaces clean and sustainable.";
      }

      const botSeq = messageSeq++;
      const replyMsg: Message = {
        id: `ast-${botSeq}`,
        sender: "assistant",
        text: replyText,
        action,
        timestamp: timeString,
      };

      setMessages((prev) => [...prev, replyMsg]);
      setIsTyping(false);
    }, 400);
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label="CivicPulse AI Assistant"
        className="fixed bottom-5 right-5 z-40 p-3.5 rounded-full shadow-2xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center text-white"
        style={{
          backgroundColor: "var(--accent)",
          boxShadow: "0 10px 25px -3px rgba(2, 132, 199, 0.4)",
        }}
      >
        <span className="text-xl">{isOpen ? "✕" : "💬"}</span>
      </button>

      {/* Assistant Window */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="CivicPulse Assistant"
          className="fixed bottom-20 right-4 sm:right-6 z-40 w-[92vw] sm:w-96 rounded-2xl shadow-2xl border flex flex-col overflow-hidden animate-fade-in"
          style={{
            height: "520px",
            maxHeight: "80vh",
            backgroundColor: "var(--bg-card)",
            borderColor: "var(--border)",
            backdropFilter: "blur(12px)",
          }}
        >
          {/* Header */}
          <div
            className="p-3.5 border-b flex items-center justify-between"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">🌱</span>
              <div>
                <h3 className="font-bold text-xs" style={{ color: "var(--text-primary)" }}>
                  CivicPulse Assistant
                </h3>
                <p className="text-[10px] theme-text-muted flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  <span>Civic Knowledge Engine</span>
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-1 rounded text-xs theme-text-muted hover:bg-black/5"
            >
              ✕
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="p-2 border-b overflow-x-auto flex gap-1.5 scrollbar-none" style={{ borderColor: "var(--border)" }}>
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-[11px] py-1 px-2 rounded-full whitespace-nowrap bg-black/5 dark:bg-white/5 hover:bg-sky-500/10 hover:text-sky-600 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Messages */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 text-xs">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${
                  m.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[85%] p-3 rounded-2xl whitespace-pre-line leading-relaxed ${
                    m.sender === "user"
                      ? "bg-sky-600 text-white rounded-br-none"
                      : "bg-black/5 dark:bg-white/10 rounded-bl-none"
                  }`}
                  style={{
                    color: m.sender === "user" ? "#ffffff" : "var(--text-primary)",
                  }}
                >
                  {m.text}

                  {m.action && (
                    <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/10">
                      <button
                        onClick={() => {
                          if (m.action?.route) {
                            router.push(m.action.route);
                            setIsOpen(false);
                          }
                        }}
                        className="theme-btn text-[11px] py-1 px-2.5 font-bold w-full"
                      >
                        {m.action.label}
                      </button>
                    </div>
                  )}
                </div>
                <span className="text-[9px] theme-text-muted mt-1 px-1">{m.timestamp}</span>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-1.5 p-2 text-xs theme-text-muted">
                <span className="spinner" />
                <span>Searching civic knowledge base...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Footer */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="p-2.5 border-t flex gap-2"
            style={{
              backgroundColor: "var(--bg-secondary)",
              borderColor: "var(--border)",
            }}
          >
            <input
              type="text"
              placeholder="Ask an environmental or report question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="theme-input text-xs flex-1"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="theme-btn text-xs py-1.5 px-3 font-bold disabled:opacity-40"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </>
  );
}
