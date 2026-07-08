"use client";
import { useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";

export interface MapReport {
  id: number;
  category: string;
  severity: string;
  lat: number;
  lng: number;
  status: string;
  description: string | null;
  isRecurringHotspot: boolean;
  photoBeforeUrl: string | null;
  createdAt: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  garbage: "#78716c",
  burning: "#f97316",
  dust: "#d97706",
  smoke: "#6b7280",
  drainage: "#0ea5e9",
  industrial: "#8b5cf6",
  other: "#6b7280",
};

const SEVERITY_COLORS: Record<string, string> = {
  low: "#22c55e",
  medium: "#f59e0b",
  high: "#f97316",
  critical: "#ef4444",
};

const CATEGORY_ICONS: Record<string, string> = {
  garbage: "🗑️",
  burning: "🔥",
  dust: "💨",
  smoke: "🚗",
  drainage: "🌊",
  industrial: "🏭",
  other: "⚠️",
};

interface MapViewProps {
  reports: MapReport[];
  selectedReport?: MapReport | null;
  onSelectReport?: (r: MapReport | null) => void;
  routeIds?: number[];
  height?: string;
}

// We use a global flag to avoid re-initializing leaflet CSS
let leafletCssLoaded = false;

export function MapView({
  reports,
  selectedReport,
  onSelectReport,
  routeIds,
  height = "500px",
}: MapViewProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const initializedRef = useRef(false);

  const buildMap = useCallback(async () => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    // Load CSS once
    if (!leafletCssLoaded) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
      leafletCssLoaded = true;
    }

    const L = (await import("leaflet")).default;

    // Fix default markers
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    const center: [number, number] =
      reports.length > 0
        ? [
            reports.reduce((s, r) => s + r.lat, 0) / reports.length,
            reports.reduce((s, r) => s + r.lng, 0) / reports.length,
          ]
        : [28.6139, 77.209];

    const map = L.map(containerRef.current, {
      center,
      zoom: 12,
      zoomControl: true,
    });
    mapInstanceRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Add markers
    reports.forEach((report) => {
      const isRecurring = report.isRecurringHotspot;
      const catColor = CATEGORY_COLORS[report.category] || "#6b7280";
      const sevColor = SEVERITY_COLORS[report.severity] || "#f59e0b";
      const iconChar = CATEGORY_ICONS[report.category] || "⚠️";
      const size = isRecurring ? 44 : 34;

      const iconHtml = isRecurring
        ? `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.25);animation:pulse-ring 2s ease-out infinite;"></div>
            <div style="position:absolute;inset:${size * 0.15}px;border-radius:50%;background:rgba(239,68,68,0.45);"></div>
            <div style="position:relative;z-index:2;width:${size * 0.52}px;height:${size * 0.52}px;border-radius:50%;background:#ef4444;display:flex;align-items:center;justify-content:center;font-size:${Math.round(size * 0.28)}px;box-shadow:0 2px 8px rgba(0,0,0,0.4);">${iconChar}</div>
          </div>`
        : `<div style="position:relative;width:${size}px;height:${size + 6}px;">
            <div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${catColor};border:3px solid ${sevColor};box-shadow:0 2px 8px rgba(0,0,0,0.35);"></div>
            <div style="position:absolute;top:46%;left:50%;transform:translate(-50%,-60%);font-size:${Math.round(size * 0.4)}px;line-height:1;">${iconChar}</div>
          </div>`;

      const divIcon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: L.point(size, size + 6),
        iconAnchor: L.point(size / 2, size + 6),
        popupAnchor: L.point(0, -(size + 6)),
      });

      const popupHtml = `
        <div style="min-width:170px;font-family:'Inter',sans-serif;font-size:13px;">
          <div style="font-weight:700;margin-bottom:5px;display:flex;align-items:center;gap:5px;">
            <span>${iconChar}</span>
            <span style="text-transform:capitalize;">${report.category}</span>
          </div>
          <div style="display:flex;gap:4px;flex-wrap:wrap;margin-bottom:5px;">
            <span style="background:${sevColor};color:white;padding:1px 7px;border-radius:99px;font-size:11px;font-weight:600;">${report.severity}</span>
            ${isRecurring ? '<span style="color:#ef4444;font-size:11px;font-weight:700;">🔄 Recurring</span>' : ""}
          </div>
          ${report.description ? `<p style="font-size:12px;color:#666;margin:3px 0;">${report.description}</p>` : ""}
          <p style="font-size:11px;color:#999;margin:3px 0;">${report.status} · ${new Date(report.createdAt).toLocaleDateString()}</p>
          ${report.photoBeforeUrl ? `<img src="${report.photoBeforeUrl}" style="width:100%;height:70px;object-fit:cover;border-radius:6px;margin-top:5px;" alt="photo"/>` : ""}
        </div>`;

      const marker = L.marker([report.lat, report.lng], { icon: divIcon })
        .bindPopup(popupHtml)
        .addTo(map);

      marker.on("click", () => onSelectReport?.(report));

      if (selectedReport?.id === report.id) {
        marker.openPopup();
      }
    });

    // Draw route polyline
    if (routeIds && routeIds.length > 1) {
      const coords = routeIds
        .map((id) => reports.find((r) => r.id === id))
        .filter(Boolean)
        .map((r): [number, number] => [r!.lat, r!.lng]);

      if (coords.length > 1) {
        L.polyline(coords, {
          color: "#0ea5e9",
          weight: 3,
          dashArray: "8 5",
          opacity: 0.8,
        }).addTo(map);

        // Number the stops
        coords.forEach((coord, idx) => {
          const stopIcon = L.divIcon({
            html: `<div style="background:#0ea5e9;color:white;width:22px;height:22px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.3);">${idx + 1}</div>`,
            className: "",
            iconSize: L.point(22, 22),
            iconAnchor: L.point(11, 11),
          });
          L.marker(coord, { icon: stopIcon }).addTo(map);
        });
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    buildMap();
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initializedRef.current = false;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden" }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
