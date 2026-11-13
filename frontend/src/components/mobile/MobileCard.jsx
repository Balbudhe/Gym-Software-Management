import { cn } from '../../utils/format';

export default function MobileCard({
  children,
  onClick,
  className = '',
  active = false,
}) {
  const Comp = onClick ? 'button' : 'div';
  return (
    <Comp
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition',
        active ? 'border-brand-300 bg-brand-50/40' : 'border-slate-200',
        onClick ? 'active:scale-[0.99]' : '',
        className
      )}
    >
      {children}
    </Comp>
  );
}

export function MobileCardHeader({ title, subtitle, meta, avatar }) {
  return (
    <div className="flex items-start gap-3">
      {avatar ? <div className="shrink-0">{avatar}</div> : null}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-slate-900">{title}</p>
          {meta}
        </div>
        {subtitle ? <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
  );
}

export function MobileCardMeta({ items = [] }) {
  return (
    <div className="mt-3 grid grid-cols-2 gap-2">
      {items.filter(Boolean).map((item) => (
        <div key={item.label} className="rounded-xl bg-slate-50 px-2.5 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-800">{item.value || '—'}</p>
        </div>
      ))}
    </div>
  );
}

export function MobileCardActions({ children }) {
  return <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-100 pt-3">{children}</div>;
}
