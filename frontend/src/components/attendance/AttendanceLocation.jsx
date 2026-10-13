import { MapPin } from 'lucide-react';
import { cn, formatDateTime } from '../../utils/format';

const mapsUrl = (location) =>
  `https://maps.google.com/?q=${location.lat},${location.lng}`;

const osmEmbed = (location) => {
  const pad = 0.003;
  return `https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - pad}%2C${location.lat - pad}%2C${location.lng + pad}%2C${location.lat + pad}&layer=mapnik&marker=${location.lat}%2C${location.lng}`;
};

const coordLabel = (location) =>
  `${Number(location.lat).toFixed(6)}, ${Number(location.lng).toFixed(6)}`;

const locationLabel = (location) => location.address || coordLabel(location);

export default function AttendanceLocation({
  location,
  compact = false,
  showMap = false,
  updatedAt,
  className,
}) {
  if (location?.lat == null || location?.lng == null) {
    return <span className="text-slate-400">—</span>;
  }

  const details = (
    <a
      href={mapsUrl(location)}
      target="_blank"
      rel="noreferrer"
      title={locationLabel(location)}
      className={cn(
        'inline-flex max-w-full items-start gap-1 whitespace-normal text-brand-700 hover:underline',
        compact ? 'text-xs' : 'text-sm',
        className
      )}
    >
      <MapPin size={compact ? 12 : 14} className="mt-0.5 shrink-0" />
      <span className={compact ? 'line-clamp-2' : ''}>
        {locationLabel(location)}
        {location.accuracy != null ? (
          <span className="block font-normal text-slate-500">
            Exact pin · ±{Math.round(location.accuracy)}m
          </span>
        ) : (
          <span className="block font-normal text-slate-500">{coordLabel(location)}</span>
        )}
      </span>
    </a>
  );

  if (!showMap) return details;

  return (
    <div className="space-y-2">
      {details}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
        <iframe
          title="Trainer location map"
          src={osmEmbed(location)}
          className="h-52 w-full border-0"
          loading="lazy"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <span>{coordLabel(location)}</span>
        {updatedAt ? <span>Updated {formatDateTime(updatedAt)}</span> : null}
      </div>
      <a
        href={mapsUrl(location)}
        target="_blank"
        rel="noreferrer"
        className="inline-flex text-xs font-medium text-brand-700 hover:underline"
      >
        Open exact location in Google Maps
      </a>
    </div>
  );
}
