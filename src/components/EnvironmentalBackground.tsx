"use client";
import { useSyncExternalStore } from "react";
import { useAppStore, Theme } from "@/store/appStore";

interface ThemePhotoConfig {
  name: string;
  photoUrl: string;
  fallbackGradient: string;
  overlayStyle: string;
}

const THEME_PHOTOS: Record<Theme, ThemePhotoConfig> = {
  cleanairday: {
    name: "Clean Modern City",
    photoUrl: "https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=2000&q=80",
    fallbackGradient: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 50%, #38bdf8 100%)",
    overlayStyle: "rgba(12, 35, 60, 0.58)",
  },
  ecogreen: {
    name: "Green Forest & Urban Canopy",
    photoUrl: "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2000&q=80",
    fallbackGradient: "linear-gradient(135deg, #14532d 0%, #15803d 50%, #22c55e 100%)",
    overlayStyle: "rgba(10, 36, 18, 0.62)",
  },
  nightpatrol: {
    name: "Mountain Environment",
    photoUrl: "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2000&q=80",
    fallbackGradient: "linear-gradient(135deg, #090d16 0%, #1e293b 50%, #0f172a 100%)",
    overlayStyle: "rgba(10, 15, 26, 0.68)",
  },
  highvisibility: {
    name: "Ocean & Coastal Waters",
    photoUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80",
    fallbackGradient: "linear-gradient(135deg, #083344 0%, #0e7490 50%, #06b6d4 100%)",
    overlayStyle: "rgba(6, 30, 42, 0.64)",
  },
  livingplanet: {
    name: "Sustainable Future City",
    photoUrl: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?auto=format&fit=crop&w=2000&q=80",
    fallbackGradient: "linear-gradient(135deg, #04121e 0%, #082f49 50%, #0d9488 100%)",
    overlayStyle: "rgba(5, 18, 30, 0.66)",
  },
  alertmode: {
    name: "Environmental Alert",
    photoUrl: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?auto=format&fit=crop&w=2000&q=80",
    fallbackGradient: "linear-gradient(135deg, #2a0808 0%, #7f1d1d 50%, #b91c1c 100%)",
    overlayStyle: "rgba(35, 10, 10, 0.72)",
  },
};

function subscribeReducedMotion(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function getReducedMotionSnapshot() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot() {
  return false;
}

export function EnvironmentalBackground() {
  const theme = useAppStore((s) => s.theme);
  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getServerReducedMotionSnapshot
  );

  const currentTheme = THEME_PHOTOS[theme] || THEME_PHOTOS.cleanairday;

  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
        overflow: "hidden",
        backgroundColor: "#0b1320",
      }}
    >
      {/* Background Image Layer with Subtle Motion */}
      <div
        key={theme}
        style={{
          position: "absolute",
          inset: "-5%",
          width: "110%",
          height: "110%",
          backgroundImage: `url(${currentTheme.photoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
          backgroundRepeat: "no-repeat",
          animation: reducedMotion ? "none" : "subtleKenBurns 42s ease-in-out infinite alternate",
          transition: "opacity 1s ease-in-out",
          filter: "brightness(0.92) contrast(1.05)",
        }}
      />

      {/* Fallback gradient */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: currentTheme.fallbackGradient,
          opacity: 0.18,
          mixBlendMode: "color",
        }}
      />

      {/* Dark Readability & Contrast Overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: currentTheme.overlayStyle,
          backdropFilter: "blur(2px)",
          WebkitBackdropFilter: "blur(2px)",
        }}
      />

      {/* Subtle Vignette for clean focus */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 50% 30%, transparent 40%, rgba(5, 10, 18, 0.45) 100%)",
        }}
      />

      {/* Inline Keyframe Styles */}
      <style jsx>{`
        @keyframes subtleKenBurns {
          0% {
            transform: scale(1.02) translate(0, 0);
          }
          50% {
            transform: scale(1.06) translate(-1%, -0.8%);
          }
          100% {
            transform: scale(1.04) translate(0.8%, -1.2%);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          div {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
}
