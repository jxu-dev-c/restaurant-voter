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

function PhotoAttributions({ place }: { place: GooglePlaceDetails }) {
  const photo = place.photo;
  if (!photo) return null;

  const sourceUri = photo.googleMapsUri ?? place.googleMapsUri;
  if (!photo.attributions.length && !sourceUri) return null;

  return (
    <figcaption className="mt-2 text-xs text-slate-600">
      {photo.attributions.length > 0 ? (
        <>
          Photo by{" "}
          {photo.attributions.map((attribution, index) => (
            <span key={`${attribution.displayName}-${index}`}>
              {index > 0 ? ", " : null}
              {attribution.uri ? (
                <a
                  className="underline underline-offset-2"
                  href={attribution.uri}
                  rel="noreferrer"
                  target="_blank"
                >
                  {attribution.displayName}
                </a>
              ) : (
                attribution.displayName
              )}
            </span>
          ))}
        </>
      ) : null}
      {photo.attributions.length > 0 && sourceUri ? " · " : null}
      {sourceUri ? (
        <a
          className="underline underline-offset-2"
          href={sourceUri}
          rel="noreferrer"
          target="_blank"
        >
          Photo source
        </a>
      ) : null}
    </figcaption>
  );
}

export function GooglePlaceDetailsView({
  place,
  compact = false,
}: {
  place: GooglePlaceDetails;
  compact?: boolean;
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

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {!compact ? (
        <figure className="p-3 pb-0">
          {place.photo?.uri ? (
            <Image
              alt={place.displayName ?? "Restaurant photo"}
              className="aspect-video h-auto w-full rounded-xl object-cover"
              height={Math.max(1, place.photo.heightPx ?? 540)}
              loader={googlePhotoLoader}
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
          <PhotoAttributions place={place} />
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
