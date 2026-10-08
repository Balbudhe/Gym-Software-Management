import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowUpRight,
  CalendarPlus,
  Clock,
  Dumbbell,
  Users,
  UserCheck,
  UserPlus,
  UserX,
  Wallet,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import { cn, formatDate, formatDateTime, initials } from '../../utils/format';
import { statusBadge } from '../../components/common/Badge';
import AttendanceLocation from '../../components/attendance/AttendanceLocation';
import PaymentHistorySection from './PaymentHistorySection';

const greeting = () => {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kolkata',
      hour: 'numeric',
      hour12: false,
    }).format(new Date())
  );
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const todayLabel = () =>
  new Date().toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  });

const formatChartDay = (value) => {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const count = Number(payload[0].value) || 0;
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-lg">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{formatChartDay(label)}</p>
      <p className="mt-0.5 text-sm font-semibold text-slate-900">
        {count} new admission{count === 1 ? '' : 's'}
      </p>
    </div>
  );
}

function KpiCard({ label, value, hint, icon: Icon, to, tone = 'slate' }) {
  const tones = {
    slate: 'bg-slate-100 text-slate-600',
    green: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    red: 'bg-rose-50 text-rose-700',
    blue: 'bg-sky-50 text-sky-700',
  };
  const body = (
    <div className="group h-full rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        <span className={cn('flex h-9 w-9 items-center justify-center rounded-xl', tones[tone])}>
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">{value ?? 0}</p>
      {hint ? <p className="mt-1 text-xs leading-5 text-slate-500">{hint}</p> : null}
      {to ? (
        <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-brand-700 opacity-0 transition group-hover:opacity-100">
          View <ArrowUpRight size={12} />
        </p>
      ) : null}
    </div>
  );
  return to ? <Link to={to} className="block h-full">{body}</Link> : body;
}

function Panel({ title, subtitle, action, children, padded = true }) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuth();
  const { selectedBranch, currentBranch } = useBranch();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/reports/dashboard');
        setData(res.data);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedBranch]);

  if (loading || !data) {
    return (
      <div className="mx-auto max-w-6xl">
        <Skeleton rows={10} />
      </div>
    );
  }

  const stats = data.stats || {};
  const chartData = data.admissionsByDay || [];
  const recentAdmissions = data.recentAdmissions || [];
  const recentAttendance = data.recentAttendance || [];
  const chartTotal = chartData.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const firstName = (user?.name || 'there').split(' ')[0];
  const branchLabel =
    selectedBranch === 'ALL' ? 'All branches' : currentBranch?.name || 'Selected branch';
  const needsAttention = Number(stats.expiringSoon || 0) + Number(stats.expired || 0);

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">Overview</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {todayLabel()} · {branchLabel}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/owner/admissions/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
          >
            <UserPlus size={16} />
            New admission
          </Link>
          <Link
            to="/owner/payments"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <Wallet size={16} />
            Payments
          </Link>
        </div>
      </div>

      {needsAttention > 0 ? (
        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-amber-100 bg-amber-50/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-950">Memberships need attention</p>
            <p className="mt-0.5 text-sm text-amber-800/80">
              {stats.expiringSoon > 0 ? `${stats.expiringSoon} expire in the next 7 days` : null}
              {stats.expiringSoon > 0 && stats.expired > 0 ? ' · ' : null}
              {stats.expired > 0 ? `${stats.expired} already expired` : null}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {stats.expiringSoon > 0 ? (
              <Link
                to="/owner/members/expiring"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm ring-1 ring-amber-200"
              >
                Review expiring
              </Link>
            ) : null}
            {stats.expired > 0 ? (
              <Link
                to="/owner/members/expired"
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm ring-1 ring-amber-200"
              >
                Review expired
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <KpiCard
          label="Total members"
          value={stats.totalMembers}
          hint="Everyone currently on file"
          icon={Users}
          to="/owner/members"
          tone="slate"
        />
        <KpiCard
          label="Active members"
          value={stats.activeMembers}
          hint="Membership still valid"
          icon={UserCheck}
          to="/owner/members/active"
          tone="green"
        />
        <KpiCard
          label="Expiring soon"
          value={stats.expiringSoon}
          hint="Next 7 days — follow up for renewal"
          icon={CalendarPlus}
          to="/owner/members/expiring"
          tone="amber"
        />
        <KpiCard
          label="Expired"
          value={stats.expired}
          hint="Membership already lapsed"
          icon={UserX}
          to="/owner/members/expired"
          tone="red"
        />
        <KpiCard
          label="Trainers"
          value={stats.totalTrainers}
          hint="Active and inactive staff"
          icon={Dumbbell}
          to="/owner/trainers"
          tone="blue"
        />
        <KpiCard
          label="Present today"
          value={stats.presentToday}
          hint="Trainers who have checked in"
          icon={Clock}
          to="/owner/trainers/attendance"
          tone="green"
        />
      </div>

      <div className="mt-6">
        <PaymentHistorySection />
      </div>

      <div className="mt-6">
        <Panel
          title="New admissions"
          subtitle="Members added in the last 14 days. Older members still appear in the cards above."
        >
          <div className="mb-4 flex items-baseline justify-between gap-3">
            <p className="text-3xl font-semibold tracking-tight text-slate-900">{chartTotal}</p>
            <p className="text-xs text-slate-500">in this period</p>
          </div>
          <div className="h-64 w-full min-w-0">
            {chartTotal === 0 ? (
              <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
                <p className="text-sm font-medium text-slate-800">No new members in the last 14 days</p>
                <p className="mt-1 max-w-sm text-xs text-slate-500">
                  Add an admission when someone joins. Existing members are unchanged.
                </p>
                <Link
                  to="/owner/admissions/new"
                  className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white"
                >
                  <UserPlus size={14} />
                  Add admission
                </Link>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis
                    dataKey="_id"
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={formatChartDay}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: 'rgba(15, 23, 42, 0.04)' }} content={<ChartTooltip />} />
                  <Bar dataKey="count" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Recent admissions"
          subtitle="Latest members added, newest first"
          action={
            <Link to="/owner/admissions" className="text-sm font-medium text-brand-700">
              View all
            </Link>
          }
          padded={false}
        >
          <div className="p-5 pt-4">
            <DataTable
              rows={recentAdmissions}
              empty="No admissions yet. New members will show up here."
              columns={[
                {
                  key: 'name',
                  header: 'Member',
                  render: (r) => (
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white">
                        {initials(r.name)}
                      </span>
                      <span className="font-medium text-slate-900">{r.name}</span>
                    </div>
                  ),
                },
                { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name || '—' },
                { key: 'added', header: 'Added by', render: (r) => r.createdByTrainerId?.name || 'Admin' },
                { key: 'date', header: 'Date', render: (r) => formatDate(r.createdAt) },
              ]}
            />
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <Panel
          title="Trainer attendance today"
          subtitle="Who has checked in at the gym today"
          action={
            <Link to="/owner/trainers/attendance" className="text-sm font-medium text-brand-700">
              View all
            </Link>
          }
          padded={false}
        >
          <div className="p-5 pt-4">
            <DataTable
              rows={recentAttendance}
              empty="No trainers have checked in today."
              columns={[
                {
                  key: 'trainer',
                  header: 'Trainer',
                  render: (r) => (
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">
                        {initials(r.trainerId?.name)}
                      </span>
                      <span className="font-medium text-slate-900">{r.trainerId?.name || '—'}</span>
                    </div>
                  ),
                },
                { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name || '—' },
                {
                  key: 'in',
                  header: 'Check in',
                  render: (r) => (
                    <div className="min-w-[180px]">
                      <div>{formatDateTime(r.checkInTime)}</div>
                      <AttendanceLocation location={r.checkInLocation} compact />
                    </div>
                  ),
                },
                { key: 'status', header: 'Status', render: (r) => statusBadge(r.status) },
              ]}
            />
          </div>
        </Panel>
      </div>
    </div>
  );
}
