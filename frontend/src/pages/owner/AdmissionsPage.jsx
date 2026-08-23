import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import MemberFilters from '../../components/members/MemberFilters';
import MemberTable from '../../components/members/MemberTable';
import Select from '../../components/ui/Select';
import { useDebounce } from '../../hooks/useDebounce';
import { errorMessage } from '../../lib/utils';

export default function AdmissionsPage() {
  const [filters, setFilters] = useState({ search: '', page: 1, datePreset: 'month' });
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const search = useDebounce(filters.search);

  useEffect(() => {
    api.get('/trainers/options').then((res) => setTrainers(res.data.trainers || []));
    api.get('/membership-plans').then((res) => setPlans(res.data.plans || []));
    api.get('/admissions/stats').then((res) => setStats(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/admissions', { params: { ...filters, search, limit: 10 } })
      .then((res) => {
        setRows(res.data.admissions);
        setPagination(res.data.pagination);
        setError('');
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters, search]);

  return (
    <div className="space-y-5">
      <PageHeader title="Admissions" subtitle="Track who added each member and who they are assigned to." actions={<Link to="/admissions/new"><Button>New admission</Button></Link>} />
      {stats && (
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Admissions today" value={stats.stats.today} />
          <StatCard label="This week" value={stats.stats.week} />
          <StatCard label="This month" value={stats.stats.month} />
        </div>
      )}
      <MemberFilters
        filters={filters}
        onChange={setFilters}
        trainers={trainers}
        extra={
          <Select label="Membership" value={filters.membershipPlanId || ''} onChange={(e) => setFilters({ ...filters, membershipPlanId: e.target.value, page: 1 })}>
            <option value="">All plans</option>
            {plans.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
        }
      />
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <MemberTable members={rows} loading={loading} error={error} pagination={pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
        </Card>
        <Card>
          <CardHeader title="Trainer-wise admissions" />
          <div className="divide-y divide-slate-100">
            {stats?.trainerCounts?.map((row) => (
              <div key={row.trainerId} className="flex items-center justify-between px-5 py-3 text-sm">
                <span className="font-medium">{row.name}</span>
                <span className="font-semibold text-slate-900">{row.admissions}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
