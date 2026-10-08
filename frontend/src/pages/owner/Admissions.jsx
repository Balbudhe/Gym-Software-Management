import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import FilterBar, { FilterField } from '../../components/filters/FilterBar';
import { formatDate } from '../../utils/format';

export default function OwnerAdmissions() {
  const { selectedBranch } = useBranch();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [trainers, setTrainers] = useState([]);
  const [createdByTrainerId, setCreatedByTrainerId] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    api.get('/trainers', { params: { limit: 100 } }).then(({ data }) => setTrainers(data.items || []));
  }, [selectedBranch]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/admissions', { params: { page, createdByTrainerId, from, to } });
        setRows(data.items || []);
        setPagination(data.pagination);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedBranch, page, createdByTrainerId, from, to]);

  return (
    <div>
      <PageHeader
        title="Admissions"
        actions={<Link to="/owner/admissions/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">New admission</Link>}
      />
      <FilterBar>
        <FilterField label="Added By Trainer">
          <select value={createdByTrainerId} onChange={(e) => { setCreatedByTrainerId(e.target.value); setPage(1); }}>
            <option value="">All</option>
            {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="From">
          <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
        </FilterField>
        <FilterField label="To">
          <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
        </FilterField>
      </FilterBar>
      {loading ? <Skeleton /> : (
        <>
          <DataTable
            rows={rows}
            columns={[
              { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name },
              { key: 'member', header: 'Member', render: (r) => r.name },
              { key: 'added', header: 'Added By', render: (r) => r.createdByTrainerId?.name || 'Owner' },
              { key: 'assigned', header: 'Assigned Trainer', render: (r) => r.assignedTrainerId?.name || '—' },
              { key: 'plan', header: 'Membership', render: (r) => r.membershipId?.membershipPlanId?.name },
              { key: 'date', header: 'Date', render: (r) => formatDate(r.createdAt) },
            ]}
          />
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
