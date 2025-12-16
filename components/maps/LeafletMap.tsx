"use client";

import React from "react";

declare global {
  interface Window { L?: any; }
}

/**
 * Leaflet map wrapper (CDN-loaded) to keep dependencies light.
 * Production recommendation: install `leaflet` and bundle it instead of using CDN.
 */
export function LeafletMap({
  markers,
  center,
  zoom = 13,
}: {
  markers: { id: string; lat: number; lng: number; label?: string }[];
  center: { lat: number; lng: number };
  zoom?: number;
}) {
  const hostRef = React.useRef<HTMLDivElement | null>(null);
  const mapRef = React.useRef<any>(null);
  const markerRef = React.useRef<Map<string, any>>(new Map());

  const [ready, setReady] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function loadLeaflet() {
      if (window.L) return;

      // CSS
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      // Script
      await new Promise<void>((resolve, reject) => {
        if (document.getElementById("leaflet-js")) return resolve();
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Failed to load Leaflet from CDN."));
        document.body.appendChild(script);
      });
    }

    (async () => {
      try {
        await loadLeaflet();
        if (cancelled) return;

        const L = window.L;
        if (!L) throw new Error("Leaflet did not initialize.");

        if (!hostRef.current) return;

        // Init map once
        if (!mapRef.current) {
          mapRef.current = L.map(hostRef.current).setView([center.lat, center.lng], zoom);
          L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
            maxZoom: 19,
          }).addTo(mapRef.current);
        }
        setReady(true);
      } catch (e: any) {
        setErr(e.message ?? "Map failed to load.");
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers as new GPS points arrive
  React.useEffect(() => {
    if (!ready) return;
    const L = window.L;
    const map = mapRef.current;
    if (!L || !map) return;

    const nextIds = new Set(markers.map(m => m.id));

    // Remove stale
    for (const [id, mk] of markerRef.current.entries()) {
      if (!nextIds.has(id)) {
        map.removeLayer(mk);
        markerRef.current.delete(id);
      }
    }

    // Add/update
    for (const m of markers) {
      const existing = markerRef.current.get(m.id);
      if (!existing) {
        const mk = L.marker([m.lat, m.lng]).addTo(map);
        if (m.label) mk.bindPopup(m.label);
        markerRef.current.set(m.id, mk);
      } else {
        existing.setLatLng([m.lat, m.lng]);
        if (m.label) existing.bindPopup(m.label);
      }
    }
  }, [markers, ready]);

  // Recentre when first marker appears
  React.useEffect(() => {
    if (!ready) return;
    const map = mapRef.current;
    if (!map) return;
    if (markers.length) map.setView([markers[0].lat, markers[0].lng], zoom);
  }, [markers.length, ready, zoom]);

  return (
    <div className="space-y-2">
      {err && <div className="text-xs text-red-600">{err}</div>}
      <div ref={hostRef} className="h-[520px] w-full rounded-2xl border border-zinc-200" />
    </div>
  );
}
