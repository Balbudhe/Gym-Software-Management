import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../../services/api';
import { useBranch } from '../../context/BranchContext';
import PageHeader from '../../components/common/PageHeader';
import Skeleton from '../../components/common/Skeleton';
import DataTable from '../../components/tables/DataTable';

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
      { key: 'late', header: 'Late' },
      { key: 'attendancePercent', header: 'Attendance %', render: (r) => `${r.attendancePercent}%` },
      { key: 'workingHours', header: 'Working Hours' },
    ],
  };

  return (
    <div>
      <PageHeader title={title} subtitle="Respects the global branch selector" />
      {loading ? <Skeleton /> : <DataTable rows={rows} columns={columns[kind] || columns.members} />}
    </div>
  );
}
