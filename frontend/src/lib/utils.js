export function cn(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function assetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  const base = import.meta.env.VITE_ASSET_URL || '';
  return `${base}${path}`;
}

export function formatDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(value) {
  if (!value) return '—';
  return new Date(value).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

export function initials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');
}

export function errorMessage(error, fallback = 'Something went wrong') {
  return error?.response?.data?.message || error?.message || fallback;
}

export function durationLabel(plan) {
  if (!plan) return '—';
  const unit = plan.durationValue === 1 ? plan.durationUnit : `${plan.durationUnit}s`;
  return `${plan.durationValue} ${unit}`;
}

export function addDuration(startDate, value, unit) {
  const result = new Date(startDate);
  if (unit === 'day') result.setDate(result.getDate() + Number(value));
  else if (unit === 'year') result.setFullYear(result.getFullYear() + Number(value));
  else result.setMonth(result.getMonth() + Number(value));
  return result;
}

export function toInputDate(value) {
  if (!value) return '';
  const d = new Date(value);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}
