import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StatCard from '../../components/common/StatCard';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import BatchChips from '../../components/common/BatchChips';
import BatchTimingPicker from '../../components/forms/BatchTimingPicker';
import { statusBadge } from '../../components/common/Badge';
import { formatDate, formatDateTime } from '../../utils/format';
import AuthImage from '../../components/common/AuthImage';
import AttendanceLocation from '../../components/attendance/AttendanceLocation';
import { batchesToState, emptyBatchState, stateToBatches, validateBatchState } from '../../utils/batches';

export default function TrainerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [data, setData] = useState(null);
  const [batchState, setBatchState] = useState(emptyBatchState());
  const [batchError, setBatchError] = useState('');
  const [savingBatches, setSavingBatches] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const [removing, setRemoving] = useState(false);

  const load = () => {
    api.get(`/trainers/${id}/stats`).then(({ data: d }) => {
      setData(d);
      setBatchState(batchesToState(d.item?.batches));
      setBatchError('');
    });
  };

  useEffect(() => {
    load();
  }, [id]);

  const saveBatches = async () => {
    const timingError = validateBatchState(batchState);
    if (timingError) {
      setBatchError(timingError);
      return;
    }
    setSavingBatches(true);
    try {
      await api.put(`/trainers/${id}`, { batches: stateToBatches(batchState) });
      toast.push('Batch timing updated');
      load();
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not update batch timing', 'error');
    } finally {
      setSavingBatches(false);
    }
  };

  const removeTrainer = async () => {
    if (removing) return;
    setRemoving(true);
    try {
      await api.delete(`/trainers/${id}`);
      toast.push('Trainer removed');
      setConfirmRemove(false);
      navigate('/owner/trainers');
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not remove trainer', 'error');
    } finally {
      setRemoving(false);
    }
  };

  const restoreTrainer = async () => {
    try {
      await api.put(`/trainers/${id}`, { status: 'active' });
      toast.push('Trainer restored');
      load();
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not restore trainer', 'error');
    }
  };

  if (!data) return <Skeleton rows={8} />;
  const trainer = data.item;
  const stats = data.stats || {};

  return (
    <div>
      <PageHeader
        title={trainer.name}
        subtitle={trainer.branchId?.name}
        actions={
          trainer.status === 'inactive' ? (
            <button
              type="button"
              onClick={restoreTrainer}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-700"
            >
              Restore trainer
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmRemove(true)}
              className="rounded-lg border border-red-100 bg-white px-4 py-2 text-sm text-red-600"
            >
              Remove trainer
            </button>
          )
        }
      />
      <div className="mb-6 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-2 lg:grid-cols-4">
        <div><p className="text-xs text-slate-500">Phone</p><p className="font-medium">{trainer.phone || '—'}</p></div>
        <div><p className="text-xs text-slate-500">Specialization</p><p className="font-medium">{trainer.specialization || '—'}</p></div>
        <div><p className="text-xs text-slate-500">Joining Date</p><p className="font-medium">{formatDate(trainer.joiningDate)}</p></div>
        <div><p className="text-xs text-slate-500">Status</p><p>{statusBadge(trainer.status)}</p></div>
        <div className="sm:col-span-2 lg:col-span-4">
          <p className="mb-2 text-xs text-slate-500">Batch timing</p>
          <BatchChips batches={trainer.batches} />
        </div>
      </div>
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <BatchTimingPicker
          value={batchState}
          onChange={(next) => {
            setBatchState(next);
            setBatchError('');
          }}
          error={batchError}
        />
        <button
          type="button"
          onClick={saveBatches}
          disabled={savingBatches}
          className="mt-4 rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
        >
          {savingBatches ? 'Saving...' : 'Save batch timing'}
        </button>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Admissions" value={stats.admissions} />
        <StatCard label="Assigned Members" value={stats.assignedMembers} />
        <StatCard label="Active Members" value={stats.activeMembers} />
        <StatCard label="Expiring Members" value={stats.expiringMembers} />
        <StatCard label="Expired Members" value={stats.expiredMembers} />
        <StatCard label="Attendance %" value={`${stats.attendancePercent || 0}%`} hint="Last 30 days" />
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold">Admission history</h2>
      <DataTable
        rows={data.admissionHistory}
        columns={[
          { key: 'name', header: 'Member' },
          { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.createdAt) },
          { key: 'assigned', header: 'Assigned Trainer', render: (r) => r.assignedTrainerId?.name || '—' },
        ]}
      />
      <h2 className="mb-3 mt-8 text-sm font-semibold">Attendance history</h2>
      <DataTable
        rows={data.attendanceHistory}
        columns={[
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
          { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name },
          {
            key: 'in',
            header: 'Check In',
            render: (r) => (
              <div className="min-w-[180px]">
                <div>{formatDateTime(r.checkInTime)}</div>
                <AttendanceLocation location={r.checkInLocation} compact />
              </div>
            ),
          },
          {
            key: 'out',
            header: 'Check Out',
            render: (r) => (
              <div className="min-w-[180px]">
                <div>{formatDateTime(r.checkOutTime)}</div>
                <AttendanceLocation location={r.checkOutLocation} compact />
              </div>
            ),
          },
          { key: 'hours', header: 'Working Hours', render: (r) => r.workingHours || '—' },
          { key: 'status', header: 'Status', render: (r) => statusBadge(r.status) },
          { key: 'photo', header: 'Photo', render: (r) => r.checkInPhoto ? <AuthImage src={r.checkInPhoto} className="h-10 w-10 rounded object-cover" /> : '—' },
        ]}
      />
      <ConfirmDialog
        open={confirmRemove}
        title="Remove trainer"
        message={`${trainer.name} will be removed. They cannot log in, and members assigned to them will be unassigned. You can restore them later.`}
        confirmLabel={removing ? 'Removing...' : 'Remove trainer'}
        danger
        onConfirm={removeTrainer}
        onClose={() => {
          if (!removing) setConfirmRemove(false);
        }}
      />
    </div>
  );
}
