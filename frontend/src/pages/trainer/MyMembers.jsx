import { useEffect, useState } from 'react';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDate, errorMessage } from '../../lib/utils';
import { useDebounce } from '../../hooks/useDebounce';

export default function MyMembers() {
  const [filters, setFilters] = useState({ search: '', status: 'all', page: 1 });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const search = useDebounce(filters.search);

  useEffect(() => {
    setLoading(true);
    api.get('/members', { params: { ...filters, search, scope: 'assigned', limit: 10 } })
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
      <PageHeader title="My members" subtitle="Members currently assigned to you." />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Search" value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        <Select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring</option>
          <option value="expired">Expired</option>
        </Select>
      </div>
      <Card>
        {loading ? <TableSkeleton /> : error ? <p className="p-6 text-red-600">{error}</p> : !rows.length ? <EmptyState title="No assigned members" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>{['Member', 'Phone', 'Membership', 'Expiry', 'Status'].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((m) => (
                    <tr key={m._id}>
                      <td className="px-4 py-3 font-semibold">{m.name}</td>
                      <td className="px-4 py-3">{m.phone}</td>
                      <td className="px-4 py-3">{m.membershipId?.membershipPlanId?.name || '—'}</td>
                      <td className="px-4 py-3">{formatDate(m.expiryDate)}</td>
                      <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
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
