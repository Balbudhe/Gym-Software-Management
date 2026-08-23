import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Avatar from '../../components/ui/Avatar';
import StatusBadge from '../../components/ui/StatusBadge';
import Button from '../../components/ui/Button';
import PhotoPreview from '../../components/attendance/PhotoPreview';
import { PageSpinner } from '../../components/ui/Spinner';
import { formatDate, formatTime, errorMessage } from '../../lib/utils';

export default function TrainerDetail() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState('');

  useEffect(() => {
    api.get(`/trainers/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <PageSpinner />;
  const t = data.trainer;
  const s = t.stats || {};

  return (
    <div className="space-y-6">
      <PageHeader title={t.name} subtitle={t.specialization || 'Trainer profile'} actions={<Link to={`/trainers/${id}/edit`}><Button>Edit</Button></Link>} />
      <Card className="flex items-center gap-4 p-5">
        <Avatar name={t.name} src={t.profilePhoto} size="lg" />
        <div>
          <p className="font-semibold">{t.name}</p>
          <p className="text-sm text-slate-500">{t.email} · {t.phone}</p>
          <p className="text-sm text-slate-500">Joined {formatDate(t.joiningDate)} · {t.experience || 0} yrs experience</p>
          <div className="mt-2"><StatusBadge status={t.status} /></div>
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total admissions" value={s.totalAdmissions} />
        <StatCard label="Active members" value={s.activeMembers} />
        <StatCard label="Expiring" value={s.expiringMembers} />
        <StatCard label="Expired" value={s.expiredMembers} />
        <StatCard label="Attendance" value={`${s.attendance?.percentage || 0}%`} />
      </div>
      <Card>
        <CardHeader title="Admission history" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{['Date', 'Member', 'Membership', 'Assigned trainer', 'Status'].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.admissions.map((m) => (
                <tr key={m._id}>
                  <td className="px-4 py-3">{formatDate(m.createdAt)}</td>
                  <td className="px-4 py-3 font-medium">{m.name}</td>
                  <td className="px-4 py-3">{m.membershipId?.membershipPlanId?.name || '—'}</td>
                  <td className="px-4 py-3">{m.assignedTrainerId?.name || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={m.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <Card>
        <CardHeader title="Attendance history" />
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>{['Date', 'Check in', 'Check out', 'Working hours', 'Status', 'Photo'].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.attendance.map((row) => (
                <tr key={row._id}>
                  <td className="px-4 py-3">{formatDate(row.date)}</td>
                  <td className="px-4 py-3">{formatTime(row.checkInTime)}</td>
                  <td className="px-4 py-3">{formatTime(row.checkOutTime)}</td>
                  <td className="px-4 py-3">{row.workingHours?.label || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.status} /></td>
                  <td className="px-4 py-3">
                    {row.checkInPhoto ? <button className="font-semibold text-brand-700" onClick={() => setPhoto(row.checkInPhoto)}>View</button> : '—'}
                  </td>
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
