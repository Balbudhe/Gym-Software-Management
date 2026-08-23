import Input from '../ui/Input';
import Select from '../ui/Select';

export default function MemberFilters({ filters, onChange, trainers = [], hideStatus, extra }) {
  function set(key, value) {
    onChange({ ...filters, [key]: value, page: 1 });
  }
  return (
    <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
      <Input
        placeholder="Search name, phone, ID"
        value={filters.search || ''}
        onChange={(e) => set('search', e.target.value)}
      />
      <Select value={filters.createdByTrainerId || 'all'} onChange={(e) => set('createdByTrainerId', e.target.value)} label="Added by">
        <option value="all">All trainers</option>
        {trainers.map((t) => (
          <option key={t._id} value={t._id}>{t.name}</option>
        ))}
      </Select>
      <Select value={filters.assignedTrainerId || 'all'} onChange={(e) => set('assignedTrainerId', e.target.value)} label="Assigned trainer">
        <option value="all">All trainers</option>
        {trainers.map((t) => (
          <option key={t._id} value={t._id}>{t.name}</option>
        ))}
      </Select>
      {!hideStatus && (
        <Select value={filters.status || 'all'} onChange={(e) => set('status', e.target.value)} label="Status">
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="expiring">Expiring</option>
          <option value="expired">Expired</option>
        </Select>
      )}
      <Select value={filters.datePreset || ''} onChange={(e) => set('datePreset', e.target.value)} label="Date">
        <option value="">All time</option>
        <option value="today">Today</option>
        <option value="week">This week</option>
        <option value="month">This month</option>
        <option value="custom">Custom range</option>
      </Select>
      {filters.datePreset === 'custom' && (
        <>
          <Input type="date" label="From" value={filters.startDate || ''} onChange={(e) => set('startDate', e.target.value)} />
          <Input type="date" label="To" value={filters.endDate || ''} onChange={(e) => set('endDate', e.target.value)} />
        </>
      )}
      {extra}
    </div>
  );
}
