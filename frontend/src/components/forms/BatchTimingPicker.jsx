import { Clock } from 'lucide-react';
import { BATCH_OPTIONS } from '../../utils/batches';
import { cn } from '../../utils/format';

export default function BatchTimingPicker({ value, onChange, error }) {
  const toggleBatch = (id) => {
    onChange({
      ...value,
      [id]: { ...value[id], selected: !value[id].selected },
    });
  };

  const updateTime = (id, field, nextValue) => {
    onChange({
      ...value,
      [id]: { ...value[id], [field]: nextValue },
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
        <Clock size={16} />
        Batch timing
      </div>
      <p className="mb-3 text-xs text-slate-500">
        Select morning, afternoon, and/or evening. A trainer can take one batch or several — set the time for each selected batch.
      </p>
      <div className="space-y-3">
        {BATCH_OPTIONS.map((batch) => {
          const current = value[batch.id];
          const selected = current?.selected;
          return (
            <div
              key={batch.id}
              className={cn(
                'rounded-xl border p-3 transition',
                selected ? 'border-slate-300 bg-white' : 'border-slate-200 bg-slate-50/60'
              )}
            >
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  className="h-4 w-4 shrink-0 rounded border-slate-300 px-0 py-0 shadow-none accent-slate-900"
                  checked={!!selected}
                  onChange={() => toggleBatch(batch.id)}
                />
                <span className="text-sm font-medium text-slate-800">{batch.label} batch</span>
              </label>
              {selected ? (
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">Start time</span>
                    <input
                      type="time"
                      value={current.startTime}
                      onChange={(e) => updateTime(batch.id, 'startTime', e.target.value)}
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="mb-1 block font-medium text-slate-700">End time</span>
                    <input
                      type="time"
                      value={current.endTime}
                      onChange={(e) => updateTime(batch.id, 'endTime', e.target.value)}
                    />
                  </label>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
