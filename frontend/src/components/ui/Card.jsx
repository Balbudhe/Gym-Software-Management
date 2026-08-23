import { cn } from '../../lib/utils';

export default function Card({ children, className }) {
  return <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>{children}</div>;
}

export function CardHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-5 py-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
