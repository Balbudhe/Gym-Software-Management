import { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Camera,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Hourglass,
  Lock,
  LogIn,
  LogOut,
  MapPin,
  RefreshCw,
  Timer,
} from 'lucide-react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import CameraCapture from '../../components/attendance/CameraCapture';
import Skeleton from '../../components/common/Skeleton';
import Badge, { statusBadge } from '../../components/common/Badge';
import AuthImage from '../../components/common/AuthImage';
import { cn } from '../../utils/format';
import { dateToHhmm, formatBatchRange, formatTime12 } from '../../utils/batches';
import { getPrecisePosition } from '../../utils/geolocation';
import { useTrainerShift } from '../../context/TrainerShiftContext';

const IST = 'Asia/Kolkata';

const isPresent = (status) => status === 'present' || status === 'late';

const ymdIst = (date = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: IST, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    new Date(date)
  );

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
  return [...(batches || [])]
    .filter((b) => b.startTime > now)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))[0] || null;
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
      {new Date(now).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: IST })}
    </span>
  );
}

function ShiftProgress({ checkInTime, requiredMinutes }) {
  const now = useNow();
  const elapsedSeconds = (now - new Date(checkInTime).getTime()) / 1000;
  const requiredSeconds = (requiredMinutes || 0) * 60;
  const percent = requiredSeconds ? Math.min(100, (elapsedSeconds / requiredSeconds) * 100) : 100;
  const complete = elapsedSeconds >= requiredSeconds;

  return (
    <div className="mt-6 max-w-md">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-white/60">Worked</span>
        <span className="font-semibold tabular-nums text-white">
          {formatClock(elapsedSeconds)}
          {requiredMinutes ? <span className="font-normal text-white/50"> / {formatDuration(requiredMinutes)}</span> : null}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-700 ${complete ? 'bg-emerald-400' : 'bg-amber-400'}`}
          style={{ width: `${percent}%` }}
        />
      </div>
      <p className={`mt-2 text-xs ${complete ? 'text-emerald-300' : 'text-white/60'}`}>
        {complete
          ? 'Required hours done. You can check out now.'
          : `${formatDuration((requiredSeconds - elapsedSeconds) / 60)} left. Checking out earlier marks today absent.`}
      </p>
    </div>
  );
}

function PunchCell({ time, photo, location, alt }) {
  if (!time) return <span className="text-slate-400">—</span>;
  return (
    <div className="flex items-center gap-2.5">
      {photo ? (
        <AuthImage src={photo} alt={alt} className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-slate-200" />
      ) : null}
      <div className="min-w-0">
        <p className="whitespace-nowrap font-medium text-slate-900">{time}</p>
        {location?.lat != null ? (
          <a
            href={`https://maps.google.com/?q=${location.lat},${location.lng}`}
            target="_blank"
            rel="noreferrer"
            title={location.address || `${location.lat}, ${location.lng}`}
            className="inline-flex items-center gap-1 text-xs text-brand-700 hover:underline"
          >
            <MapPin size={11} />
            View GPS
          </a>
        ) : null}
      </div>
    </div>
  );
}

const PUNCH_THEMES = {
  in: {
    Icon: LogIn,
    title: 'Check in',
    border: 'from-emerald-300 via-emerald-100 to-white',
    glow: 'bg-emerald-400/20',
    accent: 'text-emerald-600',
    iconBg: 'from-emerald-400 to-emerald-600 shadow-emerald-500/40',
    button: 'from-emerald-500 via-emerald-600 to-teal-600 shadow-emerald-600/30',
  },
  out: {
    Icon: LogOut,
    title: 'Check out',
    border: 'from-indigo-300 via-violet-100 to-white',
    glow: 'bg-indigo-400/20',
    accent: 'text-indigo-600',
    iconBg: 'from-indigo-400 to-violet-600 shadow-indigo-500/40',
    button: 'from-indigo-500 via-violet-600 to-fuchsia-600 shadow-indigo-600/30',
  },
};

const splitTime = (label) => {
  if (!label) return { main: '--:--', suffix: '' };
  const match = String(label).match(/^(.*?)\s*([ap]\.?\s?m\.?)$/i);
  return match ? { main: match[1], suffix: match[2].replace(/\./g, '').toUpperCase() } : { main: label, suffix: '' };
};

const PUNCH_CHIPS = {
  done: { label: 'Completed', Icon: CheckCircle2, className: 'bg-emerald-100 text-emerald-700' },
  ready: { label: 'Open now', Icon: null, className: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/30' },
  waiting: { label: 'Opens later', Icon: Hourglass, className: 'bg-slate-100 text-slate-600' },
  closed: { label: 'Closed', Icon: Lock, className: 'bg-slate-100 text-slate-500' },
  locked: { label: 'Locked', Icon: Lock, className: 'bg-slate-100 text-slate-500' },
  holiday: { label: 'Holiday', Icon: Coffee, className: 'bg-sky-100 text-sky-700' },
};

function PunchCard({ type, state, time, hint, note, actionLabel, onAction, delay = 0 }) {
  const theme = PUNCH_THEMES[type];
  const chip = PUNCH_CHIPS[state];
  const ready = state === 'ready';
  const done = state === 'done';
  const active = ready || done;
  const { main, suffix } = splitTime(time);

  return (
    <div
      className={cn(
        'group relative rounded-2xl bg-gradient-to-br p-px shadow-[0_1px_2px_rgba(15,23,42,0.04),0_8px_24px_-12px_rgba(15,23,42,0.18)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-14px_rgba(15,23,42,0.28)] animate-fade-up',
        active ? theme.border : 'from-slate-200 via-slate-100 to-white'
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="relative flex h-full items-center gap-3.5 overflow-hidden rounded-[15px] bg-white/95 px-4 py-3.5 backdrop-blur">
        <div
          className={cn(
            'pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full blur-2xl transition-transform duration-700 group-hover:scale-125',
            active ? theme.glow : 'bg-slate-200/40'
          )}
        />

        <span
          className={cn(
            'relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105',
            active ? theme.iconBg : 'from-slate-300 to-slate-400 shadow-slate-400/30',
            ready && 'animate-soft-glow'
          )}
        >
          <theme.Icon size={18} />
        </span>

        <div className="relative min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">{theme.title}</p>
            {!ready ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold',
                  chip.className
                )}
              >
                {chip.Icon ? <chip.Icon size={10} /> : null}
                {chip.label}
              </span>
            ) : null}
          </div>
          <p className="flex items-baseline gap-1">
            <span
              className={cn(
                'text-2xl font-semibold tabular-nums tracking-tight',
                done ? 'text-slate-900' : 'text-slate-300'
              )}
            >
              {main}
            </span>
            {suffix ? (
              <span className={cn('text-xs font-semibold', done ? theme.accent : 'text-slate-300')}>{suffix}</span>
            ) : null}
          </p>
          <div className="truncate text-xs text-slate-500" title={typeof hint === 'string' ? hint : undefined}>
            {note || hint}
          </div>
        </div>

        {ready && onAction ? (
          <button
            type="button"
            onClick={onAction}
            className={cn(
              'group/btn relative inline-flex shrink-0 items-center gap-1.5 overflow-hidden rounded-xl bg-gradient-to-r px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition-all duration-300 hover:shadow-xl hover:brightness-110 active:scale-[0.97]',
              theme.button
            )}
          >
            <span className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[150%] skew-x-[-20deg] bg-white/25 transition-transform duration-700 ease-out group-hover/btn:translate-x-[350%]" />
            <Camera size={15} />
            {actionLabel}
            <ArrowRight size={14} className="transition-transform duration-300 group-hover/btn:translate-x-0.5" />
          </button>
        ) : done ? (
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <CheckCircle2 size={16} />
          </span>
        ) : null}
      </div>
    </div>
  );
}

const RING_SIZE = 64;
const RING_STROKE = 6;
const RING_RADIUS = (RING_SIZE - RING_STROKE) / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ percent, tone, children }) {
  const gradients = {
    amber: ['#fbbf24', '#f97316'],
    green: ['#34d399', '#059669'],
    rose: ['#fb7185', '#e11d48'],
    slate: ['#cbd5e1', '#94a3b8'],
  };
  const [from, to] = gradients[tone] || gradients.slate;
  const id = `ring-${tone}`;
  return (
    <div className="relative shrink-0" style={{ width: RING_SIZE, height: RING_SIZE }}>
      <svg width={RING_SIZE} height={RING_SIZE} className="-rotate-90">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={from} />
            <stop offset="100%" stopColor={to} />
          </linearGradient>
        </defs>
        <circle cx={RING_SIZE / 2} cy={RING_SIZE / 2} r={RING_RADIUS} fill="none" stroke="#f1f5f9" strokeWidth={RING_STROKE} />
        <circle
          cx={RING_SIZE / 2}
          cy={RING_SIZE / 2}
          r={RING_RADIUS}
          fill="none"
          stroke={`url(#${id})`}
          strokeWidth={RING_STROKE}
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={RING_CIRCUMFERENCE * (1 - Math.min(1, Math.max(0, percent)))}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center text-center">{children}</div>
    </div>
  );
}

function ConnectorBody({ ring, value, label, target }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2 shadow-[0_8px_24px_-12px_rgba(15,23,42,0.18)] backdrop-blur lg:flex-col lg:gap-1 lg:px-3 lg:py-2.5">
      {ring}
      <div className="text-left lg:text-center">
        <p className="text-sm font-semibold tabular-nums leading-tight text-slate-900">{value}</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">{label}</p>
        {target ? <p className="text-[10px] text-slate-500">Target {target}</p> : null}
      </div>
    </div>
  );
}

function LiveConnector({ since, requiredMinutes, requiredLabel }) {
  const now = useNow();
  const elapsedSeconds = (now - new Date(since).getTime()) / 1000;
  const percent = requiredMinutes ? elapsedSeconds / (requiredMinutes * 60) : 1;
  return (
    <ConnectorBody
      ring={
        <ProgressRing percent={percent} tone={percent >= 1 ? 'green' : 'amber'}>
          <span className="text-[11px] font-bold text-slate-700">{Math.min(100, Math.floor(percent * 100))}%</span>
        </ProgressRing>
      }
      value={formatClock(elapsedSeconds)}
      label="On shift"
      target={requiredLabel}
    />
  );
}

function ShiftConnector({ today, requiredMinutes, requiredLabel }) {
  const onShift = today?.checkInTime && !today?.checkOutTime;
  const done = today?.checkInTime && today?.checkOutTime;
  const donePercent = done && requiredMinutes ? (today.workedMinutes || 0) / requiredMinutes : done ? 1 : 0;

  return (
    <div className="flex items-center justify-center animate-fade-up" style={{ animationDelay: '80ms' }}>
      {onShift ? (
        <LiveConnector since={today.checkInTime} requiredMinutes={requiredMinutes} requiredLabel={requiredLabel} />
      ) : (
        <ConnectorBody
          ring={
            <ProgressRing percent={donePercent} tone={done ? (isPresent(today.status) ? 'green' : 'rose') : 'slate'}>
              <Timer size={14} className={done ? 'text-slate-500' : 'text-slate-300'} />
            </ProgressRing>
          }
          value={done ? today.workedLabel || today.workingHours : '--'}
          label="Worked"
          target={requiredLabel}
        />
      )}
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
      toast.push(windowInfo?.allowedHoursLabel
        ? `Check-in is only allowed during ${windowInfo.allowedHoursLabel}`
        : 'Check-in is only allowed during your assigned batch time', 'error');
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
    message = today.workedLabel && today.requiredLabel
      ? `You worked ${today.workedLabel} of the ${today.requiredLabel} required.`
      : `Checked in at ${today.checkInLabel || '—'}, checked out at ${today.checkOutLabel || '—'}.`;
  } else if (onShift) {
    title = `Checked in at ${today.checkInLabel}`;
    message = 'Remember to check out before you leave the gym.';
  } else if (windowInfo?.isHoliday) {
    title = 'Sunday holiday';
    message = 'No check-in needed today. Enjoy your day off.';
  } else if (!windowInfo?.hasBatches) {
    title = 'No batch hours assigned';
    message = 'Ask the owner to assign your batch timings. Check-in opens after that.';
  } else if (windowInfo?.canCheckIn) {
    title = 'Ready to check in';
    message = `${formatBatchRange(windowInfo.activeBatch)} is live now. Take a selfie to check in.`;
  } else {
    title = upcoming ? `Check-in opens at ${formatTime12(upcoming.startTime)}` : 'No more batches today';
    message = upcoming
      ? `Your next batch is ${formatBatchRange(upcoming)}.`
      : 'Check-in is closed for today. See you tomorrow.';
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
    ? batches
        .map((b) => `${formatBatchRange(b)} (min ${formatDuration(requiredForBatch(b))})`)
        .join(', ')
    : 'No batch hours assigned';

  const locationHelper = locationState.status === 'loading'
    ? 'Getting your GPS location. Keep the phone near a window or outdoors…'
    : locationState.status === 'ready'
      ? 'GPS location captured. Confirm to save.'
      : locationState.status === 'error'
        ? locationState.message
        : 'Your GPS location will be saved with this selfie.';

  const navButton =
    'inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-6 text-white shadow-lg sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-6">
          <div className="min-w-0 flex-1">
            <p className="text-sm text-white/60">
              {labelFor(todayYmd, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · <LiveClock />
            </p>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">{message}</p>

            {onShift ? (
              <ShiftProgress checkInTime={today.checkInTime} requiredMinutes={requiredMinutes} />
            ) : null}

            {batches.length ? (
              <p className="mt-5 flex flex-wrap items-center gap-2 text-xs text-white/50">
                <Clock size={13} />
                Your batch hours: {batches.map(formatBatchRange).join(' · ')}
              </p>
            ) : null}
          </div>
        </div>
      </section>

      <section className="relative overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-emerald-50/40 p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_16px_40px_-24px_rgba(15,23,42,0.2)] sm:p-5">
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'radial-gradient(rgba(148,163,184,0.35) 1px, transparent 1px)',
            backgroundSize: '16px 16px',
            maskImage: 'linear-gradient(to bottom, black, transparent 80%)',
            WebkitMaskImage: 'linear-gradient(to bottom, black, transparent 80%)',
          }}
        />
        <div className="pointer-events-none absolute -left-20 -top-20 h-48 w-48 rounded-full bg-emerald-300/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-48 w-48 rounded-full bg-indigo-300/20 blur-3xl" />

        <div className="relative mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-base font-semibold tracking-tight text-slate-900">Today's check-in & check-out</h2>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-100 bg-emerald-50/80 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
              <CalendarDays size={12} />
              {labelFor(todayYmd, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              <span className="text-emerald-300">·</span>
              <LiveClock />
            </span>
          </div>
          <div className="flex items-center gap-2.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur">
            <div className="flex items-center gap-1">
              {[checkedIn, checkedOut].map((stepDone, index) => (
                <span
                  key={index}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-700',
                    stepDone ? 'w-6 bg-gradient-to-r from-emerald-400 to-emerald-600' : 'w-3 bg-slate-200'
                  )}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold text-slate-700">
              {checkedOut ? 'Shift complete' : checkedIn ? 'Step 2 of 2' : 'Step 1 of 2'}
            </span>
            {today ? <span className="hidden sm:inline">{statusBadge(today.status)}</span> : null}
          </div>
        </div>

        <div className="relative grid gap-3 lg:grid-cols-[1fr_auto_1fr] lg:items-center">
          <PunchCard
            type="in"
            state={checkInState}
            time={today?.checkInLabel}
            hint={checkInHint}
            note={
              checkedIn ? (
                today?.lateCheckIn ? (
                  <span className="font-medium text-amber-700">Late check-in</span>
                ) : (
                  <span className="font-medium text-emerald-700">Checked in successfully</span>
                )
              ) : null
            }
            actionLabel="Check in"
            onAction={() => openCamera('in')}
          />
          <ShiftConnector today={today} requiredMinutes={requiredMinutes} requiredLabel={requiredLabel} />
          <PunchCard
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
            actionLabel="Check out"
            onAction={() => openCamera('out')}
            delay={140}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="space-y-4 border-b border-slate-100 px-5 py-5">
          <div>
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <CalendarDays size={18} className="text-brand-600" />
              Monthly Attendance
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Policy: {batchPolicy}. Batch hours minus 1h needed for Present. Sunday off. Weeks: Mon – Sun.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={navButton} onClick={() => setWeekStart(addDaysYmd(weekStart, -7))}>
              <ChevronLeft size={15} />
              Prev week
            </button>
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              Week {weekNumber} · {weekRangeLabel}
            </span>
            <button
              type="button"
              className={navButton}
              onClick={() => setWeekStart(addDaysYmd(weekStart, 7))}
              disabled={weekStart >= currentWeekStart}
            >
              Next week
              <ChevronRight size={15} />
            </button>
            {isRunningWeek ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Running week
              </span>
            ) : (
              <button
                type="button"
                onClick={() => setWeekStart(currentWeekStart)}
                className="text-xs font-medium text-brand-700 hover:underline"
              >
                Back to this week
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" className={navButton} onClick={refreshAll} disabled={weekLoading}>
              <RefreshCw size={14} className={weekLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button type="button" className={navButton} onClick={() => goToMonth(-1)}>
              Prev
            </button>
            <span className="min-w-[120px] px-2 text-center text-sm font-medium text-slate-700">
              {monthLabel(monthKey)}
            </span>
            <button
              type="button"
              className={navButton}
              onClick={() => goToMonth(1)}
              disabled={monthKey >= currentMonthKey}
            >
              Next
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
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
                      {row.isToday ? (
                        <span className="ml-2 rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                          Today
                        </span>
                      ) : null}
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
                    <td
                      className={cn(
                        'px-5 py-3.5 text-xs',
                        row.status === 'absent' ? 'text-rose-600' : 'text-slate-500'
                      )}
                    >
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
            ? 'Retry location & confirm'
            : camera === 'in'
              ? 'Confirm check-in'
              : 'Confirm check-out'
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
