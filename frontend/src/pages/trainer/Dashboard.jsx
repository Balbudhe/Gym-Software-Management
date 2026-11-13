import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarCheck2, UserPlus, Users } from 'lucide-react';
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
    <div className="mx-auto max-w-5xl">
      <PageHeader
        title="Home"
        subtitle={`${user.name} · ${user.branchName || 'Assigned branch'}`}
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2">
        <Link
          to="/trainer/admissions/new"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white"
        >
          <UserPlus size={18} />
          New admission
        </Link>
        <Link
          to="/trainer/attendance"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800"
        >
          <CalendarCheck2 size={18} />
          Attendance
        </Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="My admissions" value={mine.myAdmissions} />
        <StatCard label="My members" value={mine.myMembers} />
        <StatCard label="Expiring soon" value={mine.myExpiring} />
        <StatCard label="Expired" value={mine.myExpired} />
        <StatCard
          label="Today's attendance"
          value={mine.todayAttendance ? statusBadge(mine.todayAttendance.status) : 'Not checked in'}
        />
      </div>

      <Link
        to="/trainer/members"
        className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
      >
        <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-800">
          <Users size={16} />
          View my members
        </span>
        <span className="text-xs font-medium text-brand-700">Open</span>
      </Link>
    </div>
  );
}
