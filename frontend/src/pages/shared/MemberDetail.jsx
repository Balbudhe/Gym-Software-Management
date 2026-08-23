import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import Button from '../../components/ui/Button';
import { formatDate, errorMessage } from '../../lib/utils';
import { PageSpinner } from '../../components/ui/Spinner';
import { useAuth } from '../../context/AuthContext';

export default function MemberDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/members/${id}`)
      .then((res) => setData(res.data))
      .catch((err) => setError(errorMessage(err)));
  }, [id]);

  if (error) return <p className="text-red-600">{error}</p>;
  if (!data) return <PageSpinner />;
  const m = data.member;

  return (
    <div className="space-y-6">
      <PageHeader
        title={m.name}
        subtitle={m.memberCode}
        actions={user?.role === 'OWNER' ? <Link to={`/members/${id}/edit`}><Button>Edit member</Button></Link> : null}
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-4">
            <Avatar name={m.name} src={m.profilePhoto} size="lg" />
            <div>
              <p className="font-semibold">{m.name}</p>
              <p className="text-sm text-slate-500">{m.phone}</p>
              <div className="mt-2"><StatusBadge status={m.status} /></div>
            </div>
          </div>
          <dl className="mt-6 space-y-2 text-sm">
            <Row label="Email" value={m.email || '—'} />
            <Row label="Gender" value={m.gender || '—'} />
            <Row label="Address" value={m.address || '—'} />
            <Row label="Emergency" value={m.emergencyContact || '—'} />
            <Row label="Added by" value={m.createdByTrainerId?.name || '—'} />
            <Row label="Assigned trainer" value={m.assignedTrainerId?.name || '—'} />
            <Row label="Joining" value={formatDate(m.joiningDate)} />
            <Row label="Expiry" value={formatDate(m.expiryDate)} />
            <Row label="Height" value={m.height ? `${m.height} cm` : '—'} />
            <Row label="Weight" value={m.weight ? `${m.weight} kg` : '—'} />
            <Row label="Goal" value={m.fitnessGoal || '—'} />
            <Row label="Remarks" value={m.remarks || '—'} />
          </dl>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title="Membership history" />
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {['Plan', 'Start', 'Expiry', 'Added by', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.memberships.map((ms) => (
                  <tr key={ms._id}>
                    <td className="px-4 py-3">{ms.membershipPlanId?.name}</td>
                    <td className="px-4 py-3">{formatDate(ms.startDate)}</td>
                    <td className="px-4 py-3">{formatDate(ms.expiryDate)}</td>
                    <td className="px-4 py-3">{ms.createdByTrainerId?.name || '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={ms.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500">{label}</dt>
      <dd className="text-right font-medium text-slate-800">{value}</dd>
    </div>
  );
}
