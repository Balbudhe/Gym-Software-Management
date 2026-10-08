import Badge from './Badge';
import { formatBatchRange } from '../../utils/batches';

const tones = {
  morning: 'amber',
  afternoon: 'blue',
  evening: 'slate',
};

export default function BatchChips({ batches = [], empty = 'No batch assigned' }) {
  if (!batches?.length) {
    return <span className="text-xs text-slate-400">{empty}</span>;
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {batches.map((batch) => (
        <Badge key={batch.name} tone={tones[batch.name] || 'slate'}>
          {formatBatchRange(batch)}
        </Badge>
      ))}
    </div>
  );
}
