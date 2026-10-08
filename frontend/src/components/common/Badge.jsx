import { cn } from '../../utils/format';

export default function Badge({ children, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-700',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-red-50 text-red-700',
    blue: 'bg-sky-50 text-sky-700',
  };
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', tones[tone] || tones.slate)}>
      {children}
    </span>
  );
}

export const statusBadge = (status) => {
  const map = {
    active: ['green', 'Active'],
    present: ['green', 'Present'],
    expired: ['red', 'Expired'],
    inactive: ['slate', 'Inactive'],
    late: ['amber', 'Late'],
    absent: ['red', 'Absent'],
    expiring: ['amber', 'Expiring'],
  };
  const [tone, label] = map[status] || ['slate', status || '—'];
  return <Badge tone={tone}>{label}</Badge>;
};
