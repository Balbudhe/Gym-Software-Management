import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  Navigation,
  RefreshCw,
  Timer,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useTrainerShift } from '../../context/TrainerShiftContext';
import CameraCapture from '../../components/attendance/CameraCapture';
import Skeleton from '../../components/common/Skeleton';
import Badge, { statusBadge } from '../../components/common/Badge';
import AuthImage from '../../components/common/AuthImage';
import { cn } from '../../utils/format';
import { dateToHhmm, formatBatchRange, formatTime12 } from '../../utils/batches';
import { getPrecisePosition } from '../../utils/geolocation';
import { haptic } from '../../utils/haptics';

const IST = 'Asia/Kolkata';

const isPresent = (status) => status === 'present' || status === 'late';

const ymdIst = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: IST,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(date));

const addDaysYmd = (ymd, days) => {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const weekdayOf = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();
const mondayOf = (ymd) => addDaysYmd(ymd, -((weekdayOf(ymd) + 6) % 7));

const firstWeekOfMonth = (monthKey) => {
  const first = `${monthKey}-01`;
  const thursday = addDaysYmd(first, (4 - weekdayOf(first) + 7) % 7);
  return addDaysYmd(thursday, -3);
};

const shiftMonth = (monthKey, delta) => {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
};

const weekMeta = (weekStart) => {
  const thursday = addDaysYmd(weekStart, 3);
  return { monthKey: thursday.slice(0, 7), number: Math.ceil(Number(thursday.slice(8)) / 7) };
};

const labelFor = (ymd, options) =>
  new Date(`${ymd}T00:00:00+05:30`).toLocaleDateString('en-GB', { timeZone: IST, ...options });

const monthLabel = (monthKey) => labelFor(`${monthKey}-01`, { month: 'long', year: 'numeric' });

const formatDuration = (totalMinutes) => {
  const minutes = Math.max(0, Math.floor(totalMinutes || 0));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (!h) return `${m}m`;
  return m ? `${h}h ${m}m` : `${h}h`;
};

const formatClock = (totalSeconds) => {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
  const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
  const s = String(seconds % 60).padStart(2, '0');
  return `${h}:${m}:${s}`;
};

const nextBatchToday = (batches = []) => {
  const now = dateToHhmm();
  return (
    [...(batches || [])]
      .filter((b) => b.startTime > now)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] || null
  );
};

const requiredForBatch = (batch) => {
  if (!batch?.startTime || !batch?.endTime) return 0;
  const [sh, sm] = batch.startTime.split(':').map(Number);
  const [eh, em] = batch.endTime.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm) - 60);
};

function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

function LiveClock() {
  const now = useNow();
  return (
    <span className="tabular-nums">
      {new Date(now).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: IST,
      })}
    </span>
  );
}

function LiveShiftMeter({ checkInTime, requiredMinutes }) {
  const now = useNow();
  const elapsedSeconds = (now - new Date(checkInTime).getTime()) / 1000;
  const requiredSeconds = (requiredMinutes || 0) * 60;
  const percent = requiredSeconds ? Math.min(100, (elapsedSeconds / requiredSeconds) * 100) : 100;
  const complete = elapsedSeconds >= requiredSeconds;

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-white/60">On shift</span>
        <span className="font-semibold tabular-nums text-white">
          {formatClock(elapsedSeconds)}
          {requiredMinutes ? (
            <span className="font-normal text-white/50"> / {formatDuration(requiredMinutes)}</span>
          ) : null}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={cn('h-full rounded-full transition-all', complete ? 'bg-emerald-400' : 'bg-amber-400')}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={cn('mt-2 text-xs', complete ? 'text-emerald-300' : 'text-white/60')}>
        {complete
          ? 'Required hours done. You can check out now.'
          : `${formatDuration((requiredSeconds - elapsedSeconds) / 60)} left for Present.`}
      </p>
    </div>
  );
}

function PunchCell({ time, photo, location, alt }) {
  if (!time) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-2.5">
      {photo ? (
        <AuthImage
          src={photo}
          alt={alt}
          className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
        />
      ) : null}
      <div className="min-w-0">
        <p className="whitespace-nowrap font-medium text-slate-900">{time}</p>
        {location?.lat != null ? (
          <a
            href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-700"
          >
            <MapPin size={11} />
            GPS
          </a>
        ) : null}
      </div>
    </div>
  );
}

function MobilePunchCard({
  type,
  state,
  time,
  hint,
  note,
  actionLabel,
  onAction,
  locationHint,
}) {
  const isIn = type === 'in';
  const ready = state === 'ready';
  const done = state === 'done';

  return (
    <div
      className={cn(
        'rounded-3xl border p-4 shadow-sm',
        ready
          ? isIn
            ? 'border-emerald-200 bg-gradient-to-br from-emerald-50 to-white'
            : 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-white'
          : 'border-slate-200 bg-white'
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-md',
            ready || done
              ? isIn
                ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
                : 'bg-gradient-to-br from-indigo-500 to-violet-600'
              : 'bg-slate-300'
          )}
        >
          {isIn ? <LogIn size={20} /> : <LogOut size={20} />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">
              {isIn ? 'Check in' : 'Check out'}
            </p>
            {done ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <CheckCircle2 size={11} />
                Done
              </span>
            ) : ready ? (
              <span className="rounded-full bg-slate-900 px-2 py-0.5 text-[10px] font-semibold text-white">
                Open now
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500">
                <Lock size={10} />
                {state === 'waiting' ? 'Later' : state === 'holiday' ? 'Holiday' : 'Locked'}
              </span>
            )}
          </div>
          <p className={cn('mt-1 text-3xl font-semibold tabular-nums tracking-tight', done ? 'text-slate-900' : 'text-slate-300')}>
            {time || '--:--'}
          </p>
          <p className="mt-1 text-sm text-slate-500">{note || hint}</p>
        </div>
      </div>

      {ready ? (
        <button
          type="button"
          onClick={onAction}
          className={cn(
            'mt-4 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-semibold text-white shadow-lg active:scale-[0.99]',
            isIn
              ? 'bg-gradient-to-r from-emerald-500 to-teal-600 shadow-emerald-600/25'
              : 'bg-gradient-to-r from-indigo-500 to-violet-600 shadow-indigo-600/25'
          )}
        >
          <Camera size={18} />
          {actionLabel}
        </button>
      ) : null}

      {ready && locationHint ? (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Navigation size={12} />
          {locationHint}
        </p>
      ) : null}
    </div>
  );
}

const remarkFor = (record) => {
  if (record.status === 'holiday') return 'Sunday';
  if (record.status === 'in_progress') {
    return record.requiredLabel ? `On shift · needs ${record.requiredLabel}` : 'On shift';
  }
  if (record.status === 'absent') {
    if (record.absentReason === 'short_hours') {
      return record.workedLabel && record.requiredLabel
        ? `Left early · ${record.workedLabel} of ${record.requiredLabel}`
        : 'Left before required hours';
    }
    if (record.absentReason === 'no_check_out') return 'No check-out';
    return 'No check-in';
  }
  if (record.lateCheckIn || record.status === 'late') return 'Late check-in';
  return null;
};

function StatusCell({ row }) {
  if (row.kind === 'upcoming') return <Badge tone="slate">Upcoming</Badge>;
  if (row.kind === 'pending') return <Badge tone="amber">Not checked in</Badge>;
  if (row.kind === 'none') return <span className="text-slate-400">—</span>;
  return statusBadge(row.status);
}

export default function TrainerAttendancePage() {
  const { user } = useAuth();
  const toast = useToast();
  const shift = useTrainerShift();
  const todayYmd = ymdIst();
  const currentWeekStart = mondayOf(todayYmd);

  const [loading, setLoading] = useState(true);
  const [todayData, setTodayData] = useState(null);
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const [weekRecords, setWeekRecords] = useState([]);
  const [weekLoading, setWeekLoading] = useState(false);
  const [camera, setCamera] = useState(null);
  const [locationState, setLocationState] = useState({ status: 'idle' });

  const today = todayData?.item || null;
  const batches = todayData?.batches || [];
  const windowInfo = todayData?.attendanceWindow || null;

  const loadToday = useCallback(async () => {
    try {
      const { data } = await api.get('/trainer-attendance/today');
      setTodayData(data);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWeek = useCallback(async () => {
    if (!user?.trainerId) return;
    setWeekLoading(true);
    try {
      const { data } = await api.get('/trainer-attendance', {
        params: { trainerId: user.trainerId, from: weekStart, to: addDaysYmd(weekStart, 6), limit: 10 },
      });
      setWeekRecords(data.items || []);
    } finally {
      setWeekLoading(false);
    }
  }, [user?.trainerId, weekStart]);

  useEffect(() => {
    if (!user?.trainerId) return undefined;
    loadToday();
    const timer = setInterval(loadToday, 30000);
    return () => clearInterval(timer);
  }, [user?.trainerId, loadToday]);

  useEffect(() => {
    loadWeek();
  }, [loadWeek]);

  useEffect(() => {
    const onRefresh = () => {
      loadToday();
      loadWeek();
    };
    window.addEventListener('app:refresh', onRefresh);
    return () => window.removeEventListener('app:refresh', onRefresh);
  }, [loadToday, loadWeek]);

  const refreshAll = async () => {
    await Promise.all([loadToday(), loadWeek()]);
  };

  const detectLocation = async () => {
    setLocationState({ status: 'loading' });
    try {
      const position = await getPrecisePosition();
      setLocationState({ status: 'ready', ...position });
      return position;
    } catch (error) {
      setLocationState({ status: 'error', message: error.message });
      throw error;
    }
  };

  const openCamera = (type) => {
    if (type === 'in' && !windowInfo?.canCheckIn) {
      toast.push(
        windowInfo?.allowedHoursLabel
          ? `Check-in is only allowed during ${windowInfo.allowedHoursLabel}`
          : 'Check-in is only allowed during your assigned batch time',
        'error'
      );
      return;
    }
    if (type === 'out' && !today?.checkInTime) {
      toast.push('Check in first', 'error');
      return;
    }
    if (type === 'out' && today?.checkOutTime) {
      toast.push('Already checked out today', 'error');
      return;
    }
    haptic(10);
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
      setWeekStart(currentWeekStart);
      await refreshAll();
      await shift?.refresh?.();
    } catch (error) {
      const message = error.response?.data?.message || error.message || 'Attendance failed';
      toast.push(message, 'error');
      throw new Error(message);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl">
        <Skeleton rows={8} />
      </div>
    );
  }

  const checkedIn = !!today?.checkInTime;
  const checkedOut = !!today?.checkOutTime;
  const onShift = checkedIn && !checkedOut;
  const requiredMinutes = today?.requiredMinutes ?? windowInfo?.requiredMinutes ?? null;
  const upcoming = nextBatchToday(batches);

  let title;
  let message;
  if (checkedOut) {
    title = isPresent(today.status) ? 'You are marked present today' : 'Today is marked absent';
    message =
      today.workedLabel && today.requiredLabel
        ? `You worked ${today.workedLabel} of the ${today.requiredLabel} required.`
        : `Checked in at ${today.checkInLabel || '—'}, checked out at ${today.checkOutLabel || '—'}.`;
  } else if (onShift) {
    title = `Checked in at ${today.checkInLabel}`;
    message = 'Stay within 200m and check out before you leave.';
  } else if (windowInfo?.isHoliday) {
    title = 'Sunday holiday';
    message = 'No check-in needed today.';
  } else if (!windowInfo?.hasBatches) {
    title = 'No batch hours assigned';
    message = 'Ask the owner to assign your batch timings.';
  } else if (windowInfo?.canCheckIn) {
    title = 'Ready to check in';
    message = `${formatBatchRange(windowInfo.activeBatch)} is live. Take a selfie to check in.`;
  } else {
    title = upcoming ? `Check-in opens at ${formatTime12(upcoming.startTime)}` : 'No more batches today';
    message = upcoming
      ? `Your next batch is ${formatBatchRange(upcoming)}.`
      : 'Check-in is closed for today.';
  }

  const requiredLabel = today?.requiredLabel || windowInfo?.requiredLabel || null;

  const checkInState = checkedIn
    ? 'done'
    : windowInfo?.isHoliday
      ? 'holiday'
      : !windowInfo?.hasBatches
        ? 'locked'
        : windowInfo?.canCheckIn
          ? 'ready'
          : upcoming
            ? 'waiting'
            : 'closed';

  const checkInHint = {
    holiday: 'Sunday holiday',
    locked: 'Batch hours not assigned yet',
    ready: `${formatBatchRange(windowInfo?.activeBatch)} is live`,
    waiting: upcoming ? `Opens at ${formatTime12(upcoming.startTime)}` : '',
    closed: 'Closed for today',
  }[checkInState];

  const checkOutState = checkedOut ? 'done' : onShift ? 'ready' : windowInfo?.isHoliday ? 'holiday' : 'locked';
  const checkOutHint = {
    holiday: 'Enjoy your day off',
    locked: 'Available after check-in',
    ready: requiredLabel ? `Stay ${requiredLabel} to be marked present` : 'Check out any time',
  }[checkOutState];

  const createdYmd = todayData?.trainerCreatedAt ? ymdIst(todayData.trainerCreatedAt) : null;
  const joiningYmd = todayData?.trainerJoiningDate ? ymdIst(todayData.trainerJoiningDate) : null;
  const beforeTracking = (ymd) =>
    (createdYmd && ymd <= createdYmd) || (joiningYmd && ymd < joiningYmd);

  const recordsByDay = Object.fromEntries(weekRecords.map((r) => [ymdIst(r.date), r]));
  const weekRows = Array.from({ length: 7 }, (_, index) => {
    const ymd = addDaysYmd(weekStart, index);
    const record = recordsByDay[ymd];
    const sunday = weekdayOf(ymd) === 0;
    const base = { ymd, sunday, isToday: ymd === todayYmd, record };
    if (record) return { ...base, kind: 'record', status: record.status, remark: remarkFor(record) };
    if (sunday) return { ...base, kind: 'record', status: 'holiday', remark: 'Sunday' };
    if (ymd > todayYmd) return { ...base, kind: 'upcoming' };
    if (ymd === todayYmd) return { ...base, kind: 'pending' };
    if (beforeTracking(ymd)) return { ...base, kind: 'none', remark: 'Before joining' };
    return { ...base, kind: 'record', status: 'absent', remark: 'No check-in' };
  });

  const { monthKey, number: weekNumber } = weekMeta(weekStart);
  const currentMonthKey = weekMeta(currentWeekStart).monthKey;
  const isRunningWeek = weekStart === currentWeekStart;
  const weekEnd = addDaysYmd(weekStart, 6);
  const weekRangeLabel = `${labelFor(weekStart, { weekday: 'short', day: 'numeric', month: 'short' })} – ${labelFor(
    weekEnd,
    { weekday: 'short', day: 'numeric', month: 'short' }
  )}`;

  const goToMonth = (delta) => {
    const target = shiftMonth(monthKey, delta);
    setWeekStart(target === currentMonthKey ? currentWeekStart : firstWeekOfMonth(target));
  };

  const batchPolicy = batches.length
    ? batches.map((b) => `${formatBatchRange(b)} (min ${formatDuration(requiredForBatch(b))})`).join(', ')
    : 'No batch hours assigned';

  const locationHelper =
    locationState.status === 'loading'
      ? 'Getting GPS… keep location on and wait near a window.'
      : locationState.status === 'ready'
        ? `GPS ready (±${Math.round(locationState.accuracy || 0)}m). Confirm to save.`
        : locationState.status === 'error'
          ? locationState.message
          : 'Your GPS location will be saved with this selfie.';

  const locationHint =
    locationState.status === 'loading'
      ? 'Preparing GPS…'
      : 'Camera + GPS required';

  const navButton =
    'inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 disabled:opacity-40';

  return (
    <div className="mx-auto max-w-6xl space-y-4 sm:space-y-6">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-5 text-white shadow-lg sm:rounded-3xl sm:p-8">
        <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/15 blur-2xl" />
        <p className="text-xs text-white/55 sm:text-sm">
          {labelFor(todayYmd, { weekday: 'long', day: 'numeric', month: 'long' })} · <LiveClock />
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
        <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">{message}</p>
        {onShift ? <LiveShiftMeter checkInTime={today.checkInTime} requiredMinutes={requiredMinutes} /> : null}
        {batches.length ? (
          <p className="mt-4 flex flex-wrap items-center gap-2 text-xs text-white/50">
            <Clock size={13} />
            {batches.map(formatBatchRange).join(' · ')}
          </p>
        ) : null}
      </section>

      {/* Mobile check-in / check-out */}
      <section className="space-y-3 lg:hidden">
        <div className="flex items-center justify-between gap-2 px-0.5">
          <h2 className="text-base font-semibold text-slate-900">Today&apos;s attendance</h2>
          <span className="text-xs font-medium text-slate-500">
            {checkedOut ? 'Complete' : checkedIn ? 'Step 2/2' : 'Step 1/2'}
          </span>
        </div>

        <MobilePunchCard
          type="in"
          state={checkInState}
          time={today?.checkInLabel}
          hint={checkInHint}
          note={
            checkedIn ? (
              today?.lateCheckIn ? (
                <span className="font-medium text-amber-700">Late check-in</span>
              ) : (
                <span className="font-medium text-emerald-700">Checked in</span>
              )
            ) : null
          }
          actionLabel="Open camera & check in"
          onAction={() => openCamera('in')}
          locationHint={locationHint}
        />

        {onShift ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
            <Timer size={14} />
            Shift running · check out when you leave
          </div>
        ) : null}

        <MobilePunchCard
          type="out"
          state={checkOutState}
          time={today?.checkOutLabel}
          hint={checkOutHint}
          note={
            checkedOut ? (
              <span className={cn('font-medium', isPresent(today.status) ? 'text-emerald-700' : 'text-rose-600')}>
                {isPresent(today.status) ? 'Present' : 'Absent'}
                {today.workedLabel && today.requiredLabel
                  ? ` · ${today.workedLabel} of ${today.requiredLabel}`
                  : ''}
              </span>
            ) : null
          }
          actionLabel="Open camera & check out"
          onAction={() => openCamera('out')}
          locationHint={locationHint}
        />
      </section>

      {/* Desktop check-in / check-out */}
      <section className="relative hidden overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:block">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-slate-900">Today&apos;s check-in & check-out</h2>
          {today ? statusBadge(today.status) : null}
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          <MobilePunchCard
            type="in"
            state={checkInState}
            time={today?.checkInLabel}
            hint={checkInHint}
            note={checkedIn ? (today?.lateCheckIn ? 'Late check-in' : 'Checked in') : null}
            actionLabel="Check in with camera"
            onAction={() => openCamera('in')}
          />
          <MobilePunchCard
            type="out"
            state={checkOutState}
            time={today?.checkOutLabel}
            hint={checkOutHint}
            note={
              checkedOut
                ? `${isPresent(today.status) ? 'Present' : 'Absent'}${
                    today.workedLabel && today.requiredLabel
                      ? ` · ${today.workedLabel} of ${today.requiredLabel}`
                      : ''
                  }`
                : null
            }
            actionLabel="Check out with camera"
            onAction={() => openCamera('out')}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm sm:rounded-2xl">
        <div className="space-y-3 border-b border-slate-100 px-4 py-4 sm:px-5 sm:py-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <CalendarDays size={18} className="text-brand-600" />
              Weekly attendance
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">Policy: {batchPolicy}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={navButton} onClick={() => setWeekStart(addDaysYmd(weekStart, -7))}>
              <ChevronLeft size={15} />
              Prev
            </button>
            <span className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-medium text-slate-700 sm:text-sm">
              W{weekNumber} · {weekRangeLabel}
            </span>
            <button
              type="button"
              className={navButton}
              onClick={() => setWeekStart(addDaysYmd(weekStart, 7))}
              disabled={weekStart >= currentWeekStart}
            >
              Next
              <ChevronRight size={15} />
            </button>
            {!isRunningWeek ? (
              <button
                type="button"
                onClick={() => setWeekStart(currentWeekStart)}
                className="text-xs font-medium text-brand-700"
              >
                This week
              </button>
            ) : null}
            <button type="button" className={navButton} onClick={refreshAll} disabled={weekLoading}>
              <RefreshCw size={14} className={weekLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={navButton} onClick={() => goToMonth(-1)}>
              Prev month
            </button>
            <span className="px-2 text-sm font-medium text-slate-700">{monthLabel(monthKey)}</span>
            <button
              type="button"
              className={navButton}
              onClick={() => goToMonth(1)}
              disabled={monthKey >= currentMonthKey}
            >
              Next month
            </button>
          </div>
        </div>

        {/* Mobile week cards */}
        <div className={cn('space-y-2 p-3 lg:hidden', weekLoading && 'opacity-60')}>
          {weekRows.map((row) => {
            const r = row.record;
            const hours = r
              ? r.status === 'in_progress'
                ? 'On shift'
                : r.workedLabel || r.workingHours || '—'
              : '—';
            return (
              <div
                key={row.ymd}
                className={cn(
                  'rounded-2xl border border-slate-100 bg-slate-50/70 p-3',
                  row.isToday && 'border-emerald-200 bg-emerald-50/50'
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {labelFor(row.ymd, { weekday: 'short', day: 'numeric', month: 'short' })}
                      {row.isToday ? (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                          Today
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{row.remark || '—'}</p>
                  </div>
                  <StatusCell row={row} />
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <p className="text-slate-400">In</p>
                    <p className="font-medium text-slate-800">{r?.checkInLabel || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Out</p>
                    <p className="font-medium text-slate-800">{r?.checkOutLabel || '—'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Hours</p>
                    <p className="font-medium text-slate-800">{hours}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-semibold text-slate-500">
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Day</th>
                <th className="px-5 py-3">Check In</th>
                <th className="px-5 py-3">Check Out</th>
                <th className="px-5 py-3">Hours</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Remarks</th>
              </tr>
            </thead>
            <tbody className={cn('divide-y divide-slate-100', weekLoading && 'opacity-60')}>
              {weekRows.map((row) => {
                const r = row.record;
                const hours = r
                  ? r.status === 'in_progress'
                    ? 'On shift'
                    : r.workedLabel || r.workingHours || '—'
                  : '—';
                return (
                  <tr key={row.ymd} className={cn(row.isToday && 'bg-emerald-50/40')}>
                    <td className="whitespace-nowrap px-5 py-3.5 font-medium text-slate-900">
                      {labelFor(row.ymd, { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className={cn('px-5 py-3.5', row.sunday ? 'text-slate-400' : 'text-slate-600')}>
                      {labelFor(row.ymd, { weekday: 'long' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <PunchCell
                        time={r?.checkInLabel}
                        photo={r?.checkInPhoto}
                        location={r?.checkInLocation}
                        alt="Check-in selfie"
                      />
                    </td>
                    <td className="px-5 py-3.5">
                      <PunchCell
                        time={r?.checkOutLabel}
                        photo={r?.checkOutPhoto}
                        location={r?.checkOutLocation}
                        alt="Check-out selfie"
                      />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3.5 text-slate-700">{hours}</td>
                    <td className="px-5 py-3.5">
                      <StatusCell row={row} />
                    </td>
                    <td className={cn('px-5 py-3.5 text-xs', row.status === 'absent' ? 'text-rose-600' : 'text-slate-500')}>
                      {row.remark || '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <CameraCapture
        open={!!camera}
        title={camera === 'in' ? 'Check-in selfie' : 'Check-out selfie'}
        helper={locationHelper}
        confirmDisabled={locationState.status === 'loading'}
        confirmLabel={
          locationState.status === 'error'
            ? 'Retry GPS & save'
            : camera === 'in'
              ? 'Confirm & save check-in'
              : 'Confirm & save check-out'
        }
        onClose={() => {
          setCamera(null);
          setLocationState({ status: 'idle' });
        }}
        onCapture={submit}
      />
    </div>
  );
}
