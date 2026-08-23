import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatusBadge from '../../components/ui/StatusBadge';
import Avatar from '../../components/ui/Avatar';
import { TableSkeleton } from '../../components/ui/Skeleton';
import { errorMessage } from '../../lib/utils';

export default function TrainerPerformance() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/trainers/performance')
      .then((res) => setRows(res.data.trainers))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <PageHeader title="Trainer performance" subtitle="Admissions, assigned members, and attendance at a glance." />
      <Card>
        {loading ? <TableSkeleton /> : error ? <p className="p-6 text-red-600">{error}</p> : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {['Trainer', 'Admissions', 'This month', 'Assigned', 'Active', 'Expiring', 'Expired', 'Attendance', 'Today'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((t) => (
                  <tr key={t._id}>
                    <td className="px-4 py-3">
                      <Link to={`/trainers/${t._id}`} className="flex items-center gap-3 font-semibold text-slate-900">
                        <Avatar name={t.name} src={t.profilePhoto} size="sm" />
                        {t.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{t.stats.totalAdmissions}</td>
                    <td className="px-4 py-3">{t.stats.monthAdmissions}</td>
                    <td className="px-4 py-3">{t.stats.assignedMembers}</td>
                    <td className="px-4 py-3">{t.stats.activeMembers}</td>
                    <td className="px-4 py-3">{t.stats.expiringMembers}</td>
                    <td className="px-4 py-3">{t.stats.expiredMembers}</td>
                    <td className="px-4 py-3">{t.stats.attendance.percentage}%</td>
                    <td className="px-4 py-3"><StatusBadge status={t.todayStatus} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
