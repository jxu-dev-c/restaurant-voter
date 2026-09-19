"use client";

import { useEffect, useRef, useState } from "react";
import type { InteractiveCandidateView } from "@/lib/domain/types";
import { loadGoogleMapsLibrary } from "@/lib/google/browser-loader";
import { loadBrowserPlaceDetails } from "@/lib/google/browser-place";
import { googleMapsPlaceUrl } from "@/lib/google/formatters";
import type { GooglePlaceDetails, LatLngLiteral } from "@/lib/google/types";

function restaurantInfoContent(details: GooglePlaceDetails) {
  const content = document.createElement("div");
  content.style.cssText = "display:grid;gap:8px;color:#1f1c18;font:14px system-ui";

  if (details.rating !== null) {
    const rating = document.createElement("p");
    rating.textContent = `${details.rating} ★${details.userRatingCount !== null ? ` (${details.userRatingCount} reviews)` : ""}`;
    content.append(rating);
  }
  if (details.formattedAddress) {
    const address = document.createElement("p");
    address.textContent = details.formattedAddress;
    content.append(address);
  }

  const link = document.createElement("a");
  link.textContent = "View on Google Maps";
  link.href = googleMapsPlaceUrl(details.placeId);
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  link.style.cssText = "color:#0058bd;text-decoration:underline";
  content.append(link);
  return content;
}

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
    `background:${center ? "#1f1c18" : "#0058bd"}`,
    "color:white",
    "font:500 12px system-ui",
    "box-shadow:0 2px 12px rgba(31,28,24,.2)",
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
    const listeners: Array<{ remove: () => void }> = [];
    let infoWindow: { close: () => void } | undefined;
    const mapCenter = { lat: centerLat, lng: centerLng };
    const mapCandidates = JSON.parse(candidateSnapshot) as InteractiveCandidateView[];

    void Promise.all([
      loadGoogleMapsLibrary("maps"),
      loadGoogleMapsLibrary("marker"),
      loadGoogleMapsLibrary("core"),
    ])
      .then(async ([{ Map, InfoWindow }, { AdvancedMarkerElement }, { LatLngBounds }]) => {
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
        const restaurantInfoWindow = new InfoWindow({ maxWidth: 300 });
        infoWindow = restaurantInfoWindow;
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
          const details = item.details.data;
          const name = details.displayName ?? item.candidate.fallbackLabel;
          const marker = new AdvancedMarkerElement({
            map,
            position: details.location,
            title: name,
            content: markerContent(String(index + 1)),
          });
          markers.push(marker);
          listeners.push(marker.addListener("click", () => {
            restaurantInfoWindow.close();
            const heading = document.createElement("strong");
            heading.textContent = name;
            restaurantInfoWindow.setOptions({ ariaLabel: name, headerContent: heading });
            restaurantInfoWindow.setContent(restaurantInfoContent(details));
            restaurantInfoWindow.open({ map, anchor: marker });
          }));
        }
        if (places.length > 0) map.fitBounds(bounds, 48);
        setStatus("Map ready.");
      })
      .catch(() => {
        if (active) setStatus("Google Map is unavailable. Use the restaurant list below.");
      });

    return () => {
      active = false;
      infoWindow?.close();
      for (const listener of listeners) listener.remove();
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
