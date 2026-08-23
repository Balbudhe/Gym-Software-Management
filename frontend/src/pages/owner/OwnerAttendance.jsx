import { useEffect, useState } from 'react';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import StatusBadge from '../../components/ui/StatusBadge';
import Pagination from '../../components/ui/Pagination';
import PhotoPreview from '../../components/attendance/PhotoPreview';
import EmptyState from '../../components/ui/EmptyState';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { formatDate, formatTime, errorMessage, toInputDate } from '../../lib/utils';

export default function OwnerAttendance() {
  const [trainers, setTrainers] = useState([]);
  const [filters, setFilters] = useState({ date: toInputDate(new Date()), trainerId: '', status: 'all', page: 1 });
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    api.get('/trainers/options').then((res) => setTrainers(res.data.trainers || []));
  }, []);

  useEffect(() => {
    setLoading(true);
    api.get('/trainer-attendance', { params: { ...filters, limit: 15 } })
      .then((res) => {
        setRows(res.data.attendance);
        setPagination(res.data.pagination);
        setError('');
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="space-y-5">
      <PageHeader title="Trainer attendance" subtitle="Review check-in photos, working hours, and punctuality." />
      <div className="grid gap-3 sm:grid-cols-3">
        <Input type="date" label="Date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value, page: 1 })} />
        <Select label="Trainer" value={filters.trainerId} onChange={(e) => setFilters({ ...filters, trainerId: e.target.value, page: 1 })}>
          <option value="">All trainers</option>
          {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </Select>
        <Select label="Status" value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}>
          <option value="all">All</option>
          <option value="present">Present</option>
          <option value="late">Late</option>
          <option value="absent">Absent</option>
        </Select>
      </div>
      <Card>
        {loading ? <TableSkeleton /> : error ? <p className="p-6 text-red-600">{error}</p> : !rows.length ? <EmptyState title="No attendance records" /> : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>{['Trainer', 'Date', 'Check in', 'Check out', 'Working hours', 'Photo', 'Status'].map((h) => <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row._id}>
                      <td className="px-4 py-3 font-medium">{row.trainerId?.name}</td>
                      <td className="px-4 py-3">{formatDate(row.date)}</td>
                      <td className="px-4 py-3">{formatTime(row.checkInTime)}</td>
                      <td className="px-4 py-3">{formatTime(row.checkOutTime)}</td>
                      <td className="px-4 py-3">{row.workingHours?.label || '—'}</td>
                      <td className="px-4 py-3">
                        {row.checkInPhoto ? <button className="font-semibold text-brand-700" onClick={() => setPhoto(row.checkInPhoto)}>View</button> : '—'}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination pagination={pagination} onPage={(page) => setFilters((f) => ({ ...f, page }))} />
          </>
        )}
      </Card>
      <PhotoPreview src={photo} onClose={() => setPhoto('')} />
    </div>
  );
}
