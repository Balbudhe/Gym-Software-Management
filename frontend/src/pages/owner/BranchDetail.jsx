import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import { statusBadge } from '../../components/common/Badge';
import { formatDate, formatDateTime } from '../../utils/format';
import AttendanceLocation from '../../components/attendance/AttendanceLocation';

export default function BranchDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get(`/branches/${id}/overview`).then(({ data: d }) => setData(d));
  }, [id]);

  if (!data) return <Skeleton rows={8} />;
  const item = data.item;
  const counts = item.counts || {};

  return (
    <div>
      <PageHeader title={item.name} subtitle={`${item.city || ''} ${item.branchCode || ''}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Total Members" value={counts.members} />
        <StatCard label="Active Members" value={counts.activeMembers} />
        <StatCard label="Expiring" value={counts.expiringMembers} />
        <StatCard label="Expired" value={counts.expiredMembers} />
        <StatCard label="Total Trainers" value={counts.trainers} />
        <StatCard label="Present Today" value={counts.presentToday} />
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold">Membership status</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Active" value={data.membershipStatus?.active} />
        <StatCard label="Expiring" value={data.membershipStatus?.expiring} />
        <StatCard label="Expired" value={data.membershipStatus?.expired} />
      </div>
      <h2 className="mb-3 mt-8 text-sm font-semibold">Recent admissions</h2>
      <DataTable
        rows={data.recentAdmissions}
        columns={[
          { key: 'name', header: 'Member' },
          { key: 'added', header: 'Added By', render: (r) => r.createdByTrainerId?.name || 'Owner' },
          { key: 'date', header: 'Date', render: (r) => formatDate(r.createdAt) },
        ]}
      />
      <h2 className="mb-3 mt-8 text-sm font-semibold">Trainer attendance today</h2>
      <DataTable
        rows={data.attendance}
        columns={[
          { key: 'trainer', header: 'Trainer', render: (r) => r.trainerId?.name },
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
          { key: 'status', header: 'Status', render: (r) => statusBadge(r.status) },
        ]}
      />
    </div>
  );
}
