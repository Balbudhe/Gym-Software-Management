import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search, UserPlus } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useDebounce } from '../../hooks/useDebounce';
import Skeleton from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import EmptyState from '../../components/common/EmptyState';
import DataTable from '../../components/tables/DataTable';
import AuthImage from '../../components/common/AuthImage';
import Modal from '../../components/common/Modal';
import { statusBadge } from '../../components/common/Badge';
import { formatDate, initials, cn } from '../../utils/format';

const VIEW_OPTIONS = [
  { id: 'assigned', label: 'Assigned to me' },
  { id: 'added', label: 'Added by me' },
  { id: 'branch', label: 'My branch' },
];

function MemberPhoto({ member, className = 'h-10 w-10 rounded-full object-cover' }) {
  if (member.profilePhoto) {
    return <AuthImage src={member.profilePhoto} alt={member.name} className={className} />;
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white',
        className.includes('h-') ? className.replace('object-cover', '') : 'h-10 w-10'
      )}
    >
      {initials(member.name)}
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-medium text-slate-900">{value || '—'}</p>
    </div>
  );
}

export default function MyMembers({ status = '' }) {
  const { user } = useAuth();
  const toast = useToast();
  const isOwner = user?.role === 'OWNER';
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [healthIssueFilter, setHealthIssueFilter] = useState('');
  const [mine, setMine] = useState('assigned');
  const [selected, setSelected] = useState(null);
  const debouncedSearch = useDebounce(search);
  const debouncedHealthIssueFilter = useDebounce(healthIssueFilter);

  const meta = useMemo(() => {
    if (status === 'active') {
      return {
        title: 'Active memberships',
        subtitle: 'Members with an active plan in your scope',
        eyebrow: 'Memberships',
      };
    }
    if (status === 'expiring') {
      return {
        title: 'Expiring soon',
        subtitle: 'Memberships ending within the next 7 days',
        eyebrow: 'Memberships',
      };
    }
    if (status === 'expired') {
      return {
        title: 'Expired memberships',
        subtitle: 'Members whose plans have already ended',
        eyebrow: 'Memberships',
      };
    }
    return {
      title: 'My members',
      subtitle: `Working inside ${user?.branchName || 'your assigned branch'}`,
      eyebrow: 'Members',
    };
  }, [status, user?.branchName]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, debouncedHealthIssueFilter, mine, status]);

  useEffect(() => {
    const load = async () => {
      if (!user?.trainerId) return;
      setLoading(true);
      try {
        const params = {
          page,
          limit: 20,
          search: debouncedSearch || undefined,
          healthIssue: debouncedHealthIssueFilter || undefined,
          status: status || undefined,
          expiringDays: 7,
        };
        if (!status) {
          if (mine === 'assigned') params.assignedTrainerId = user.trainerId;
          if (mine === 'added') params.createdByTrainerId = user.trainerId;
        } else {
          params.assignedTrainerId = user.trainerId;
        }
        const { data } = await api.get('/members', { params });
        setRows(data.items || []);
        setPagination(data.pagination);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user, page, debouncedSearch, debouncedHealthIssueFilter, status, mine]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => (r.membershipStatus || r.status) === 'active').length;
    const expiring = rows.filter((r) => {
      const days = r.daysUntilExpiry;
      return typeof days === 'number' && days >= 0 && days <= 7;
    }).length;
    return {
      total: pagination?.total ?? rows.length,
      showing: rows.length,
      active,
      expiring,
    };
  }, [rows, pagination]);

  const columns = [
    {
      key: 'photo',
      header: 'Photo',
      render: (r) => <MemberPhoto member={r} />,
    },
    { key: 'memberCode', header: 'Member ID' },
    {
      key: 'name',
      header: 'Member',
      render: (r) => (
        <div>
          <p className="font-medium text-slate-900">{r.name}</p>
          <p className="text-xs text-slate-500">{r.email || '—'}</p>
        </div>
      ),
    },
    { key: 'phone', header: 'Phone' },
    {
      key: 'added',
      header: 'Added By',
      render: (r) => r.createdByTrainerId?.name || 'Owner',
    },
    ...(isOwner
      ? [
          {
            key: 'assigned',
            header: 'Assigned Trainer',
            render: (r) => r.assignedTrainerId?.name || '—',
          },
        ]
      : []),
    {
      key: 'plan',
      header: 'Membership',
      render: (r) => r.membershipId?.membershipPlanId?.name || '—',
    },
    {
      key: 'healthIssue',
      header: 'Health issue',
      render: (r) => r.healthIssue || '—',
    },
    {
      key: 'join',
      header: 'Joining',
      render: (r) => formatDate(r.joiningDate),
    },
    {
      key: 'exp',
      header: 'Expiry',
      render: (r) => formatDate(r.expiryDate),
    },
    {
      key: 'status',
      header: 'Status',
      render: (r) => statusBadge(r.status === 'inactive' ? 'inactive' : r.membershipStatus || r.status),
    },
  ];

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            {meta.eyebrow}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{meta.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{meta.subtitle}</p>
        </div>
        {!status ? (
          <Link
            to="/trainer/admissions/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            <UserPlus size={16} />
            New admission
          </Link>
        ) : null}
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">On this page</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.showing}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Active shown</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Expiring soon</p>
          <p className="mt-2 text-2xl font-semibold text-amber-700">{stats.expiring}</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className={cn('grid gap-3', !status ? 'lg:grid-cols-[1fr_auto]' : '')}>
          <label className="relative block">
            <Search
              size={16}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, or member ID"
              className="w-full border-0 bg-slate-50 py-2.5 pl-10 pr-3 shadow-none focus:ring-brand-500/20"
            />
          </label>
          <button
            type="button"
            onClick={() => setHealthIssueFilter((active) => (active === 'has' ? '' : 'has'))}
            className={cn(
              'rounded-xl px-3 py-2.5 text-sm font-medium transition',
              healthIssueFilter === 'has'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            Health issue{healthIssueFilter === 'has' ? ' · On' : ''}
          </button>
          <button
            type="button"
            onClick={() => setHealthIssueFilter((active) => (active === 'none' ? '' : 'none'))}
            className={cn(
              'rounded-xl px-3 py-2.5 text-sm font-medium transition',
              healthIssueFilter === 'none'
                ? 'bg-slate-900 text-white'
                : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            )}
          >
            No health issue{healthIssueFilter === 'none' ? ' · On' : ''}
          </button>
          {!status ? (
            <div className="flex flex-wrap gap-2">
              {VIEW_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setMine(option.id)}
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm font-medium transition',
                    mine === option.id
                      ? 'bg-slate-900 text-white'
                      : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {loading ? (
        <Skeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No members found"
          description={
            debouncedSearch
              ? 'Try a different search term.'
              : debouncedHealthIssueFilter === 'none'
                ? 'No members without a health issue were found.'
                : debouncedHealthIssueFilter === 'has'
                  ? 'No members with a health issue were found.'
              : status
                ? 'Nothing matches this membership filter right now.'
                : 'Admit a member or switch the view to see more people.'
          }
        />
      ) : (
        <>
          <DataTable rows={rows} columns={columns} onRowClick={setSelected} />
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}

      <Modal
        open={!!selected}
        title="Member details"
        onClose={() => setSelected(null)}
        wide
      >
        {selected ? (
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
              <div className="shrink-0">
                {selected.profilePhoto ? (
                  <AuthImage
                    src={selected.profilePhoto}
                    alt={selected.name}
                    className="h-28 w-28 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-2xl bg-slate-900 text-2xl font-semibold text-white">
                    {initials(selected.name)}
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-semibold text-slate-900">{selected.name}</h3>
                  {statusBadge(selected.status === 'inactive' ? 'inactive' : selected.membershipStatus || selected.status)}
                </div>
                <p className="mt-1 text-sm text-slate-500">{selected.memberCode || '—'}</p>
                <p className="mt-2 text-sm text-slate-600">{selected.email || 'No email'}</p>
                <p className="text-sm text-slate-600">{selected.phone || 'No phone'}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <DetailItem label="Branch" value={selected.branchId?.name || user?.branchName} />
              <DetailItem
                label="Membership plan"
                value={selected.membershipId?.membershipPlanId?.name}
              />
              <DetailItem label="Joining date" value={formatDate(selected.joiningDate)} />
              <DetailItem label="Expiry date" value={formatDate(selected.expiryDate)} />
              <DetailItem
                label="Added by"
                value={selected.createdByTrainerId?.name || 'Owner'}
              />
              {isOwner ? (
                <DetailItem
                  label="Assigned trainer"
                  value={selected.assignedTrainerId?.name}
                />
              ) : null}
              <DetailItem label="Gender" value={selected.gender} />
              <DetailItem
                label="Date of birth"
                value={formatDate(selected.dateOfBirth)}
              />
              <DetailItem label="Height" value={selected.height} />
              <DetailItem label="Weight" value={selected.weight} />
              <DetailItem label="Fitness goal" value={selected.fitnessGoal} />
              <DetailItem label="Health issue" value={selected.healthIssue} />
              <DetailItem label="Emergency contact" value={selected.emergencyContact} />
              <div className="sm:col-span-2">
                <DetailItem label="Address" value={selected.address} />
              </div>
              <div className="sm:col-span-2">
                <DetailItem label="Remarks" value={selected.remarks} />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  const nextStatus = selected.status === 'inactive' ? 'active' : 'inactive';
                  try {
                    const { data } = await api.put(`/members/${selected._id}`, { status: nextStatus });
                    setSelected(data.item);
                    setRows((current) =>
                      current.map((row) => (row._id === data.item._id ? { ...row, ...data.item } : row))
                    );
                    toast.push(
                      nextStatus === 'inactive'
                        ? 'Member set inactive. Email and SMS reminders stopped.'
                        : 'Member activated. Reminders will resume if the membership is due.'
                    );
                  } catch (error) {
                    toast.push(error.response?.data?.message || 'Could not update status', 'error');
                  }
                }}
                className="flex-1 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white"
              >
                {selected.status === 'inactive' ? 'Activate member' : 'Set inactive'}
              </button>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
