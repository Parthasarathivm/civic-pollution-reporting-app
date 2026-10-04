"use client";
import { useEffect, useRef, useCallback } from "react";

export interface MapReport {
  id: number;
  category: string;
  severity: string;
  priority?: string;
  lat: number;
  lng: number;
  address?: string | null;
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
  plastic: "#0284c7",
  sewage: "#0d9488",
  noise: "#e11d48",
  soil: "#84cc16",
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
  plastic: "🧴",
  sewage: "🚰",
  noise: "📢",
  soil: "🌱",
  other: "⚠️",
};

interface MapViewProps {
  reports: MapReport[];
  selectedReport?: MapReport | null;
  onSelectReport?: (r: MapReport | null) => void;
  routeIds?: number[];
  height?: string;
}

let leafletCssLoaded = false;

export function MapView({
  reports,
  selectedReport,
  onSelectReport,
  routeIds,
  height = "520px",
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersLayerRef = useRef<any>(null);
  const initializedRef = useRef(false);

  const renderMarkers = useCallback((L: any) => {
    if (!markersLayerRef.current) return;
    markersLayerRef.current.clearLayers();

    reports.forEach((report) => {
      const isRecurring = report.isRecurringHotspot;
      const catColor = CATEGORY_COLORS[report.category] || "#6b7280";
      const sevColor = SEVERITY_COLORS[report.severity] || "#f59e0b";
      const iconChar = CATEGORY_ICONS[report.category] || "⚠️";
      const size = isRecurring ? 42 : 32;

      const iconHtml = isRecurring
        ? `<div style="position:relative;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;">
            <div style="position:absolute;inset:0;border-radius:50%;background:rgba(239,68,68,0.3);animation:pulse 2s infinite;"></div>
            <div style="position:relative;z-index:2;width:${size * 0.65}px;height:${size * 0.65}px;border-radius:50%;background:#ef4444;border:2px solid white;color:white;display:flex;align-items:center;justify-content:center;font-size:14px;box-shadow:0 3px 8px rgba(0,0,0,0.3);">${iconChar}</div>
          </div>`
        : `<div style="position:relative;width:${size}px;height:${size + 6}px;">
            <div style="width:${size}px;height:${size}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:${catColor};border:2px solid ${sevColor};box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>
            <div style="position:absolute;top:44%;left:50%;transform:translate(-50%,-60%);font-size:13px;line-height:1;">${iconChar}</div>
          </div>`;

      const divIcon = L.divIcon({
        html: iconHtml,
        className: "",
        iconSize: L.point(size, size + 6),
        iconAnchor: L.point(size / 2, size + 6),
        popupAnchor: L.point(0, -(size + 6)),
      });

      const popupContent = document.createElement("div");
      popupContent.style.minWidth = "180px";
      popupContent.style.fontFamily = "system-ui, sans-serif";
      popupContent.style.fontSize = "12px";

      popupContent.innerHTML = `
        <div style="font-weight:700;margin-bottom:4px;display:flex;align-items:center;justify-content:between;gap:6px;">
          <span style="font-size:15px;">${iconChar}</span>
          <span style="text-transform:capitalize;font-size:13px;">${report.category}</span>
          <span style="margin-left:auto;font-family:monospace;font-size:10px;background:#e2e8f0;padding:1px 4px;border-radius:3px;">CP-${report.id}</span>
        </div>
        <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px;">
          <span style="background:${sevColor};color:white;padding:1px 6px;border-radius:99px;font-size:10px;font-weight:700;text-transform:uppercase;">${report.severity}</span>
          <span style="background:#f1f5f9;color:#475569;padding:1px 6px;border-radius:99px;font-size:10px;text-transform:capitalize;">${report.status.replace("_", " ")}</span>
        </div>
        <p style="color:#64748b;margin:0 0 6px 0;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${report.description || report.address || "Environmental hazard reported."}</p>
        <a href="/report/${report.id}" style="display:block;text-align:center;background:#0284c7;color:white;text-decoration:none;padding:4px 8px;border-radius:6px;font-weight:600;font-size:11px;">View Case Details →</a>
      `;

      const marker = L.marker([report.lat, report.lng], { icon: divIcon })
        .bindPopup(popupContent)
        .addTo(markersLayerRef.current);

      marker.on("click", () => onSelectReport?.(report));

      if (selectedReport?.id === report.id) {
        marker.openPopup();
      }
    });

    if (routeIds && routeIds.length > 1) {
      const coords = routeIds
        .map((id) => reports.find((r) => r.id === id))
        .filter(Boolean)
        .map((r): [number, number] => [r!.lat, r!.lng]);

      if (coords.length > 1) {
        L.polyline(coords, {
          color: "#0ea5e9",
          weight: 3.5,
          dashArray: "6 6",
          opacity: 0.85,
        }).addTo(markersLayerRef.current);
      }
    }
  }, [reports, selectedReport, routeIds, onSelectReport]);

  const initMap = useCallback(async () => {
    if (!containerRef.current || initializedRef.current) return;
    initializedRef.current = true;

    if (!leafletCssLoaded) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
      leafletCssLoaded = true;
    }

    const L = (await import("leaflet")).default;

    delete (L.Icon.Default.prototype as { _getIconUrl?: unknown })._getIconUrl;
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
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    renderMarkers(L);
  }, [reports, renderMarkers]);

  useEffect(() => {
    initMap();
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        initializedRef.current = false;
      }
    };
  }, [initMap]);

  useEffect(() => {
    if (mapInstanceRef.current) {
      import("leaflet").then((mod) => {
        renderMarkers(mod.default);
      });
    }
  }, [renderMarkers]);

  return (
    <div style={{ height, borderRadius: 12, overflow: "hidden", position: "relative", zIndex: 1 }}>
      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </div>
  );
}
