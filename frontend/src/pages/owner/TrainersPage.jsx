import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import Pagination from '../../components/ui/Pagination';
import { TableSkeleton } from '../../components/ui/Skeleton';
import EmptyState from '../../components/ui/EmptyState';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../lib/utils';
import { useDebounce } from '../../hooks/useDebounce';

export default function TrainersPage() {
  const toast = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [target, setTarget] = useState(null);
  const debounced = useDebounce(search);

  async function load() {
    setLoading(true);
    try {
      const { data } = await api.get('/trainers', { params: { search: debounced, status, page, limit: 10 } });
      setRows(data.trainers);
      setPagination(data.pagination);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [debounced, status, page]);

  async function toggleStatus() {
    await api.patch(`/trainers/${target._id}/status`, { status: target.status === 'active' ? 'inactive' : 'active' });
    toast.success('Trainer status updated');
    setTarget(null);
    load();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Trainers" subtitle="Manage trainer accounts, assignments, and attendance performance." actions={<Link to="/trainers/new"><Button>Add trainer</Button></Link>} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Input placeholder="Search trainers" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
        <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
      </div>
      <Card>
        {loading ? <TableSkeleton /> : !rows.length ? <EmptyState title="No trainers yet" action={<Link to="/trainers/new"><Button>Add trainer</Button></Link>} /> : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    {['Trainer', 'Phone', 'Specialization', 'Admissions', 'Assigned members', 'Attendance', 'Status', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((t) => (
                    <tr key={t._id}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={t.name} src={t.profilePhoto} />
                          <div>
                            <p className="font-semibold">{t.name}</p>
                            <p className="text-xs text-slate-500">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">{t.phone}</td>
                      <td className="px-4 py-3">{t.specialization || '—'}</td>
                      <td className="px-4 py-3">{t.stats?.totalAdmissions ?? 0}</td>
                      <td className="px-4 py-3">{t.stats?.assignedMembers ?? 0}</td>
                      <td className="px-4 py-3">{t.stats?.attendance?.percentage ?? 0}%</td>
                      <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link to={`/trainers/${t._id}`} className="font-semibold text-brand-700">View</Link>
                          <Link to={`/trainers/${t._id}/edit`} className="font-semibold text-slate-600">Edit</Link>
                          <button className="font-semibold text-red-600" onClick={() => setTarget(t)}>
                            {t.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPage={setPage} />
          </>
        )}
      </Card>
      <ConfirmDialog
        open={!!target}
        title={target?.status === 'active' ? 'Deactivate trainer' : 'Activate trainer'}
        message="Deactivating a trainer prevents new assignments. Existing admissions and member assignments stay unchanged."
        confirmLabel="Confirm"
        danger={target?.status === 'active'}
        onClose={() => setTarget(null)}
        onConfirm={toggleStatus}
      />
    </div>
  );
}
