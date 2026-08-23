import { Link } from 'react-router-dom';
import StatusBadge from '../ui/StatusBadge';
import { formatDate } from '../../lib/utils';
import EmptyState from '../ui/EmptyState';
import { TableSkeleton } from '../ui/Skeleton';
import Pagination from '../ui/Pagination';

export default function MemberTable({
  members,
  loading,
  error,
  pagination,
  onPage,
  showActions = true,
  extra,
}) {
  if (loading) return <TableSkeleton cols={8} />;
  if (error) return <p className="p-6 text-sm text-red-600">{error}</p>;
  if (!members?.length) return <EmptyState title="No members found" description="Try adjusting filters or add a new admission." />;

  return (
    <>
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Member ID</th>
              <th className="px-4 py-3 font-semibold">Member</th>
              <th className="px-4 py-3 font-semibold">Phone</th>
              <th className="px-4 py-3 font-semibold">Added By</th>
              <th className="px-4 py-3 font-semibold">Assigned Trainer</th>
              <th className="px-4 py-3 font-semibold">Membership</th>
              <th className="px-4 py-3 font-semibold">Joining</th>
              <th className="px-4 py-3 font-semibold">Expiry</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              {showActions && <th className="px-4 py-3 font-semibold">Actions</th>}
              {extra?.head}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {members.map((m) => (
              <tr key={m._id} className="hover:bg-slate-50/80">
                <td className="px-4 py-3 font-medium text-slate-700">{m.memberCode}</td>
                <td className="px-4 py-3 font-semibold text-slate-900">{m.name}</td>
                <td className="px-4 py-3 text-slate-600">{m.phone}</td>
                <td className="px-4 py-3 text-slate-600">{m.createdByTrainerId?.name || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{m.assignedTrainerId?.name || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{m.membershipId?.membershipPlanId?.name || '—'}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(m.joiningDate)}</td>
                <td className="px-4 py-3 text-slate-600">{formatDate(m.expiryDate)}</td>
                <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                {showActions && (
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Link to={`/members/${m._id}`} className="text-sm font-semibold text-brand-700 hover:underline">View</Link>
                      <Link to={`/members/${m._id}/edit`} className="text-sm font-semibold text-slate-600 hover:underline">Edit</Link>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination pagination={pagination} onPage={onPage} />
    </>
  );
}
