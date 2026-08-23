import { useEffect, useState } from 'react';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import StatusBadge from '../../components/ui/StatusBadge';
import Modal from '../../components/ui/Modal';
import CameraCapture from '../../components/attendance/CameraCapture';
import { formatTime, errorMessage } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export default function TrainerAttendancePage() {
  const toast = useToast();
  const [record, setRecord] = useState(null);
  const [mode, setMode] = useState(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const { data } = await api.get('/trainer-attendance/today/me');
    setRecord(data.attendance);
  }
  useEffect(() => { load(); }, []);

  async function submit(file, endpoint) {
    setBusy(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      await api.post(`/trainer-attendance/${endpoint}`, form);
      toast.success(endpoint === 'check-in' ? 'Checked in' : 'Checked out');
      setMode(null);
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Attendance" subtitle="Capture a live photo to check in or check out." />
      <Card>
        <CardHeader title="Today" />
        <div className="space-y-4 p-5">
          {record?.checkInTime ? (
            <>
              <p className="text-sm">Check in: <strong>{formatTime(record.checkInTime)}</strong></p>
              <p className="text-sm">Check out: <strong>{formatTime(record.checkOutTime)}</strong></p>
              <StatusBadge status={record.status} />
            </>
          ) : (
            <p className="text-sm text-slate-500">You have not checked in today.</p>
          )}
          <div className="flex gap-2">
            <Button disabled={!!record?.checkInTime} onClick={() => setMode('check-in')}>Check in</Button>
            <Button variant="secondary" disabled={!record?.checkInTime || !!record?.checkOutTime} onClick={() => setMode('check-out')}>Check out</Button>
          </div>
        </div>
      </Card>
      <Modal open={!!mode} title={mode === 'check-in' ? 'Check in' : 'Check out'} onClose={() => setMode(null)}>
        <CameraCapture
          title={mode === 'check-in' ? 'Capture check-in photo' : 'Capture check-out photo'}
          onCancel={() => setMode(null)}
          onCapture={(file) => !busy && submit(file, mode)}
        />
      </Modal>
    </div>
  );
}
