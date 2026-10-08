import { useEffect, useState } from 'react';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import PageHeader from '../../components/common/PageHeader';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import Pagination from '../../components/common/Pagination';
import FilterBar, { FilterField } from '../../components/filters/FilterBar';
import Badge, { statusBadge } from '../../components/common/Badge';
import AuthImage from '../../components/common/AuthImage';
import Modal from '../../components/common/Modal';
import { formatDateTime } from '../../utils/format';
import AttendanceLocation from '../../components/attendance/AttendanceLocation';

export default function TrainerAttendance() {
  const { selectedBranch } = useBranch();
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [trainers, setTrainers] = useState([]);
  const [page, setPage] = useState(1);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [filters, setFilters] = useState({
    trainerId: '',
    date: new Date().toISOString().slice(0, 10),
    status: '',
  });

  useEffect(() => {
    api.get('/trainers', { params: { limit: 100 } }).then(({ data }) => setTrainers(data.items || []));
  }, [selectedBranch]);

  useEffect(() => {
    const load = async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const { data } = await api.get('/trainer-attendance', {
          params: { ...filters, includeAbsent: true, page },
        });
        setRows(data.items || []);
        setPagination(data.pagination);
      } finally {
        if (!silent) setLoading(false);
      }
    };
    load();
    const timer = setInterval(() => load(true), 30000);
    return () => clearInterval(timer);
  }, [selectedBranch, filters, page]);

  return (
    <div>
      <PageHeader title="Trainer Attendance" subtitle="All-branch mode lists every trainer for the selected day" />
      <FilterBar>
        <FilterField label="Trainer">
          <select value={filters.trainerId} onChange={(e) => setFilters({ ...filters, trainerId: e.target.value })}>
            <option value="">All</option>
            {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </select>
        </FilterField>
        <FilterField label="Date">
          <input type="date" value={filters.date} onChange={(e) => setFilters({ ...filters, date: e.target.value })} />
        </FilterField>
        <FilterField label="Status">
          <select value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
            <option value="">All</option>
            <option value="present">Present</option>
            <option value="late">Late</option>
            <option value="absent">Absent</option>
          </select>
        </FilterField>
      </FilterBar>
      {loading ? <Skeleton /> : (
        <>
          <DataTable
            rows={rows}
            columns={[
              { key: 'branch', header: 'Branch', render: (r) => r.branchId?.name },
              { key: 'trainer', header: 'Trainer', render: (r) => r.trainerId?.name },
              {
                key: 'in',
                header: 'Check In',
                render: (r) => (
                  <div className="min-w-[180px]">
                    <div>{r.checkInLabel || formatDateTime(r.checkInTime)}</div>
                    <AttendanceLocation location={r.checkInLocation} compact />
                  </div>
                ),
              },
              {
                key: 'out',
                header: 'Check Out',
                render: (r) => (
                  <div className="min-w-[180px]">
                    <div>{r.checkOutLabel || (r.checkOutTime ? formatDateTime(r.checkOutTime) : '—')}</div>
                    <AttendanceLocation location={r.checkOutLocation} compact />
                  </div>
                ),
              },
              {
                key: 'live',
                header: 'Live location',
                render: (r) => (
                  <div className="min-w-[180px]">
                    {r.checkInTime && !r.checkOutTime && r.outsideGym ? (
                      <div className="mb-1"><Badge tone="amber">Left check-in area</Badge></div>
                    ) : null}
                    <AttendanceLocation location={r.lastKnownLocation || r.checkInLocation} compact />
                  </div>
                ),
              },
              { key: 'hours', header: 'Working Hours', render: (r) => r.workingHours || '—' },
              {
                key: 'photo',
                header: 'Photo',
                render: (r) =>
                  r.checkInPhoto || r.checkOutPhoto ? (
                    <div className="flex items-center gap-2">
                      {r.checkInPhoto ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto({ src: r.checkInPhoto, alt: 'Check in photo' })}
                          className="overflow-hidden rounded border border-slate-200 bg-white p-0"
                        >
                          <AuthImage src={r.checkInPhoto} alt="Check in" className="h-10 w-10 rounded object-cover" />
                        </button>
                      ) : null}
                      {r.checkOutPhoto ? (
                        <button
                          type="button"
                          onClick={() => setSelectedPhoto({ src: r.checkOutPhoto, alt: 'Check out photo' })}
                          className="overflow-hidden rounded border border-slate-200 bg-white p-0"
                        >
                          <AuthImage src={r.checkOutPhoto} alt="Check out" className="h-10 w-10 rounded object-cover" />
                        </button>
                      ) : null}
                    </div>
                  ) : (
                    '—'
                  ),
              },
              { key: 'status', header: 'Status', render: (r) => statusBadge(r.status) },
            ]}
          />
          <Modal open={!!selectedPhoto} title={selectedPhoto?.alt || 'Attendance photo'} onClose={() => setSelectedPhoto(null)} wide>
            {selectedPhoto ? (
              <div className="flex items-center justify-center">
                <AuthImage src={selectedPhoto.src} alt={selectedPhoto.alt} className="max-h-[70vh] max-w-full rounded-xl object-contain" />
              </div>
            ) : null}
          </Modal>
          <Pagination pagination={pagination} onPage={setPage} />
        </>
      )}
    </div>
  );
}
