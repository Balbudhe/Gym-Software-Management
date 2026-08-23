const styles = {
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  expiring: 'bg-amber-50 text-amber-700 border-amber-200',
  expired: 'bg-red-50 text-red-700 border-red-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',
  present: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  absent: 'bg-red-50 text-red-700 border-red-200',
  late: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function StatusBadge({ status }) {
  const key = String(status || '').toLowerCase();
  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[key] || styles.inactive}`}>
      {status || 'unknown'}
    </span>
  );
}
