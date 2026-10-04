"use client";
import { create } from "zustand";

export type Theme =
  | "cleanairday"
  | "ecogreen"
  | "nightpatrol"
  | "highvisibility"
  | "livingplanet"
  | "alertmode";
export type Language = "en" | "hi" | "ta";

export type UserRole = "citizen" | "moderator" | "authority" | "worker" | "admin";

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  preferredLanguage: string;
}

interface AppState {
  theme: Theme;
  language: Language;
  user: User | null;
  token: string | null;
  unreadCount: number;
  activePlanId: string;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setUnreadCount: (count: number) => void;
  setActivePlan: (id: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "cleanairday",
  language: "en",
  user: null,
  token: null,
  unreadCount: 0,
  activePlanId: "starter",

  setTheme: (theme) => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-theme", theme);
      localStorage.setItem("theme", theme);
    }
    set({ theme });
  },

  setLanguage: (language) => {
    if (typeof window !== "undefined") {
      document.documentElement.setAttribute("data-lang", language);
      localStorage.setItem("language", language);
    }
    set({ language });
  },

  setUser: (user) => set({ user }),
  setToken: (token) => {
    if (typeof window !== "undefined") {
      if (token) localStorage.setItem("token", token);
      else localStorage.removeItem("token");
    }
    set({ token });
  },

  setUnreadCount: (unreadCount) => set({ unreadCount }),

  setActivePlan: (activePlanId) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("civic_plan", activePlanId);
    }
    set({ activePlanId });
  },

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    set({ user: null, token: null, unreadCount: 0 });
  },
}));
