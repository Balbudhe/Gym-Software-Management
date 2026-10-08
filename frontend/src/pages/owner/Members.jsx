import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import FilterBar, { FilterField } from '../../components/filters/FilterBar';
import Modal from '../../components/common/Modal';
import { statusBadge } from '../../components/common/Badge';
import { formatDate } from '../../utils/format';
import { trainerOptionLabel } from '../../utils/batches';

const presetFromPath = (path) => {
  if (path.endsWith('/active')) return { status: 'active', title: 'Active Members' };
  if (path.endsWith('/expiring')) return { status: 'expiring', title: 'Expiring Soon', expiringDays: '7' };
  if (path.endsWith('/expired')) return { status: 'expired', title: 'Expired Members' };
  return { status: '', title: 'All Members' };
};

export default function OwnerMembers() {
  const { selectedBranch, branches } = useBranch();
  const toast = useToast();
  const location = useLocation();
  const preset = presetFromPath(location.pathname);
  const [trainers, setTrainers] = useState([]);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [assigning, setAssigning] = useState(null);
  const [assignedTrainerId, setAssignedTrainerId] = useState('');
  const [filters, setFilters] = useState({
    search: '',
    createdByTrainerId: '',
    assignedTrainerId: '',
    status: preset.status,
    expiringDays: preset.expiringDays || '7',
    expiredSince: '',
    from: '',
    to: '',
  });
  const search = useDebounce(filters.search);

  useEffect(() => {
    setFilters((f) => ({ ...f, status: preset.status, expiringDays: preset.expiringDays || f.expiringDays }));
    setPage(1);
  }, [preset.status, preset.expiringDays]);

  useEffect(() => {
    api.get('/trainers', { params: { limit: 100 } }).then(({ data }) => setTrainers(data.items || []));
  }, [selectedBranch]);

  const params = useMemo(() => {
    const p = { page, limit: 20, search };
    if (filters.createdByTrainerId) p.createdByTrainerId = filters.createdByTrainerId;
    if (filters.assignedTrainerId) p.assignedTrainerId = filters.assignedTrainerId;
    if (filters.status) p.status = filters.status;
    if (filters.status === 'expiring') p.expiringDays = filters.expiringDays;
    if (filters.status === 'expired' && filters.expiredSince) p.expiredSince = filters.expiredSince;
    if (filters.from) p.from = filters.from;
    if (filters.to) p.to = filters.to;
    return p;
  }, [page, search, filters, selectedBranch]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get('/members', { params });
        setRows(data.items || []);
        setPagination(data.pagination);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params]);

  return (
    <div>
      <PageHeader
        title={preset.title}
        subtitle="Filters combine with the global branch selector"
        actions={
          <Link to="/owner/admissions/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">
            New admission
          </Link>
        }
      />
      <FilterBar>
        <FilterField label="Search">
          <input value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} placeholder="Name, phone, ID" />
        </FilterField>
        <FilterField label="Added By Trainer">
          <select value={filters.createdByTrainerId} onChange={(e) => setFilters({ ...filters, createdByTrainerId: e.target.value })}>
            <option value="">All</option>
            {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Assigned Trainer">
          <select value={filters.assignedTrainerId} onChange={(e) => setFilters({ ...filters, assignedTrainerId: e.target.value })}>
            <option value="">All</option>
            {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </FilterField>
        {!preset.status ? (
          <FilterField label="Status">
            <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
              <option value="">All</option>
              <option value="active">Active</option>
              <option value="expiring">Expiring</option>
              <option value="expired">Expired</option>
              <option value="inactive">Inactive</option>
            </select>
          </FilterField>
        ) : null}
        {(filters.status === 'expiring' || preset.status === 'expiring') ? (
          <FilterField label="Expiring within">
            <select value={['7', '15', '30'].includes(filters.expiringDays) ? filters.expiringDays : 'custom'} onChange={(e) => setFilters({ ...filters, expiringDays: e.target.value === 'custom' ? '10' : e.target.value })}>
              <option value="7">7 days</option>
              <option value="15">15 days</option>
              <option value="30">30 days</option>
              <option value="custom">Custom</option>
            </select>
          </FilterField>
        ) : null}
        {(filters.status === 'expiring' || preset.status === 'expiring') && !['7', '15', '30'].includes(filters.expiringDays) ? (
          <FilterField label="Custom days">
            <input type="number" min="1" value={filters.expiringDays} onChange={(e) => setFilters({ ...filters, expiringDays: e.target.value })} />
          </FilterField>
        ) : null}
        {preset.status === 'expired' ? (
          <FilterField label="Expired since (days)">
            <input type="number" min="0" value={filters.expiredSince} onChange={(e) => setFilters({ ...filters, expiredSince: e.target.value })} />
          </FilterField>
        ) : null}
        <FilterField label="Joined from">
          <input type="date" value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} />
        </FilterField>
        <FilterField label="Joined to">
          <input type="date" value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} />
        </FilterField>
      </FilterBar>
      {selectedBranch === 'ALL' ? (
        <p className="mb-3 text-xs text-slate-500">Showing members across {branches.length} branches.</p>
      ) : null}
      {loading ? <Skeleton /> : (
        <>
          <DataTable
            rows={rows}
            columns={[
              { key: 'memberCode', header: 'Member ID' },
              { key: 'name', header: 'Member' },
              { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name },
              { key: 'phone', header: 'Phone' },
              { key: 'added', header: 'Added By', render: (r) => r.createdByTrainerId?.name || 'Owner' },
              { key: 'assigned', header: 'Assigned Trainer', render: (r) => r.assignedTrainerId?.name || '—' },
              { key: 'plan', header: 'Membership', render: (r) => r.membershipId?.membershipPlanId?.name || '—' },
              { key: 'join', header: 'Joining Date', render: (r) => formatDate(r.joiningDate) },
              { key: 'exp', header: 'Expiry Date', render: (r) => formatDate(r.expiryDate) },
              { key: 'status', header: 'Status', render: (r) => statusBadge(r.status === 'inactive' ? 'inactive' : r.membershipStatus || r.status) },
              ...(preset.status === 'expired'
                ? [{ key: 'days', header: 'Days Expired', render: (r) => r.daysExpired ?? '—' }]
                : []),
              {
                key: 'actions',
                header: 'Actions',
                render: (r) => (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      className="text-sm text-brand-700"
                      onClick={() => {
                        setAssigning(r);
                        setAssignedTrainerId(r.assignedTrainerId?._id || '');
                      }}
                    >
                      Assign
                    </button>
                    <button
                      type="button"
                      className="text-sm text-slate-600"
                      onClick={async () => {
                        const nextStatus = r.status === 'inactive' ? 'active' : 'inactive';
                        try {
                          await api.put(`/members/${r._id}`, { status: nextStatus });
                          toast.push(nextStatus === 'inactive' ? 'Member set inactive. Reminders stopped.' : 'Member activated');
                          const { data } = await api.get('/members', { params });
                          setRows(data.items || []);
                        } catch (error) {
                          toast.push(error.response?.data?.message || 'Could not update status', 'error');
                        }
                      }}
                    >
                      {r.status === 'inactive' ? 'Activate' : 'Deactivate'}
                    </button>
                  </div>
                ),
              },
            ]}
          />
          <Pagination pagination={pagination} onPage={setPage} />
          <Modal open={!!assigning} title="Assign trainer" onClose={() => setAssigning(null)}>
            <p className="mb-3 text-sm text-slate-600">{assigning?.name} · {assigning?.branchId?.name}</p>
            <select className="w-full" value={assignedTrainerId} onChange={(e) => setAssignedTrainerId(e.target.value)}>
              <option value="">Select trainer in this branch</option>
              {trainers
                .filter((t) => !assigning?.branchId?._id || t.branchId?._id === assigning.branchId._id || t.branchId === assigning.branchId._id)
                .map((t) => <option key={t._id} value={t._id}>{trainerOptionLabel(t)}</option>)}
            </select>
            <button
              type="button"
              className="mt-4 w-full rounded-lg bg-slate-900 py-2 text-sm text-white"
              onClick={async () => {
                try {
                  await api.patch(`/members/${assigning._id}/assign-trainer`, { assignedTrainerId });
                  toast.push('Trainer assigned');
                  setAssigning(null);
                  const { data } = await api.get('/members', { params });
                  setRows(data.items || []);
                } catch (error) {
                  toast.push(error.response?.data?.message || 'Could not assign', 'error');
                }
              }}
            >
              Save
            </button>
          </Modal>
        </>
      )}
    </div>
  );
}
