import { statusBadge } from '../common/Badge';

const REASONS = {
  no_check_in: 'No check-in',
  no_check_out: 'No check-out',
  short_hours: 'Left before required hours',
};

export default function AttendanceStatus({ row }) {
  if (!row) return statusBadge();
  const reason = row.status === 'absent' ? REASONS[row.absentReason] : null;
  const hours =
    row.workedLabel && row.requiredLabel
      ? `Worked ${row.workedLabel} of ${row.requiredLabel} required`
      : row.status === 'in_progress' && row.requiredLabel
        ? `Needs ${row.requiredLabel} to be present`
        : null;

  return (
    <div className="min-w-[140px]">
      {statusBadge(row.status)}
      {reason ? <p className="mt-1 text-xs text-rose-600">{reason}</p> : null}
      {hours ? <p className="mt-1 text-xs text-slate-500">{hours}</p> : null}
    </div>
  );
}
