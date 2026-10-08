import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import {
  Building2,
  MapPin,
  Pencil,
  Plus,
  Users,
  UserCheck,
  Clock3,
  UserX,
} from 'lucide-react';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import FormField from '../../components/forms/FormField';
import EmptyState from '../../components/common/EmptyState';
import { statusBadge } from '../../components/common/Badge';
import { cn } from '../../utils/format';

export default function Branches() {
  const { branches, reloadBranches } = useBranch();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  const stats = useMemo(() => {
    const active = branches.filter((b) => b.status === 'active').length;
    const members = branches.reduce((sum, b) => sum + (b.counts?.members || 0), 0);
    const trainers = branches.reduce((sum, b) => sum + (b.counts?.trainers || 0), 0);
    return {
      total: branches.length,
      active,
      members,
      trainers,
    };
  }, [branches]);

  const openCreate = () => {
    setEditing(null);
    reset({});
    setOpen(true);
  };

  const openEdit = (branch) => {
    setEditing(branch);
    reset({
      name: branch.name || '',
      branchCode: branch.branchCode || '',
      city: branch.city || '',
      state: branch.state || '',
      pincode: branch.pincode || '',
    });
    setOpen(true);
  };

  const closeModal = () => {
    setOpen(false);
    setEditing(null);
    reset({});
  };

  const save = async (values) => {
    setSaving(true);
    try {
      if (editing) await api.put(`/branches/${editing._id}`, values);
      else await api.post('/branches', values);
      toast.push(editing ? 'Branch updated' : 'Branch added');
      closeModal();
      reloadBranches();
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not save branch', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async () => {
    await api.patch(`/branches/${confirm._id}/status`);
    toast.push('Branch status updated');
    setConfirm(null);
    reloadBranches();
  };

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
            Locations
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">Branches</h1>
          <p className="mt-1 text-sm text-slate-500">
            Manage every physical location under your gym.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <Plus size={16} />
          Add branch
        </button>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total branches</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Active</p>
          <p className="mt-2 text-2xl font-semibold text-brand-700">{stats.active}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total trainers</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.trainers}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Total members</p>
          <p className="mt-2 text-2xl font-semibold text-slate-900">{stats.members}</p>
        </div>
      </div>

      {!branches.length ? (
        <EmptyState
          title="No branches yet"
          description="Add your first branch to start assigning trainers and admitting members."
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map((branch) => (
            <div
              key={branch._id}
              className={cn(
                'rounded-2xl border bg-white p-5 shadow-sm transition',
                branch.status === 'active'
                  ? 'border-slate-200 hover:border-slate-300 hover:shadow-md'
                  : 'border-slate-200 opacity-80'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <Building2 size={18} />
                  </div>
                  <div className="min-w-0">
                    <Link
                      to={`/owner/branches/${branch._id}`}
                      className="block truncate text-lg font-semibold text-slate-900 hover:text-brand-700"
                    >
                      {branch.name}
                    </Link>
                    <p className="mt-0.5 text-xs font-medium uppercase tracking-wide text-slate-400">
                      {branch.branchCode || 'No code'}
                    </p>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-slate-500">
                      <MapPin size={14} className="shrink-0 text-slate-400" />
                      <span>
                        {[branch.city, branch.state, branch.pincode].filter(Boolean).join(', ') ||
                          'Location not set'}
                      </span>
                    </p>
                  </div>
                </div>
                {statusBadge(branch.status)}
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    <Users size={12} />
                    Trainers
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {branch.counts?.trainers ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    <UserCheck size={12} />
                    Active
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-900">
                    {branch.counts?.activeMembers ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    <Clock3 size={12} />
                    Expiring
                  </p>
                  <p className="mt-1 text-lg font-semibold text-amber-700">
                    {branch.counts?.expiringMembers ?? 0}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3">
                  <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-slate-400">
                    <UserX size={12} />
                    Expired
                  </p>
                  <p className="mt-1 text-lg font-semibold text-red-600">
                    {branch.counts?.expiredMembers ?? 0}
                  </p>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
                <Link
                  to={`/owner/branches/${branch._id}`}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  View details
                </Link>
                <button
                  type="button"
                  onClick={() => openEdit(branch)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  <Pencil size={14} />
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => setConfirm(branch)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                >
                  {branch.status === 'active' ? 'Deactivate' : 'Activate'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={open}
        title={editing ? 'Edit branch' : 'Add branch'}
        onClose={closeModal}
        wide
      >
        <form onSubmit={handleSubmit(save)} className="space-y-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <p className="mb-3 text-sm font-semibold text-slate-800">Branch details</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Branch name" error={errors.name?.message}>
                <input
                  placeholder="Pune Main Branch"
                  {...register('name', { required: 'Required' })}
                />
              </FormField>
              <FormField label="Branch code">
                <input placeholder="Auto if empty (e.g. BR001)" {...register('branchCode')} />
              </FormField>
              <FormField label="City">
                <input placeholder="Pune" {...register('city')} />
              </FormField>
              <FormField label="State">
                <input placeholder="Maharashtra" {...register('state')} />
              </FormField>
              <FormField label="Pincode">
                <input placeholder="411001" {...register('pincode')} />
              </FormField>
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
              {saving ? 'Saving...' : editing ? 'Save changes' : 'Create branch'}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirm}
        title="Change branch status"
        message="Deactivated branches remain in history but should not be used for new admissions."
        onClose={() => setConfirm(null)}
        onConfirm={toggle}
      />
    </div>
  );
}
