export default function FilterBar({ children }) {
  return <div className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">{children}</div>;
}

export function FilterField({ label, children }) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}
