import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Button from '../../components/ui/Button';
import Card from '../../components/ui/Card';
import MemberFilters from '../../components/members/MemberFilters';
import MemberTable from '../../components/members/MemberTable';
import { useDebounce } from '../../hooks/useDebounce';
import { errorMessage } from '../../lib/utils';
import { useAuth } from '../../context/AuthContext';

export default function MembersPage({ presetStatus, title = 'Members', trainerView = false }) {
  const { user } = useAuth();
  const [filters, setFilters] = useState({ search: '', status: presetStatus || 'all', page: 1, datePreset: '' });
  const [trainers, setTrainers] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const search = useDebounce(filters.search);

  useEffect(() => {
    api.get('/trainers/options').then((res) => setTrainers(res.data.trainers || [])).catch(() => {});
  }, []);

  const query = useMemo(() => {
    const params = { ...filters, search, limit: 10, sort: 'createdAt' };
    if (presetStatus) params.status = presetStatus;
    if (trainerView) params.scope = 'assigned';
    return params;
  }, [filters, search, presetStatus, trainerView]);

  useEffect(() => {
    setLoading(true);
    api.get('/members', { params: query })
      .then((res) => {
        setRows(res.data.members);
        setPagination(res.data.pagination);
        setError('');
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div className="space-y-5">
      <PageHeader
        title={title}
        subtitle="Search, filter, and manage gym members."
        actions={user?.role === 'OWNER' ? <Link to="/admissions/new"><Button>New admission</Button></Link> : null}
      />
      <MemberFilters filters={filters} onChange={setFilters} trainers={trainers} hideStatus={!!presetStatus} />
      <Card>
        <MemberTable
          members={rows}
          loading={loading}
          error={error}
          pagination={pagination}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
          showActions={user?.role === 'OWNER'}
        />
      </Card>
    </div>
  );
}
