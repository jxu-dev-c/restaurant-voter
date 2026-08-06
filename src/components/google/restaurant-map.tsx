"use client";

import { useEffect, useRef, useState } from "react";
import type { InteractiveCandidateView } from "@/lib/domain/types";
import { loadGoogleMapsLibrary } from "@/lib/google/browser-loader";
import { loadBrowserPlaceDetails } from "@/lib/google/browser-place";
import type { LatLngLiteral } from "@/lib/google/types";

function markerContent(label: string, center = false) {
  const element = document.createElement("div");
  element.textContent = label;
  element.style.cssText = [
    "display:grid",
    "place-items:center",
    "width:36px",
    "height:36px",
    "border:3px solid white",
    "border-radius:50% 50% 50% 0",
    `background:${center ? "#1d2a22" : "#ff6f3d"}`,
    "color:white",
    "font:800 12px system-ui",
    "box-shadow:0 6px 18px rgba(29,42,34,.22)",
    "transform:rotate(-45deg)",
  ].join(";");
  const inner = document.createElement("span");
  inner.textContent = label;
  inner.style.transform = "rotate(45deg)";
  element.replaceChildren(inner);
  return element;
}

export function RestaurantMap({
  center,
  centerLabel,
  candidates,
}: {
  center: LatLngLiteral;
  centerLabel: string;
  candidates: InteractiveCandidateView[];
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Loading map…");
  const centerLat = center.lat;
  const centerLng = center.lng;
  const candidateSnapshot = JSON.stringify(candidates);

  useEffect(() => {
    let active = true;
    const markers: Array<{ map: unknown | null }> = [];
    const mapCenter = { lat: centerLat, lng: centerLng };
    const mapCandidates = JSON.parse(candidateSnapshot) as InteractiveCandidateView[];

    void Promise.all([
      loadGoogleMapsLibrary("maps"),
      loadGoogleMapsLibrary("marker"),
      loadGoogleMapsLibrary("core"),
    ])
      .then(async ([{ Map }, { AdvancedMarkerElement }, { LatLngBounds }]) => {
        if (!active || !mapRef.current) return;
        const map = new Map(mapRef.current, {
          center: mapCenter,
          zoom: 13,
          mapId: process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID",
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
        });
        const bounds = new LatLngBounds();
        bounds.extend(mapCenter);
        markers.push(
          new AdvancedMarkerElement({
            map,
            position: mapCenter,
            title: centerLabel,
            content: markerContent("HQ", true),
          }),
        );

        const places = await Promise.all(
          mapCandidates.map(async (candidate) => ({
            candidate,
            details: await loadBrowserPlaceDetails(candidate.placeId),
          })),
        );
        if (!active) return;

        for (const [index, item] of places.entries()) {
          if (!item.details.ok || !item.details.data.location) continue;
          bounds.extend(item.details.data.location);
          markers.push(
            new AdvancedMarkerElement({
              map,
              position: item.details.data.location,
              title: item.details.data.displayName ?? item.candidate.fallbackLabel,
              content: markerContent(String(index + 1)),
            }),
          );
        }
        if (places.length > 0) map.fitBounds(bounds, 48);
        setStatus("Map ready.");
      })
      .catch(() => {
        if (active) setStatus("Google Map is unavailable. Use the restaurant list below.");
      });

    return () => {
      active = false;
      for (const marker of markers) marker.map = null;
    };
  }, [candidateSnapshot, centerLabel, centerLat, centerLng]);

  return (
    <div>
      <div
        ref={mapRef}
        className="h-[360px] overflow-hidden rounded-3xl border border-line bg-leaf-soft sm:h-[430px]"
        role="region"
        aria-label={`Map of restaurants around ${centerLabel}`}
      />
      <p className="mt-2 text-sm text-muted" role="status" aria-live="polite">{status}</p>
    </div>
  );
}
