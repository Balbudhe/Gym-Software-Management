import { MapPin } from 'lucide-react';
import { cn } from '../../utils/format';

const mapsUrl = (location) =>
  `https://maps.google.com/?q=${location.lat},${location.lng}`;

const locationLabel = (location) =>
  location.address || `${Number(location.lat).toFixed(5)}, ${Number(location.lng).toFixed(5)}`;

export default function AttendanceLocation({ location, compact = false, className }) {
  if (location?.lat == null || location?.lng == null) {
    return <span className="text-slate-400">—</span>;
  }

  return (
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
      <span className={compact ? 'line-clamp-2' : ''}>{locationLabel(location)}</span>
    </a>
  );
}
