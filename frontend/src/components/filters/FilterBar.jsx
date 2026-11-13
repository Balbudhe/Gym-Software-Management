import { useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { cn } from '../../utils/format';

export default function FilterBar({ children, title = 'Filters' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mb-4">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm lg:hidden"
      >
        <span className="inline-flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-slate-500" />
          {title}
        </span>
        <ChevronDown size={16} className={cn('text-slate-400 transition', open && 'rotate-180')} />
      </button>

      <div
        className={cn(
          'gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5',
          open ? 'grid' : 'hidden lg:grid'
        )}
      >
        {children}
      </div>
    </div>
  );
}

export function FilterField({ label, children }) {
  return (
    <label className="block text-xs font-medium text-slate-500">
      {label}
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
