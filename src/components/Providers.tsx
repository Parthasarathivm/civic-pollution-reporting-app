"use client";
import { useEffect } from "react";
import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import { useAppStore } from "@/store/appStore";
import type { Theme, Language } from "@/store/appStore";

async function loadTranslations(lang: string) {
  try {
    const res = await fetch(`/locales/${lang}/translation.json`);
    const data = await res.json();
    i18n.addResourceBundle(lang, "translation", data, true, true);
  } catch (e) {
    console.error(`Failed to load ${lang} translations`, e);
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const { setTheme, setLanguage, setUser, setToken } = useAppStore();

  useEffect(() => {
    // Initialize from localStorage
    const savedTheme = (localStorage.getItem("theme") as Theme) || "cleanairday";
    const savedLang = (localStorage.getItem("language") as Language) || "en";
    const savedToken = localStorage.getItem("token");

    // Apply theme immediately
    document.documentElement.setAttribute("data-theme", savedTheme);
    document.documentElement.setAttribute("data-lang", savedLang);

    setTheme(savedTheme);

    // Load all translations upfront
    Promise.all([
      loadTranslations("en"),
      loadTranslations("hi"),
      loadTranslations("ta"),
    ]).then(() => {
      i18n.changeLanguage(savedLang);
      setLanguage(savedLang);
    });

    // Restore auth
    if (savedToken) {
      setToken(savedToken);
      // Verify token
      fetch("/api/auth/me", {
        headers: { Authorization: `Bearer ${savedToken}` },
      })
        .then((r) => r.json())
        .then((user) => {
          if (!user.error) setUser(user);
        })
        .catch(() => {});
    }
  }, [setTheme, setLanguage, setUser, setToken]);

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
}
