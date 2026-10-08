import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import CameraCapture from '../../components/attendance/CameraCapture';
import AttendanceLocation from '../../components/attendance/AttendanceLocation';
import DataTable from '../../components/tables/DataTable';
import BatchChips from '../../components/common/BatchChips';
import { statusBadge } from '../../components/common/Badge';
import { formatDate, formatDateTime } from '../../utils/format';
import AuthImage from '../../components/common/AuthImage';
import { formatBatchRange } from '../../utils/batches';
import { getCurrentPosition } from '../../utils/geolocation';
import { useTrainerShift } from '../../context/TrainerShiftContext';

export default function TrainerAttendancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const shift = useTrainerShift();
  const [today, setToday] = useState(null);
  const [history, setHistory] = useState([]);
  const [batches, setBatches] = useState([]);
  const [windowInfo, setWindowInfo] = useState(null);
  const [camera, setCamera] = useState(null);
  const [locationState, setLocationState] = useState({ status: 'idle' });

  const load = async () => {
    const [{ data: t }, { data: h }] = await Promise.all([
      api.get('/trainer-attendance/today'),
      api.get('/trainer-attendance', { params: { trainerId: user.trainerId, limit: 30 } }),
    ]);
    setToday(t.item);
    setBatches(t.batches || []);
    setWindowInfo(t.attendanceWindow || null);
    setHistory(h.items || []);
  };

  useEffect(() => {
    if (!user?.trainerId) return undefined;
    load();
    const timer = setInterval(load, 30000);
    return () => clearInterval(timer);
  }, [user]);

  const detectLocation = async () => {
    setLocationState({ status: 'loading' });
    try {
      const position = await getCurrentPosition();
      setLocationState({ status: 'ready', ...position });
      return position;
    } catch (error) {
      setLocationState({ status: 'error', message: error.message });
      throw error;
    }
  };

  const openCamera = (type) => {
    if (type === 'in' && !windowInfo?.canCheckIn) {
      toast.push(windowInfo?.allowedHoursLabel
        ? `Check-in is only allowed during ${windowInfo.allowedHoursLabel}`
        : 'Check-in is only allowed during your assigned batch time', 'error');
      return;
    }
    if (type === 'out' && !windowInfo?.canCheckOut) {
      toast.push(windowInfo?.allowedHoursLabel
        ? `Check-out is only allowed during ${windowInfo.allowedHoursLabel}`
        : 'Check-out is only allowed during your assigned batch time', 'error');
      return;
    }
    setLocationState({ status: 'loading' });
    setCamera(type);
    detectLocation().catch(() => {});
  };

  const submit = async (blob) => {
    let position = locationState.status === 'ready' ? locationState : null;
    if (!position) {
      position = await detectLocation();
    }
    const form = new FormData();
    form.append('photo', blob, 'capture.jpg');
    form.append('latitude', String(position.lat));
    form.append('longitude', String(position.lng));
    if (position.accuracy != null) form.append('accuracy', String(position.accuracy));
    try {
      if (camera === 'in') await api.post('/trainer-attendance/check-in', form);
      else await api.post('/trainer-attendance/check-out', form);
      toast.push(camera === 'in' ? 'Checked in' : 'Checked out');
      setLocationState({ status: 'idle' });
      await load();
      await shift?.refresh?.();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Attendance failed';
      toast.push(message, 'error');
      throw new Error(message);
    }
  };

  const locationHelper = locationState.status === 'loading'
    ? 'Detecting your current location...'
    : locationState.status === 'ready'
      ? `Location detected (${Number(locationState.lat).toFixed(5)}, ${Number(locationState.lng).toFixed(5)}). Confirm to save it with attendance.`
      : locationState.status === 'error'
        ? locationState.message
        : 'Your current location will be saved with this attendance.';

  const windowMessage = !windowInfo
    ? 'Loading batch hours...'
    : !windowInfo.hasBatches
      ? 'The owner has not assigned batch hours yet. Check-in and check-out stay locked until then.'
      : windowInfo.withinWindow
        ? `You are in your ${formatBatchRange(windowInfo.activeBatch)} window.`
        : `Check-in and check-out are only allowed during ${windowInfo.allowedHoursLabel}.`;

  return (
    <div>
      <PageHeader title="Attendance" subtitle={`Branch: ${user.branchName || 'Assigned branch'}`} />
      <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5">
        <p className="text-sm text-slate-500">Today</p>
        <p className="mt-1 text-lg font-semibold">{today ? statusBadge(today.status) : 'Not checked in'}</p>
        <p className="mt-2 text-sm text-slate-500">
          In: {today?.checkInLabel || formatDateTime(today?.checkInTime)} · Out:{' '}
          {today?.checkOutLabel || formatDateTime(today?.checkOutTime)}
        </p>
        {today?.checkInLocation || today?.checkOutLocation || today?.lastKnownLocation ? (
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs text-slate-500">Check-in location</p>
              <AttendanceLocation location={today.checkInLocation} />
            </div>
            <div>
              <p className="mb-1 text-xs text-slate-500">Check-out location</p>
              <AttendanceLocation location={today.checkOutLocation} />
            </div>
            {today.checkInTime && !today.checkOutTime ? (
              <div className="sm:col-span-2">
                <p className="mb-1 text-xs text-slate-500">Live location</p>
                <AttendanceLocation location={today.lastKnownLocation || today.checkInLocation} />
                <p className="mt-1 text-xs text-slate-500">
                  Location stays on until check-out. Logout is locked during this shift.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
          <div className="mb-2 flex items-center gap-2 text-sm font-medium text-slate-800">
            <Clock size={15} />
            Assigned batch hours
          </div>
          <BatchChips batches={batches} empty="No batch hours assigned" />
          <p className={`mt-2 text-xs ${windowInfo?.withinWindow ? 'text-emerald-700' : 'text-amber-700'}`}>
            {windowMessage}
          </p>
        </div>
        {today?.checkInPhoto || today?.checkOutPhoto ? (
          <div className="mt-3 flex gap-3">
            {today.checkInPhoto ? (
              <div>
                <p className="mb-1 text-xs text-slate-500">Check-in photo</p>
                <AuthImage src={today.checkInPhoto} alt="Check in" className="h-16 w-16 rounded-lg object-cover" />
              </div>
            ) : null}
            {today.checkOutPhoto ? (
              <div>
                <p className="mb-1 text-xs text-slate-500">Check-out photo</p>
                <AuthImage src={today.checkOutPhoto} alt="Check out" className="h-16 w-16 rounded-lg object-cover" />
              </div>
            ) : null}
          </div>
        ) : null}
        <div className="mt-4 flex gap-2">
          <button
            type="button"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white"
            onClick={() => openCamera('in')}
            disabled={!!today?.checkInTime || !windowInfo?.canCheckIn}
          >
            Check in
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm"
            onClick={() => openCamera('out')}
            disabled={!today?.checkInTime || !!today?.checkOutTime || !windowInfo?.canCheckOut}
          >
            Check out
          </button>
        </div>
      </div>
      <DataTable
        rows={history}
        columns={[
          { key: 'date', header: 'Date', render: (r) => formatDate(r.date) },
          {
            key: 'in',
            header: 'Check In',
            render: (r) => (
              <div>
                <div>{r.checkInLabel || formatDateTime(r.checkInTime)}</div>
                <AttendanceLocation location={r.checkInLocation} compact />
              </div>
            ),
          },
          {
            key: 'out',
            header: 'Check Out',
            render: (r) => (
              <div>
                <div>{r.checkOutLabel || formatDateTime(r.checkOutTime)}</div>
                <AttendanceLocation location={r.checkOutLocation} compact />
              </div>
            ),
          },
          { key: 'hours', header: 'Working Hours', render: (r) => r.workingHours || '—' },
          { key: 'status', header: 'Status', render: (r) => statusBadge(r.status) },
          {
            key: 'photo',
            header: 'Photo',
            render: (r) =>
              r.checkInPhoto || r.checkOutPhoto ? (
                <div className="flex items-center gap-2">
                  {r.checkInPhoto ? (
                    <AuthImage src={r.checkInPhoto} alt="Check in" className="h-10 w-10 rounded object-cover" />
                  ) : null}
                  {r.checkOutPhoto ? (
                    <AuthImage src={r.checkOutPhoto} alt="Check out" className="h-10 w-10 rounded object-cover" />
                  ) : null}
                </div>
              ) : (
                '—'
              ),
          },
        ]}
      />
      <CameraCapture
        open={!!camera}
        title={camera === 'in' ? 'Check in photo' : 'Check out photo'}
        helper={locationHelper}
        confirmDisabled={locationState.status === 'loading'}
        confirmLabel={locationState.status === 'error' ? 'Retry location & confirm' : 'Confirm'}
        onClose={() => {
          setCamera(null);
          setLocationState({ status: 'idle' });
        }}
        onCapture={submit}
      />
    </div>
  );
}
