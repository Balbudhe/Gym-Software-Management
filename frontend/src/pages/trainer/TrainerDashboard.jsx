import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Users, UserPlus, Clock, UserX, Camera } from 'lucide-react';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import StatCard from '../../components/ui/StatCard';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatDate, formatTime, errorMessage } from '../../lib/utils';
import { CardsSkeleton } from '../../components/ui/Skeleton';

export default function TrainerDashboard() {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard/trainer')
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, []);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <CardsSkeleton />;

  const s = data.stats;
  const att = data.attendance;
  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainer dashboard"
        subtitle="Your admissions, assigned members, and today's attendance."
        actions={
          <>
            <Link to="/admissions/new"><Button><UserPlus size={16} /> New admission</Button></Link>
            <Link to="/attendance"><Button variant="secondary"><Camera size={16} /> Mark attendance</Button></Link>
            <Link to="/my-members"><Button variant="secondary">My members</Button></Link>
          </>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="My admissions" value={s.myAdmissions} icon={UserPlus} />
        <StatCard label="My active members" value={s.myActiveMembers} icon={Users} />
        <StatCard label="Expiring members" value={s.expiringMembers} icon={Clock} />
        <StatCard label="Expired members" value={s.expiredMembers} icon={UserX} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Today's attendance" />
          <div className="space-y-3 p-5">
            {att?.checkInTime ? (
              <>
                <p className="text-sm">Check in: <strong>{formatTime(att.checkInTime)}</strong></p>
                <p className="text-sm">Check out: <strong>{formatTime(att.checkOutTime)}</strong></p>
                <StatusBadge status={att.status} />
              </>
            ) : (
              <p className="text-sm text-slate-500">You have not checked in yet.</p>
            )}
            <Link to="/attendance"><Button className="mt-2">Go to attendance</Button></Link>
          </div>
        </Card>
        <Card>
          <CardHeader title="Expiring assigned members" />
          <div className="divide-y divide-slate-100">
            {data.expiring.length === 0 && <p className="p-5 text-sm text-slate-500">No memberships expiring soon.</p>}
            {data.expiring.map((m) => (
              <div key={m._id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-semibold">{m.name}</p>
                  <p className="text-xs text-slate-500">Expires {formatDate(m.expiryDate)}</p>
                </div>
                <StatusBadge status="expiring" />
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
