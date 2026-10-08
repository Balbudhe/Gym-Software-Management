import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import DataTable from '../../components/tables/DataTable';
import Badge from '../../components/common/Badge';
import { formatDate, formatDateTime, formatMoney } from '../../utils/format';

const istYmd = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);

const methodBadge = (method) =>
  method === 'online' ? <Badge tone="blue">Online</Badge> : <Badge tone="green">Cash</Badge>;

const collectedByBadge = (row) => {
  const name =
    row.collectedBy ||
    (row.recordedByRole === 'TRAINER' ? row.createdByTrainerId?.name || 'Trainer' : 'Admin');
  if (name === 'Admin') return <Badge>Admin</Badge>;
  return <Badge tone="green">{name}</Badge>;
};

const paymentColumns = [
  { key: 'time', header: 'Date', render: (r) => formatDateTime(r.paidAt || r.createdAt) },
  { key: 'member', header: 'Member', render: (r) => r.memberId?.name || '—' },
  { key: 'code', header: 'Member ID', render: (r) => r.memberId?.memberCode || '—' },
  { key: 'phone', header: 'Phone', render: (r) => r.memberId?.phone || '—' },
  { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name || '—' },
  { key: 'method', header: 'Cash / Online', render: (r) => methodBadge(r.method) },
  { key: 'amount', header: 'Amount', render: (r) => formatMoney(r.amount) },
  { key: 'ref', header: 'Reference', render: (r) => r.reference || '—' },
  { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
  { key: 'by', header: 'Collected by', render: collectedByBadge },
];

const formatChartDay = (value) => {
  if (!value) return '';
  const parsed = new Date(`${value}T00:00:00+05:30`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

function TotalsCard({ label, hint, cash, online, total, method }) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">{formatMoney(total)}</p>
      {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      {method === 'all' ? (
        <p className="mt-2 text-xs text-slate-500">
          Cash {formatMoney(cash)} · Online {formatMoney(online)}
        </p>
      ) : (
        <p className="mt-2 text-xs capitalize text-slate-500">{method} only</p>
      )}
    </div>
  );
}

export default function PaymentHistorySection() {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const todayKey = istYmd();
  const [method, setMethod] = useState('');
  const [month, setMonth] = useState(todayKey.slice(0, 7));
  const [date, setDate] = useState('');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const params = useMemo(
    () => ({
      method: method || undefined,
      month,
      date: date || undefined,
    }),
    [method, month, date, selectedBranch]
  );

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get('/payments/history', { params });
        setData(res.data);
      } catch {
        setData(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [params]);

  const onMonthChange = (next) => {
    setMonth(next);
    if (date && !date.startsWith(next)) setDate('');
  };

  const onDateChange = (next) => {
    if (!next) {
      setDate('');
      return;
    }
    if (next > todayKey) return;
    setDate(next);
    setMonth(next.slice(0, 7));
  };

  const methodKey = data?.method || (method || 'all');
  const today = data?.today || { cash: 0, online: 0, total: 0, count: 0, date: todayKey };
  const selected = data?.selectedDay;
  const monthSummary = data?.monthSummary || { cash: 0, online: 0, total: 0, count: 0, month };
  const daily = data?.daily || [];
  const items = data?.items || [];
  const monthHasFees = daily.some((row) => Number(row.total) > 0);

  const activeDays = daily.filter((row) => Number(row.count) > 0);

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">Fees collected</h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Today’s collection, month growth, and every cash or online payment. Owner only.
          </p>
        </div>
        <Link to="/owner/payments" className="text-sm font-medium text-brand-700">
          View all
        </Link>
      </div>

      <div className="p-5">
      {!user?.paymentsEnabled && !data?.enabled ? (
        <p className="mb-4 rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          Payment tracking is off.{' '}
          <Link className="font-medium underline" to="/owner/settings">
            Enable it in Settings
          </Link>{' '}
          to record new fees. Past records still show here.
        </p>
      ) : null}

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Type
          <select
            className="mt-1.5 w-full"
            value={method}
            onChange={(e) => setMethod(e.target.value)}
          >
            <option value="">All payments</option>
            <option value="cash">Cash only</option>
            <option value="online">Online only</option>
          </select>
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Month
          <input
            className="mt-1.5 w-full"
            type="month"
            value={month}
            max={todayKey.slice(0, 7)}
            onChange={(e) => onMonthChange(e.target.value)}
          />
        </label>
        <label className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">
          Day <span className="font-normal normal-case tracking-normal text-slate-400">(optional)</span>
          <input
            className="mt-1.5 w-full"
            type="date"
            value={date}
            max={todayKey}
            onChange={(e) => onDateChange(e.target.value)}
          />
        </label>
      </div>

      <div className={`mb-5 grid gap-3 ${selected ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        <TotalsCard
          label="Today collected"
          hint={`${today.count || 0} payment${today.count === 1 ? '' : 's'} today`}
          cash={today.cash}
          online={today.online}
          total={today.total}
          method={methodKey}
        />
        {selected ? (
          <TotalsCard
            label="Selected date"
            hint={formatDate(`${selected.date}T00:00:00+05:30`)}
            cash={selected.cash}
            online={selected.online}
            total={selected.total}
            method={methodKey}
          />
        ) : null}
        <TotalsCard
          label="Month total"
          hint="Running total of everyday fees this month"
          cash={monthSummary.cash}
          online={monthSummary.online}
          total={monthSummary.total}
          method={methodKey}
        />
      </div>

      <h3 className="mb-3 text-sm font-semibold text-slate-900">Month trend</h3>
      <div className="mb-6 h-64 w-full min-w-0">
        {loading ? (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">Loading payments…</div>
        ) : monthHasFees ? (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={daily}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: '#64748b' }}
                tickFormatter={formatChartDay}
                interval={2}
                axisLine={false}
                tickLine={false}
              />
              <YAxis yAxisId="day" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="run" orientation="right" allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
              <Tooltip
                labelFormatter={formatChartDay}
                formatter={(value, name) => [formatMoney(value), name === 'increment' ? 'Running total' : 'Day total']}
              />
              <Bar yAxisId="day" dataKey="total" fill="#059669" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Line yAxisId="run" type="monotone" dataKey="increment" stroke="#0f172a" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 text-center">
            <p className="text-sm font-medium text-slate-800">No fees collected this month</p>
            <p className="mt-1 text-xs text-slate-500">
              Record a cash or online payment and it will appear here.
            </p>
          </div>
        )}
      </div>

      {activeDays.length > 0 ? (
        <div className="mb-6">
          <h3 className="mb-3 text-sm font-semibold text-slate-900">Days with collections</h3>
          <DataTable
            rows={activeDays}
            empty="No daily totals for this month"
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDate(`${r.date}T00:00:00+05:30`) },
              { key: 'cash', header: 'Cash', render: (r) => formatMoney(r.cash) },
              { key: 'online', header: 'Online', render: (r) => formatMoney(r.online) },
              { key: 'total', header: 'Day total', render: (r) => formatMoney(r.total) },
              { key: 'increment', header: 'Running total', render: (r) => formatMoney(r.increment) },
            ]}
          />
        </div>
      ) : null}

      <h3 className="mb-3 text-sm font-semibold text-slate-900">
        Payment history
        <span className="ml-2 font-normal text-slate-400">
          {date ? formatDate(`${date}T00:00:00+05:30`) : 'This month'}
        </span>
      </h3>
      {loading ? (
        <p className="text-sm text-slate-400">Loading transactions…</p>
      ) : (
        <DataTable rows={items} empty="No payments match these filters" columns={paymentColumns} />
      )}
      </div>
    </section>
  );
}
