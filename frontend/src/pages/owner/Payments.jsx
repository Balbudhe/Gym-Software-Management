import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import Pagination from '../../components/common/Pagination';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import FilterBar, { FilterField } from '../../components/filters/FilterBar';
import Modal from '../../components/common/Modal';
import FormField from '../../components/forms/FormField';
import Badge from '../../components/common/Badge';
import { formatDateTime } from '../../utils/format';

const methodBadge = (method) =>
  method === 'online' ? <Badge tone="blue">Online</Badge> : <Badge tone="green">Cash</Badge>;

const money = (value) => `₹${Number(value || 0).toLocaleString('en-IN')}`;

export default function OwnerPayments() {
  const { user } = useAuth();
  const { selectedBranch } = useBranch();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ cashTotal: 0, onlineTotal: 0, enabled: false });
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [members, setMembers] = useState([]);
  const [open, setOpen] = useState(false);
  const [filters, setFilters] = useState({ method: '', from: '', to: '' });
  const form = useForm({
    defaultValues: { paidAt: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' },
  });
  const paymentMethod = form.watch('paymentMethod');

  const params = useMemo(
    () => ({
      page,
      limit: 20,
      method: filters.method || undefined,
      from: filters.from || undefined,
      to: filters.to || undefined,
    }),
    [page, filters, selectedBranch]
  );

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/payments', { params });
      setRows(data.items || []);
      setPagination(data.pagination);
      setSummary(data.summary || { cashTotal: 0, onlineTotal: 0, enabled: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [params]);

  useEffect(() => {
    api.get('/members', { params: { limit: 100 } }).then(({ data }) => setMembers(data.items || []));
  }, [selectedBranch]);

  const savePayment = async (values) => {
    try {
      await api.post('/payments', values);
      toast.push('Payment recorded');
      setOpen(false);
      form.reset({ paidAt: new Date().toISOString().slice(0, 10), paymentMethod: 'cash' });
      load();
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not record payment', 'error');
    }
  };

  if (!user?.paymentsEnabled && !summary.enabled) {
    return (
      <div>
        <PageHeader title="Payments" subtitle="Cash and online membership payments" />
        <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Payment tracking is turned off. Enable it in{' '}
          <Link className="font-medium text-brand-700" to="/owner/settings">
            Settings
          </Link>{' '}
          to collect cash or online payments and view them here. Only the gym owner can see this page.
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Payments"
        subtitle="Visible only to the gym owner"
        actions={
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            onClick={() => setOpen(true)}
          >
            Record payment
          </button>
        }
      />
      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Cash</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{money(summary.cashTotal)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Online</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{money(summary.onlineTotal)}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">
            {money((summary.cashTotal || 0) + (summary.onlineTotal || 0))}
          </p>
        </div>
      </div>
      <FilterBar>
        <FilterField label="Method">
          <select
            value={filters.method}
            onChange={(e) => {
              setFilters({ ...filters, method: e.target.value });
              setPage(1);
            }}
          >
            <option value="">All</option>
            <option value="cash">Cash</option>
            <option value="online">Online</option>
          </select>
        </FilterField>
        <FilterField label="From">
          <input
            type="date"
            value={filters.from}
            onChange={(e) => {
              setFilters({ ...filters, from: e.target.value });
              setPage(1);
            }}
          />
        </FilterField>
        <FilterField label="To">
          <input
            type="date"
            value={filters.to}
            onChange={(e) => {
              setFilters({ ...filters, to: e.target.value });
              setPage(1);
            }}
          />
        </FilterField>
      </FilterBar>
      {loading ? (
        <Skeleton />
      ) : (
        <>
          <DataTable
            rows={rows}
            columns={[
              { key: 'date', header: 'Date', render: (r) => formatDateTime(r.paidAt || r.createdAt) },
              { key: 'member', header: 'Member', render: (r) => r.memberId?.name || '—' },
              { key: 'code', header: 'Member ID', render: (r) => r.memberId?.memberCode || '—' },
              { key: 'phone', header: 'Phone', render: (r) => r.memberId?.phone || '—' },
              { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name || '—' },
              { key: 'method', header: 'Cash / Online', render: (r) => methodBadge(r.method) },
              { key: 'amount', header: 'Amount', render: (r) => money(r.amount) },
              { key: 'ref', header: 'Reference', render: (r) => r.reference || '—' },
              { key: 'notes', header: 'Notes', render: (r) => r.notes || '—' },
              {
                key: 'by',
                header: 'Collected by',
                render: (r) =>
                  r.collectedBy ||
                  (r.recordedByRole === 'TRAINER' ? r.createdByTrainerId?.name || 'Trainer' : 'Admin'),
              },
            ]}
          />
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}

      <Modal open={open} title="Record payment" onClose={() => setOpen(false)}>
        <form className="space-y-3" onSubmit={form.handleSubmit(savePayment)}>
          <FormField label="Member" required>
            <select {...form.register('memberId', { required: true })}>
              <option value="">Select member</option>
              {members.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.name} · {member.memberCode}
                </option>
              ))}
            </select>
          </FormField>
          <FormField label="Payment method" required>
            <select {...form.register('paymentMethod', { required: true })}>
              <option value="cash">Cash</option>
              <option value="online">Online</option>
            </select>
          </FormField>
          <FormField label="Amount (₹)" required>
            <input type="number" min="0" step="1" {...form.register('paymentAmount', { required: true })} />
          </FormField>
          {paymentMethod === 'online' ? (
            <FormField label="Online reference / UPI ID">
              <input {...form.register('paymentReference')} />
            </FormField>
          ) : null}
          <FormField label="Date">
            <input type="date" {...form.register('paidAt')} />
          </FormField>
          <FormField label="Notes">
            <input {...form.register('paymentNotes')} />
          </FormField>
          <button type="submit" className="w-full rounded-lg bg-slate-900 py-2 text-sm text-white">
            Save payment
          </button>
        </form>
      </Modal>
    </div>
  );
}
