import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import StatCard from '../../components/ui/StatCard';
import Select from '../../components/ui/Select';
import { errorMessage } from '../../lib/utils';

const titles = {
  members: 'Member report',
  admissions: 'Admission report',
  trainers: 'Trainer report',
  attendance: 'Attendance report',
};

export default function ReportsPage() {
  const { type } = useParams();
  const [data, setData] = useState(null);
  const [trainers, setTrainers] = useState([]);
  const [trainerId, setTrainerId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/trainers/options').then((res) => setTrainers(res.data.trainers || []));
  }, []);

  useEffect(() => {
    setData(null);
    const params = type === 'admissions' && trainerId ? { trainerId } : {};
    api.get(`/reports/${type}`, { params })
      .then((res) => setData(res.data.report))
      .catch((err) => setError(errorMessage(err)));
  }, [type, trainerId]);

  return (
    <div className="space-y-5">
      <PageHeader title={titles[type] || 'Report'} subtitle="Operational reporting scoped to your gym." />
      {type === 'admissions' && (
        <Select label="Trainer" value={trainerId} onChange={(e) => setTrainerId(e.target.value)}>
          <option value="">All trainers</option>
          {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </Select>
      )}
      {error && <p className="text-red-600">{error}</p>}
      {type === 'members' && data && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total members" value={data.totalMembers} />
          <StatCard label="Active" value={data.active} />
          <StatCard label="Expiring" value={data.expiring} />
          <StatCard label="Expired" value={data.expired} />
          <StatCard label="New today" value={data.newAdmissions.today} />
          <StatCard label="New this week" value={data.newAdmissions.week} />
          <StatCard label="New this month" value={data.newAdmissions.month} />
        </div>
      )}
      {Array.isArray(data) && (
        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  {type === 'trainers' && ['Trainer', 'Admissions', 'Assigned members', 'Present', 'Absent', 'Late', 'Attendance %'].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                  {type === 'admissions' && ['Trainer', 'Total admissions', 'This week', 'This month'].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                  {type === 'attendance' && ['Trainer', 'Present', 'Absent', 'Late', 'Attendance %', 'Total hours'].map((h) => <th key={h} className="px-4 py-3 text-left">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {type === 'trainers' && data.map((row) => (
                  <tr key={row.trainerId}>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.admissions}</td>
                    <td className="px-4 py-3">{row.assignedMembers}</td>
                    <td className="px-4 py-3">{row.present}</td>
                    <td className="px-4 py-3">{row.absent}</td>
                    <td className="px-4 py-3">{row.late}</td>
                    <td className="px-4 py-3">{row.attendancePercentage}%</td>
                  </tr>
                ))}
                {type === 'admissions' && data.map((row) => (
                  <tr key={row.trainerId}>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.totalAdmissions}</td>
                    <td className="px-4 py-3">{row.thisWeek}</td>
                    <td className="px-4 py-3">{row.thisMonth}</td>
                  </tr>
                ))}
                {type === 'attendance' && data.map((row) => (
                  <tr key={row.trainerId}>
                    <td className="px-4 py-3 font-medium">{row.name}</td>
                    <td className="px-4 py-3">{row.present}</td>
                    <td className="px-4 py-3">{row.absent}</td>
                    <td className="px-4 py-3">{row.late}</td>
                    <td className="px-4 py-3">{row.attendancePercentage}%</td>
                    <td className="px-4 py-3">{row.totalHours}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
