"use client";

import Image, { type ImageLoaderProps } from "next/image";

import {
  formatBusinessStatus,
  formatPriceLevel,
  googleMapsPlaceUrl,
} from "@/lib/google/formatters";
import type { GooglePlaceDetails } from "@/lib/google/types";

function googlePhotoLoader({ src }: ImageLoaderProps) {
  return src;
}

export function GooglePlaceDetailsView({
  place,
  compact = false,
  elevated = true,
  variant = "card",
}: {
  place: GooglePlaceDetails;
  compact?: boolean;
  elevated?: boolean;
  variant?: "card" | "admin-row";
}) {
  const mapsUri = place.googleMapsUri ?? googleMapsPlaceUrl(place.placeId);
  const rating =
    place.rating === null
      ? "Unavailable"
      : `${place.rating.toFixed(1)}${
          place.userRatingCount === null
            ? ""
            : ` (${place.userRatingCount.toLocaleString()})`
        }`;

  if (variant === "admin-row") {
    return (
      <div className="grid min-w-0 gap-4 sm:grid-cols-[136px_minmax(0,1fr)] sm:items-center">
        <figure className="overflow-hidden rounded-xl bg-slate-100">
          {place.photo?.uri ? (
            <Image
              alt={place.displayName ?? "Restaurant photo"}
              className="aspect-[4/3] h-full w-full object-cover"
              height={102}
              loader={googlePhotoLoader}
              sizes="(max-width: 639px) 100vw, 136px"
              src={place.photo.uri}
              unoptimized
              width={136}
            />
          ) : (
            <div
              aria-label="Photo unavailable"
              className="grid aspect-[4/3] place-items-center text-xs font-semibold text-slate-500"
              role="img"
            >
              No photo
            </div>
          )}
        </figure>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-slate-950">
            {place.displayName ?? "Unnamed restaurant"}
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-600">
            {place.formattedAddress ?? "Address unavailable"}
          </p>
          <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <div><dt className="sr-only">Rating</dt><dd className="font-semibold text-slate-900">★ {rating}</dd></div>
            <div><dt className="sr-only">Price</dt><dd className="font-semibold text-slate-900">{formatPriceLevel(place.priceLevel)}</dd></div>
            <div><dt className="sr-only">Status</dt><dd className="text-slate-600">{formatBusinessStatus(place.businessStatus)}</dd></div>
          </dl>
          <a
            className="mt-2 inline-flex min-h-8 items-center text-sm font-semibold text-leaf underline decoration-transparent underline-offset-4 hover:decoration-current"
            href={mapsUri}
            rel="noreferrer"
            target="_blank"
          >
            Google Maps
          </a>
        </div>
      </div>
    );
  }

  return (
    <article
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white ${elevated ? "shadow-sm" : ""}`}
    >
      {!compact ? (
        <figure className="p-3 pb-0">
          {place.photo?.uri ? (
            <Image
              alt={place.displayName ?? "Restaurant photo"}
              className="aspect-video h-auto w-full rounded-xl object-cover"
              height={Math.max(1, place.photo.heightPx ?? 540)}
              loader={googlePhotoLoader}
              sizes="(max-width: 767px) 100vw, 480px"
              src={place.photo.uri}
              unoptimized
              width={Math.max(1, place.photo.widthPx ?? 960)}
            />
          ) : (
            <div
              className="grid aspect-video place-items-center rounded-xl bg-slate-100 text-sm text-slate-500"
              role="img"
              aria-label="Photo unavailable"
            >
              Photo unavailable
            </div>
          )}
        </figure>
      ) : null}

      <div className="space-y-3 p-4">
        <div>
          <h3 className="text-base font-semibold text-slate-950">
            {place.displayName ?? "Unnamed restaurant"}
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            {place.formattedAddress ?? "Address unavailable"}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-slate-500">Rating</dt>
            <dd className="font-medium text-slate-900">{rating}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Price</dt>
            <dd className="font-medium text-slate-900">
              {formatPriceLevel(place.priceLevel)}
            </dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="font-medium text-slate-900">
              {formatBusinessStatus(place.businessStatus)}
            </dd>
          </div>
        </dl>

        <a
          className="inline-flex min-h-11 items-center font-medium text-blue-700 underline underline-offset-4"
          href={mapsUri}
          rel="noreferrer"
          target="_blank"
        >
          View on Google Maps
        </a>
      </div>
    </article>
  );
}
