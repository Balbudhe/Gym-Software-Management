import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserCheck, Clock, UserX, Dumbbell, Camera, UserPlus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import { CardsSkeleton } from '../../components/ui/Skeleton';
import { formatDate, formatTime, errorMessage } from '../../lib/utils';
import Avatar from '../../components/ui/Avatar';
import PhotoPreview from '../../components/attendance/PhotoPreview';

const COLORS = ['#0f766e', '#d97706', '#dc2626'];

export default function OwnerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    api.get('/dashboard/owner')
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <CardsSkeleton count={7} />;

  const s = data.stats;
  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" subtitle="A live snapshot of your gym operations." />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total members" value={s.totalMembers} icon={Users} />
        <StatCard label="Active members" value={s.activeMembers} icon={UserCheck} />
        <StatCard label="Expiring soon" value={s.expiringSoon} icon={Clock} />
        <StatCard label="Expired members" value={s.expiredMembers} icon={UserX} />
        <StatCard label="Total trainers" value={s.totalTrainers} icon={Dumbbell} />
        <StatCard label="Trainers present today" value={s.trainersPresentToday} icon={Camera} />
        <StatCard label="New admissions today" value={s.newAdmissionsToday} icon={UserPlus} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title="Member growth" subtitle="Admissions over the last 6 months" />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.charts.memberGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="members" stroke="#0f766e" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title="Membership status" />
          <div className="h-64 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data.charts.membershipStatus} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {data.charts.membershipStatus.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Admissions by trainer" />
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.charts.admissionsByTrainer}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="name" />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="value" fill="#0f766e" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <CardHeader title="Recent admissions" action={<Link to="/admissions" className="text-sm font-semibold text-brand-700">View all</Link>} />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {['Member', 'Added by', 'Assigned trainer', 'Membership', 'Joining date', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.recentAdmissions.map((m) => (
                <tr key={m._id}>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">{m.createdByTrainerId?.name || '—'}</td>
                  <td className="px-4 py-3">{m.assignedTrainerId?.name || '—'}</td>
                  <td className="px-4 py-3">{m.membershipId?.membershipPlanId?.name || '—'}</td>
                  <td className="px-4 py-3">{formatDate(m.joiningDate)}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card>
          <CardHeader title="Trainer attendance today" action={<Link to="/trainers/attendance" className="text-sm font-semibold text-brand-700">View all</Link>} />
          <div className="divide-y divide-slate-100">
            {data.attendanceToday.map((row) => (
              <div key={row._id} className="flex items-center gap-3 px-5 py-3">
                <Avatar name={row.trainerId?.name} src={row.trainerId?.profilePhoto} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{row.trainerId?.name}</p>
                  <p className="text-xs text-slate-500">{formatTime(row.checkInTime)} — {formatTime(row.checkOutTime)}</p>
                </div>
                {row.checkInPhoto && (
                  <button className="text-xs font-semibold text-brand-700" onClick={() => setPhoto(row.checkInPhoto)}>Photo</button>
                )}
                <StatusBadge status={row.status} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Expiring memberships" action={<Link to="/members/expiring" className="text-sm font-semibold text-brand-700">View all</Link>} />
          <div className="divide-y divide-slate-100">
            {data.expiring.map((m) => (
              <div key={m._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold">{m.name}</p>
                  <p className="text-xs text-slate-500">{m.daysRemaining} days remaining</p>
                </div>
                <StatusBadge status="expiring" />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader title="Recently expired" action={<Link to="/members/expired" className="text-sm font-semibold text-brand-700">View all</Link>} />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                {['Member', 'Expiry', 'Days expired', 'Assigned trainer'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.expired.map((m) => (
                <tr key={m._id}>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">{formatDate(m.expiryDate)}</td>
                  <td className="px-4 py-3">{m.daysExpired}</td>
                  <td className="px-4 py-3">{m.assignedTrainerId?.name || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <PhotoPreview src={photo} onClose={() => setPhoto('')} />
    </div>
  );
}
