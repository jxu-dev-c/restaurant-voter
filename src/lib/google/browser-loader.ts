"use client";

import {
  importLibrary,
  setOptions,
  type LibraryMap,
} from "@googlemaps/js-api-loader";

let configuredApiKey: string | null = null;

export class GoogleMapsBrowserConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GoogleMapsBrowserConfigurationError";
  }
}

function resolveBrowserApiKey(apiKey?: string): string {
  const value =
    apiKey?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_BROWSER_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (!value) {
    throw new GoogleMapsBrowserConfigurationError(
      "Google Maps is unavailable because the browser API key is not configured.",
    );
  }
  return value;
}

export async function loadGoogleMapsLibrary<
  TName extends keyof LibraryMap,
>(name: TName, apiKey?: string): Promise<LibraryMap[TName]> {
  const resolvedApiKey = resolveBrowserApiKey(apiKey);

  if (configuredApiKey && configuredApiKey !== resolvedApiKey) {
    throw new GoogleMapsBrowserConfigurationError(
      "Google Maps has already been initialized with a different browser API key.",
    );
  }

  if (!configuredApiKey) {
    setOptions({
      key: resolvedApiKey,
      v: "weekly",
      authReferrerPolicy: "origin",
    });
    configuredApiKey = resolvedApiKey;
  }

  return importLibrary(name);
}
