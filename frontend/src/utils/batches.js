export const BATCH_OPTIONS = [
  { id: 'morning', label: 'Morning', defaultStart: '06:00', defaultEnd: '10:00' },
  { id: 'afternoon', label: 'Afternoon', defaultStart: '12:00', defaultEnd: '16:00' },
  { id: 'evening', label: 'Evening', defaultStart: '17:00', defaultEnd: '21:00' },
];

export const formatTime12 = (hhmm) => {
  if (!hhmm) return '';
  const [hourPart, minutePart] = String(hhmm).split(':');
  const hour = Number(hourPart);
  const minute = Number(minutePart);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return hhmm;
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = ((hour + 11) % 12) + 1;
  return `${hour12}:${String(minute).padStart(2, '0')} ${period}`;
};

export const formatBatchRange = (batch) => {
  if (!batch) return '';
  const meta = BATCH_OPTIONS.find((item) => item.id === batch.name);
  const label = meta?.label || batch.name;
  return `${label} ${formatTime12(batch.startTime)} – ${formatTime12(batch.endTime)}`;
};

export const formatTrainerBatches = (batches = []) =>
  (batches || []).map(formatBatchRange).filter(Boolean).join(', ');

export const trainerOptionLabel = (trainer) => {
  const batches = formatTrainerBatches(trainer.batches);
  return batches ? `${trainer.name} · ${batches}` : trainer.name;
};

export const emptyBatchState = () =>
  Object.fromEntries(
    BATCH_OPTIONS.map((batch) => [
      batch.id,
      { selected: false, startTime: batch.defaultStart, endTime: batch.defaultEnd },
    ])
  );

export const batchesToState = (batches = []) => {
  const state = emptyBatchState();
  (batches || []).forEach((batch) => {
    if (!state[batch.name]) return;
    state[batch.name] = {
      selected: true,
      startTime: batch.startTime || state[batch.name].startTime,
      endTime: batch.endTime || state[batch.name].endTime,
    };
  });
  return state;
};

export const stateToBatches = (state) =>
  BATCH_OPTIONS.filter((batch) => state[batch.id]?.selected).map((batch) => ({
    name: batch.id,
    startTime: state[batch.id].startTime,
    endTime: state[batch.id].endTime,
  }));

export const validateBatchState = (state) => {
  const selected = BATCH_OPTIONS.filter((batch) => state[batch.id]?.selected);
  if (!selected.length) return 'Select at least one batch';
  for (const batch of selected) {
    const { startTime, endTime } = state[batch.id];
    if (!startTime || !endTime) return `Set start and end time for ${batch.label.toLowerCase()} batch`;
    if (startTime >= endTime) return `${batch.label} batch end time must be after start time`;
  }
  return '';
};

const pad = (value) => String(value).padStart(2, '0');

export const dateToHhmm = (date = new Date(), timeZone = 'Asia/Kolkata') => {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === 'hour')?.value || '00';
  const minute = parts.find((part) => part.type === 'minute')?.value || '00';
  return `${pad(hour)}:${pad(minute)}`;
};

export const findActiveBatch = (batches = [], date = new Date()) => {
  const now = dateToHhmm(date);
  return (batches || []).find((batch) => batch.startTime <= now && now <= batch.endTime) || null;
};
