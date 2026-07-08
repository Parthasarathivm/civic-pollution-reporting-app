"use client";
import { create } from "zustand";

export type Theme =
  | "cleanairday"
  | "nightpatrol"
  | "alertmode"
  | "ecogreen"
  | "highvisibility";
export type Language = "en" | "hi" | "ta";

export interface User {
  id: number;
  name: string;
  email: string;
  role: "citizen" | "worker" | "admin";
  preferredLanguage: string;
}

interface AppState {
  theme: Theme;
  language: Language;
  user: User | null;
  token: string | null;
  unreadCount: number;
  setTheme: (theme: Theme) => void;
  setLanguage: (lang: Language) => void;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  setUnreadCount: (count: number) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  theme: "cleanairday",
  language: "en",
  user: null,
  token: null,
  unreadCount: 0,

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

  logout: () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
    }
    set({ user: null, token: null, unreadCount: 0 });
  },
}));
