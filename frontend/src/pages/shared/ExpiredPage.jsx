import { useEffect, useState } from 'react';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import MemberFilters from '../../components/members/MemberFilters';
import Input from '../../components/ui/Input';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDate, errorMessage } from '../../lib/utils';
import { useDebounce } from '../../hooks/useDebounce';

export default function ExpiredPage() {
  const [filters, setFilters] = useState({ search: '', createdByTrainerId: 'all', assignedTrainerId: 'all', page: 1, expiredSince: '' });
  const [trainers, setTrainers] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const search = useDebounce(filters.search);

  useEffect(() => {
    api.get('/trainers/options').then((res) => setTrainers(res.data.trainers || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/memberships/expired', { params: { ...filters, search, limit: 10 } })
      .then((res) => {
        setRows(res.data.members);
        setPagination(res.data.pagination);
        setError('');
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters, search]);

  return (
    <div className="space-y-5">
      <PageHeader title="Expired memberships" subtitle="Members whose plans have already ended." />
      <MemberFilters
        filters={filters}
        onChange={setFilters}
        trainers={trainers}
        hideStatus
        extra={<Input type="date" label="Expired since" value={filters.expiredSince || ''} onChange={(e) => setFilters({ ...filters, expiredSince: e.target.value, page: 1 })} />}
      />
      <Card>
        {loading ? <TableSkeleton /> : error ? <p className="p-6 text-red-600">{error}</p> : !rows.length ? (
          <EmptyState title="No expired memberships" />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {['Member', 'Phone', 'Added by', 'Assigned trainer', 'Plan', 'Expiry date', 'Days expired', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((m) => (
                    <tr key={m._id}>
                      <td className="px-4 py-3 font-semibold">{m.name}</td>
                      <td className="px-4 py-3">{m.phone}</td>
                      <td className="px-4 py-3">{m.createdByTrainerId?.name || '—'}</td>
                      <td className="px-4 py-3">{m.assignedTrainerId?.name || '—'}</td>
                      <td className="px-4 py-3">{m.membershipId?.membershipPlanId?.name || '—'}</td>
                      <td className="px-4 py-3">{formatDate(m.expiryDate)}</td>
                      <td className="px-4 py-3">{m.daysExpired}</td>
                      <td className="px-4 py-3"><StatusBadge status="expired" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
          </>
        )}
      </Card>
    </div>
  );
}
