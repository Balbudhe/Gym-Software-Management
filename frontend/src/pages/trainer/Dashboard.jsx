import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import PageHeader from '../../components/common/PageHeader';
import StatCard from '../../components/common/StatCard';
import Skeleton from '../../components/common/Skeleton';
import { statusBadge } from '../../components/common/Badge';

export default function TrainerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);

  useEffect(() => {
    api.get('/reports/dashboard').then(({ data: d }) => setData(d));
  }, []);

  if (!data) return <Skeleton rows={6} />;
  const mine = data.myStats || {};

  return (
    <div>
      <PageHeader title="Dashboard" subtitle={`${user.name} · Branch: ${user.branchName || 'Assigned branch'}`} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="My Admissions" value={mine.myAdmissions} />
        <StatCard label="My Members" value={mine.myMembers} />
        <StatCard label="Expiring" value={mine.myExpiring} />
        <StatCard label="Expired" value={mine.myExpired} />
        <StatCard label="Today's Attendance" value={mine.todayAttendance ? statusBadge(mine.todayAttendance.status) : 'Not checked in'} />
      </div>
      <div className="mt-6 flex gap-3">
        <Link to="/trainer/admissions/new" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">New admission</Link>
        <Link to="/trainer/attendance" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm">Attendance</Link>
      </div>
    </div>
  );
}
