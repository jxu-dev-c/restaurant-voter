"use client";

import Image, { type ImageLoaderProps } from "next/image";

import {
  formatBusinessStatus,
  formatPriceLevel,
  googleMapsPlaceUrl,
} from "@/lib/google/formatters";
import type { GooglePlaceDetails } from "@/lib/google/types";
import { ExternalLinkIcon, RatingIcon, RestaurantIcon } from "@/components/ui/icons";

export type PlaceDetailsVariant = "card" | "admin-row" | "flat";

function googlePhotoLoader({ src }: ImageLoaderProps) {
  return src;
}

/**
 * Oat tile with a hairline restaurant glyph — a designed empty state, not a gap.
 * Exported so the loading and error tiles in `google-place-details-card` show
 * the same mark; a photoless candidate should look identical either way.
 */
export function PlaceMediaFallback({ className = "media media-empty" }: { className?: string }) {
  return (
    <div className={className} aria-hidden="true">
      <RestaurantIcon size={30} weight="light" />
    </div>
  );
}

export function GooglePlaceDetailsView({
  place,
  compact = false,
  variant = "card",
}: {
  place: GooglePlaceDetails;
  compact?: boolean;
  /** @deprecated surfaces are flat now; kept so existing call sites keep typing. */
  elevated?: boolean;
  variant?: PlaceDetailsVariant;
}) {
  const mapsUri = place.googleMapsUri ?? googleMapsPlaceUrl(place.placeId);
  const name = place.displayName ?? "Unnamed restaurant";
  const rating =
    place.rating === null
      ? "Unavailable"
      : `${place.rating.toFixed(1)}${
          place.userRatingCount === null
            ? ""
            : ` (${place.userRatingCount.toLocaleString()})`
        }`;

  // Image-led, no container chrome — for use inside .select-card and rosters.
  if (variant === "flat") {
    return (
      <div className="min-w-0">
        {!compact ? (
          place.photo?.uri ? (
            <figure className="media">
              <Image
                alt={name}
                height={Math.max(1, place.photo.heightPx ?? 540)}
                loader={googlePhotoLoader}
                sizes="(max-width: 767px) 100vw, 420px"
                src={place.photo.uri}
                unoptimized
                width={Math.max(1, place.photo.widthPx ?? 960)}
              />
            </figure>
          ) : (
            <PlaceMediaFallback />
          )
        ) : null}
        <h3 className="card-title mt-3">{name}</h3>
        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">
          {place.formattedAddress ?? "Address unavailable"}
        </p>
        <p className="mt-2 text-sm text-muted">
          <span className="inline-flex items-center gap-1 text-ink">
            <RatingIcon className="text-gold" size={13} />
            {rating}
          </span>
          <span aria-hidden="true"> · </span>
          <span>{formatPriceLevel(place.priceLevel)}</span>
          <span aria-hidden="true"> · </span>
          <span>{formatBusinessStatus(place.businessStatus)}</span>
        </p>
      </div>
    );
  }

  if (variant === "admin-row") {
    return (
      <div className="grid min-w-0 grid-cols-[88px_minmax(0,1fr)] items-center gap-4 sm:grid-cols-[120px_minmax(0,1fr)]">
        <figure className="media">
          {place.photo?.uri ? (
            <Image
              alt={name}
              height={102}
              loader={googlePhotoLoader}
              sizes="(max-width: 639px) 100vw, 120px"
              src={place.photo.uri}
              unoptimized
              width={136}
            />
          ) : (
            <PlaceMediaFallback className="media-empty h-full w-full" />
          )}
        </figure>
        <div className="min-w-0">
          <h3 className="card-title">{name}</h3>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">
            {place.formattedAddress ?? "Address unavailable"}
          </p>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            <div>
              <dt className="sr-only">Rating</dt>
              <dd className="flex items-center gap-1 font-medium text-ink">
                <RatingIcon className="text-gold" size={13} />
                {rating}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Price</dt>
              <dd className="font-medium text-ink">
                {formatPriceLevel(place.priceLevel)}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Status</dt>
              <dd className="text-muted">
                {formatBusinessStatus(place.businessStatus)}
              </dd>
            </div>
          </dl>
          <a
            className="mt-1 inline-flex min-h-8 items-center text-sm font-medium text-blue underline decoration-transparent underline-offset-4 hover:decoration-current"
            href={mapsUri}
            rel="noreferrer"
            target="_blank"
          >
            Google Maps
            <ExternalLinkIcon className="ml-1" size={13} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <article className="panel overflow-hidden">
      {!compact ? (
        <div className="p-3 pb-0">
          {place.photo?.uri ? (
            <figure className="media media-wide">
              <Image
                alt={name}
                height={Math.max(1, place.photo.heightPx ?? 540)}
                loader={googlePhotoLoader}
                sizes="(max-width: 767px) 100vw, 480px"
                src={place.photo.uri}
                unoptimized
                width={Math.max(1, place.photo.widthPx ?? 960)}
              />
            </figure>
          ) : (
            <PlaceMediaFallback className="media media-wide media-empty" />
          )}
        </div>
      ) : null}

      <div className="space-y-3 p-4">
        <div>
          <h3 className="card-title">{name}</h3>
          <p className="mt-1 text-sm text-muted">
            {place.formattedAddress ?? "Address unavailable"}
          </p>
        </div>

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted">Rating</dt>
            <dd className="font-medium text-ink">{rating}</dd>
          </div>
          <div>
            <dt className="text-muted">Price</dt>
            <dd className="font-medium text-ink">
              {formatPriceLevel(place.priceLevel)}
            </dd>
          </div>
          <div>
            <dt className="text-muted">Status</dt>
            <dd className="font-medium text-ink">
              {formatBusinessStatus(place.businessStatus)}
            </dd>
          </div>
        </dl>

        <a
          className="inline-flex min-h-11 items-center font-medium text-blue underline underline-offset-4"
          href={mapsUri}
          rel="noreferrer"
          target="_blank"
        >
          View on Google Maps
          <ExternalLinkIcon className="ml-1" size={14} />
        </a>
      </div>
    </article>
  );
}
