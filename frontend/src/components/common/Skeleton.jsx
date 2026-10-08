export default function Skeleton({ rows = 5 }) {
  return (
    <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-slate-100" />
      ))}
    </div>
  );
}
