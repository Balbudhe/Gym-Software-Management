import { useEffect, useState } from 'react';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Select from '../../components/ui/Select';
import Input from '../../components/ui/Input';
import MemberFilters from '../../components/members/MemberFilters';
import EmptyState from '../../components/ui/EmptyState';
import Pagination from '../../components/ui/Pagination';
import StatusBadge from '../../components/ui/StatusBadge';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDate, errorMessage } from '../../lib/utils';
import { useDebounce } from '../../hooks/useDebounce';

export default function ExpiringPage() {
  const [days, setDays] = useState('7');
  const [custom, setCustom] = useState('');
  const [filters, setFilters] = useState({ search: '', createdByTrainerId: 'all', assignedTrainerId: 'all', page: 1 });
  const [trainers, setTrainers] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const search = useDebounce(filters.search);
  const dayValue = days === 'custom' ? Number(custom) || 7 : Number(days);

  useEffect(() => {
    api.get('/trainers/options').then((res) => setTrainers(res.data.trainers || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/memberships/expiring', { params: { ...filters, search, days: dayValue, limit: 10 } })
      .then((res) => {
        setRows(res.data.members);
        setPagination(res.data.pagination);
        setError('');
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters, search, dayValue]);

  return (
    <div className="space-y-5">
      <PageHeader title="Expiring soon" subtitle="Members whose plans end within the selected window." />
      <div className="flex flex-wrap items-end gap-3">
        <Select label="Window" value={days} onChange={(e) => setDays(e.target.value)}>
          <option value="7">Next 7 days</option>
          <option value="15">Next 15 days</option>
          <option value="30">Next 30 days</option>
          <option value="custom">Custom</option>
        </Select>
        {days === 'custom' && <Input label="Days" type="number" value={custom} onChange={(e) => setCustom(e.target.value)} />}
      </div>
      <MemberFilters filters={filters} onChange={setFilters} trainers={trainers} hideStatus extra={<span />} />
      <Card>
        {loading ? <TableSkeleton /> : error ? <p className="p-6 text-red-600">{error}</p> : !rows.length ? (
          <EmptyState title="No expiring memberships" description="Nobody is due to expire in this window." />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {['Member', 'Added by', 'Assigned trainer', 'Plan', 'Expiry date', 'Days remaining', 'Status'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((m) => (
                    <tr key={m._id}>
                      <td className="px-4 py-3 font-semibold">{m.name}</td>
                      <td className="px-4 py-3">{m.createdByTrainerId?.name || '—'}</td>
                      <td className="px-4 py-3">{m.assignedTrainerId?.name || '—'}</td>
                      <td className="px-4 py-3">{m.membershipId?.membershipPlanId?.name || '—'}</td>
                      <td className="px-4 py-3">{formatDate(m.expiryDate)}</td>
                      <td className="px-4 py-3">{m.daysRemaining}</td>
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
