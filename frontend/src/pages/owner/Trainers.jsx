import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Clock, Dumbbell, Mail, MapPin, Phone, Plus, RotateCcw, Search, Trash2, UserPlus } from 'lucide-react';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../context/ToastContext';
import Skeleton from '../../components/common/Skeleton';
import Pagination from '../../components/common/Pagination';
import Modal from '../../components/common/Modal';
import FormField from '../../components/forms/FormField';
import BatchTimingPicker from '../../components/forms/BatchTimingPicker';
import EmptyState from '../../components/common/EmptyState';
import BatchChips from '../../components/common/BatchChips';
import { statusBadge } from '../../components/common/Badge';
import { formatDate, initials, cn } from '../../utils/format';
import { emptyBatchState, stateToBatches, validateBatchState } from '../../utils/batches';
import { useDebounce } from '../../hooks/useDebounce';
import ConfirmDialog from '../../components/common/ConfirmDialog';

export default function OwnerTrainers() {
  const { selectedBranch, branches, currentBranch } = useBranch();
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { joiningDate: new Date().toISOString().slice(0, 10) },
  });
  const [batchState, setBatchState] = useState(emptyBatchState());
  const [batchError, setBatchError] = useState('');
  const [confirmTrainer, setConfirmTrainer] = useState(null);
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/trainers', {
        params: { page, limit: 12, search: debouncedSearch || undefined },
      });
      setRows(data.items || []);
      setPagination(data.pagination);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [selectedBranch, debouncedSearch]);

  useEffect(() => {
    load();
  }, [selectedBranch, page, debouncedSearch]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => r.status === 'active').length;
    return {
      total: pagination?.total ?? rows.length,
      active,
      showing: rows.length,
    };
  }, [rows, pagination]);

  const onCreate = async (values) => {
    const timingError = validateBatchState(batchState);
    if (timingError) {
      setBatchError(timingError);
      return;
    }
    setSaving(true);
    try {
      await api.post('/trainers', { ...values, batches: stateToBatches(batchState) });
      toast.push('Trainer created');
      setOpen(false);
      reset({ joiningDate: new Date().toISOString().slice(0, 10) });
      setBatchState(emptyBatchState());
      setBatchError('');
      load();
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not create trainer', 'error');
    } finally {
      setSaving(false);
    }
  };

  const removeTrainer = async () => {
    if (!confirmTrainer || removing) return;
    setRemoving(true);
    try {
      await api.delete(`/trainers/${confirmTrainer._id}`);
      toast.push('Trainer removed');
      setConfirmTrainer(null);
      load();
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not remove trainer', 'error');
    } finally {
      setRemoving(false);
    }
  };

  const restoreTrainer = async (trainer) => {
    try {
      await api.put(`/trainers/${trainer._id}`, { status: 'active' });
      toast.push('Trainer restored');
      load();
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not restore trainer', 'error');
    }
  };

  const openCreate = () => {
    reset({
      joiningDate: new Date().toISOString().slice(0, 10),
      branchId: selectedBranch !== 'ALL' ? selectedBranch : '',
    });
    setBatchState(emptyBatchState());
    setBatchError('');
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Staff
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Trainers</h1>
          <p className="mt-1 text-sm text-slate-500">
            {selectedBranch === 'ALL'
              ? 'Managing trainers across all branches'
              : `Filtered to ${currentBranch?.name || 'selected branch'}`}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add trainer
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total trainers</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">On this page</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.showing}</p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Active shown</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{stats.active}</p>
        </div>
      </div>

      <div className="mb-5 rounded-2xl border border-slate-200/80 bg-white p-3 shadow-sm sm:p-4">
        <label className="relative block">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or phone"
            className="w-full border-0 bg-slate-50 py-2.5 pl-10 pr-3 shadow-none focus:ring-brand-500/20"
          />
        </label>
      </div>

      {loading ? (
        <Skeleton rows={6} />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No trainers found"
          description={
            debouncedSearch
              ? 'Try a different search, or clear filters.'
              : 'Add your first trainer to start assigning members and tracking attendance.'
          }
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map((trainer) => (
              <div
                key={trainer._id}
                className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md"
              >
                <Link to={`/owner/trainers/${trainer._id}`} className="block">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/60 px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-white">
                        {initials(trainer.name)}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900 hover:text-brand-700">
                          {trainer.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-slate-500">{trainer.email}</p>
                      </div>
                    </div>
                    {statusBadge(trainer.status === 'inactive' ? 'inactive' : trainer.status)}
                  </div>
                  <div className="space-y-2.5 px-5 py-4 text-sm text-slate-600">
                    <p className="flex items-center gap-2">
                      <MapPin size={14} className="shrink-0 text-slate-400" />
                      <span className="truncate">{trainer.branchId?.name || '—'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Phone size={14} className="shrink-0 text-slate-400" />
                      <span>{trainer.phone || '—'}</span>
                    </p>
                    <p className="flex items-center gap-2">
                      <Dumbbell size={14} className="shrink-0 text-slate-400" />
                      <span>Joined {formatDate(trainer.joiningDate)}</span>
                    </p>
                    <div className="flex items-start gap-2">
                      <Clock size={14} className="mt-0.5 shrink-0 text-slate-400" />
                      <BatchChips batches={trainer.batches} />
                    </div>
                    {trainer.experience ? (
                      <p className="rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-500">
                        Experience: {trainer.experience}
                      </p>
                    ) : null}
                  </div>
                </Link>
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 px-5 py-3">
                  <Link to={`/owner/trainers/${trainer._id}`} className="text-xs font-medium text-brand-700">
                    View profile →
                  </Link>
                  {trainer.status === 'inactive' ? (
                    <button
                      type="button"
                      onClick={() => restoreTrainer(trainer)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    >
                      <RotateCcw size={12} />
                      Restore
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmTrainer(trainer)}
                      className="inline-flex items-center gap-1 rounded-lg border border-red-100 px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={12} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}

      <Modal open={open} title="Add trainer" onClose={() => setOpen(false)} wide>
        <form onSubmit={handleSubmit(onCreate)} className="space-y-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <UserPlus size={16} />
              Account details
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Full name" error={errors.name?.message}>
                <input placeholder="Amit Sharma" {...register('name', { required: 'Required' })} />
              </FormField>
              <FormField label="Email" error={errors.email?.message}>
                <input
                  type="email"
                  placeholder="amit@gym.com"
                  {...register('email', { required: 'Required' })}
                />
              </FormField>
              <FormField label="Password" error={errors.password?.message}>
                <input
                  type="password"
                  placeholder="Min 8 characters"
                  {...register('password', {
                    required: 'Required',
                    minLength: { value: 8, message: 'Min 8 characters' },
                  })}
                />
              </FormField>
              <FormField label="Phone">
                <input placeholder="9876543210" {...register('phone')} />
              </FormField>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
              <MapPin size={16} />
              Branch assignment
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Branch" error={errors.branchId?.message}>
                <select {...register('branchId', { required: 'Required' })}>
                  <option value="">Select branch</option>
                  {branches.map((b) => (
                    <option key={b._id} value={b._id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Joining date">
                <input type="date" {...register('joiningDate')} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Experience">
                  <input placeholder="e.g. 4 years" {...register('experience')} />
                </FormField>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <BatchTimingPicker
              value={batchState}
              onChange={(next) => {
                setBatchState(next);
                setBatchError('');
              }}
              error={batchError}
            />
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-500">
            <Mail size={14} className="mt-0.5 shrink-0" />
            The trainer will sign in with the gym code plus this email and password.
          </div>

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className={cn(
                'flex-[1.4] rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white',
                saving && 'opacity-60'
              )}
            >
              {saving ? 'Creating...' : 'Create trainer'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTrainer}
        title="Remove trainer"
        message={
          confirmTrainer
            ? `${confirmTrainer.name} will be removed. They cannot log in, and members assigned to them will be unassigned. You can restore them later.`
            : ''
        }
        confirmLabel={removing ? 'Removing...' : 'Remove trainer'}
        danger
        onConfirm={removeTrainer}
        onClose={() => {
          if (!removing) setConfirmTrainer(null);
        }}
      />
    </div>
  );
}
