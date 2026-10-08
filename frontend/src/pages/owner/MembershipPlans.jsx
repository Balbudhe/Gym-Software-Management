import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { CreditCard, Pencil, Plus, Sparkles } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import Skeleton from '../../components/common/Skeleton';
import Modal from '../../components/common/Modal';
import FormField from '../../components/forms/FormField';
import EmptyState from '../../components/common/EmptyState';
import { statusBadge } from '../../components/common/Badge';
import { cn } from '../../utils/format';

const defaultValues = {
  name: '',
  durationValue: 1,
  durationUnit: 'month',
  price: '',
  description: '',
  status: 'active',
};

export default function MembershipPlans() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues,
  });

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/membership-plans');
      setRows(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === 'active').length;
    const inactive = rows.length - active;
    const avgPrice = rows.length
      ? Math.round(rows.reduce((sum, r) => sum + Number(r.price || 0), 0) / rows.length)
      : 0;
    return { total: rows.length, active, inactive, avgPrice };
  }, [rows]);

  const openCreate = () => {
    setEditing(null);
    reset(defaultValues);
    setOpen(true);
  };

  const openEdit = (plan) => {
    setEditing(plan);
    reset({
      name: plan.name || '',
      durationValue: plan.durationValue || 1,
      durationUnit: plan.durationUnit || 'month',
      price: plan.price ?? '',
      description: plan.description || '',
      status: plan.status || 'active',
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    reset(defaultValues);
  };

  const onSubmit = async (values) => {
    setSaving(true);
    try {
      const payload = {
        ...values,
        durationValue: Number(values.durationValue),
        price: Number(values.price),
      };
      if (editing) {
        await api.put(`/membership-plans/${editing._id}`, payload);
        toast.push('Plan updated');
      } else {
        await api.post('/membership-plans', payload);
        toast.push('Plan created');
      }
      closeModal();
      load();
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not save plan', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Memberships
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">
            Membership plans
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Gym-wide plans available at every branch for new admissions.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add plan
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total plans</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Active</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Inactive</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.inactive}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Avg. price</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">
            {stats.total ? `₹${stats.avgPrice}` : '—'}
          </p>
        </div>
      </div>

      {loading ? (
        <Skeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No membership plans yet"
          description="Create your first plan so trainers and owners can admit members."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((plan) => (
            <div
              key={plan._id}
              className={cn(
                'overflow-hidden rounded-2xl border bg-white shadow-sm transition',
                plan.status === 'active'
                  ? 'border-slate-200/80 hover:border-slate-300 hover:shadow-md'
                  : 'border-slate-200/60 opacity-80'
              )}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-4">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <CreditCard size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">{plan.name}</p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {plan.durationValue} {plan.durationUnit}
                    </p>
                  </div>
                </div>
                {statusBadge(plan.status)}
              </div>

              <div className="px-5 py-5">
                <p className="text-3xl font-semibold tracking-tight text-slate-900">
                  ₹{Number(plan.price || 0).toLocaleString('en-IN')}
                </p>
                <p className="mt-2 min-h-[40px] text-sm text-slate-500">
                  {plan.description || 'No description added'}
                </p>
              </div>

              <div className="flex items-center justify-between border-t border-slate-100 px-5 py-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                  <Sparkles size={13} className="text-brand-600" />
                  Gym-wide plan
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(plan)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Pencil size={14} />
                  Edit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? 'Edit membership plan' : 'New membership plan'}
        onClose={closeModal}
        wide
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-800">Plan details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField label="Plan name" error={errors.name?.message}>
                  <input
                    placeholder="Monthly / Quarterly / Yearly"
                    {...register('name', { required: 'Required' })}
                  />
                </FormField>
              </div>
              <FormField label="Duration value" error={errors.durationValue?.message}>
                <input
                  type="number"
                  min="1"
                  {...register('durationValue', {
                    required: 'Required',
                    min: { value: 1, message: 'Min 1' },
                  })}
                />
              </FormField>
              <FormField label="Duration unit">
                <select {...register('durationUnit')}>
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </FormField>
              <FormField label="Price (₹)" error={errors.price?.message}>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="1500"
                  {...register('price', {
                    required: 'Required',
                    min: { value: 0, message: 'Invalid price' },
                  })}
                />
              </FormField>
              {editing ? (
                <FormField label="Status">
                  <select {...register('status')}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </FormField>
              ) : null}
              <div className="sm:col-span-2">
                <FormField label="Description">
                  <input
                    placeholder="Short summary shown during admissions"
                    {...register('description')}
                  />
                </FormField>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-[1.4] rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
            >
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Create plan'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
