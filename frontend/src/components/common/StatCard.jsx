export default function StatCard({ label, value, hint }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400 sm:text-sm sm:normal-case sm:tracking-normal sm:font-normal sm:text-slate-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{value ?? '—'}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}
