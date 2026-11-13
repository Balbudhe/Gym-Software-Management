import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import PageHeader from '../../components/common/PageHeader';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';
import Badge from '../../components/common/Badge';
import MobileCard, { MobileCardHeader, MobileCardMeta } from '../../components/mobile/MobileCard';

const titles = {
  members: ['Member Report', '/reports/members'],
  admissions: ['Admission Report', '/reports/admissions'],
  trainers: ['Trainer Report', '/reports/trainers'],
  attendance: ['Trainer Attendance Report', '/reports/attendance'],
};

export default function Reports() {
  const { selectedBranch } = useBranch();
  const location = useLocation();
  const kind = location.pathname.split('/').pop();
  const [title, endpoint] = titles[kind] || titles.members;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(endpoint);
        setRows(data.items || []);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [endpoint, selectedBranch]);

  const columns = {
    members: [
      { key: 'branch', header: 'Branch' },
      { key: 'totalMembers', header: 'Total Members' },
      { key: 'active', header: 'Active' },
      { key: 'expiring', header: 'Expiring' },
      { key: 'expired', header: 'Expired' },
    ],
    admissions: [
      { key: 'branch', header: 'Branch' },
      { key: 'trainer', header: 'Trainer' },
      { key: 'admissions', header: 'Admissions' },
    ],
    trainers: [
      { key: 'branch', header: 'Branch' },
      { key: 'trainer', header: 'Trainer' },
      { key: 'admissions', header: 'Admissions' },
      { key: 'assigned', header: 'Assigned' },
      { key: 'active', header: 'Active' },
    ],
    attendance: [
      { key: 'branch', header: 'Branch' },
      { key: 'trainer', header: 'Trainer' },
      { key: 'present', header: 'Present' },
      { key: 'absent', header: 'Absent' },
      { key: 'holidays', header: 'Holidays' },
      { key: 'late', header: 'Late' },
      { key: 'attendancePercent', header: 'Attendance %', render: (r) => `${r.attendancePercent}%` },
      { key: 'workingHours', header: 'Working Hours' },
    ],
  };

  const reportMobileRender = (r) => {
    if (kind === 'admissions') {
      return (
        <MobileCard>
          <MobileCardHeader title={r.trainer || '—'} subtitle={r.branch} />
          <MobileCardMeta items={[{ label: 'Admissions', value: r.admissions }]} />
        </MobileCard>
      );
    }
    if (kind === 'trainers') {
      return (
        <MobileCard>
          <MobileCardHeader title={r.trainer || '—'} subtitle={r.branch} />
          <MobileCardMeta
            items={[
              { label: 'Admissions', value: r.admissions },
              { label: 'Assigned', value: r.assigned },
              { label: 'Active', value: r.active },
            ]}
          />
        </MobileCard>
      );
    }
    if (kind === 'attendance') {
      return (
        <MobileCard>
          <MobileCardHeader
            title={r.trainer || '—'}
            subtitle={r.branch}
            meta={<Badge tone="blue">{r.attendancePercent}%</Badge>}
          />
          <MobileCardMeta
            items={[
              { label: 'Present', value: r.present },
              { label: 'Absent', value: r.absent },
              { label: 'Late', value: r.late },
              { label: 'Working hrs', value: r.workingHours },
            ]}
          />
        </MobileCard>
      );
    }
    return (
      <MobileCard>
        <MobileCardHeader title={r.branch || '—'} />
        <MobileCardMeta
          items={[
            { label: 'Total', value: r.totalMembers },
            { label: 'Active', value: r.active },
            { label: 'Expiring', value: r.expiring },
            { label: 'Expired', value: r.expired },
          ]}
        />
      </MobileCard>
    );
  };

  return (
    <div>
      <PageHeader title={title} subtitle="Respects the global branch selector" />
      {loading ? (
        <Skeleton />
      ) : (
        <DataTable rows={rows} columns={columns[kind] || columns.members} mobileRender={reportMobileRender} />
      )}
    </div>
  );
}
