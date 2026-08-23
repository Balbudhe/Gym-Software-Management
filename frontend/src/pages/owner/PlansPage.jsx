import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Modal from '../../components/ui/Modal';
import StatusBadge from '../../components/ui/StatusBadge';
import { formatCurrency, errorMessage } from '../../lib/utils';
import { useToast } from '../../context/ToastContext';

export default function PlansPage() {
  const toast = useToast();
  const [plans, setPlans] = useState([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { register, handleSubmit, reset } = useForm({ defaultValues: { durationUnit: 'month' } });

  async function load() {
    const { data } = await api.get('/membership-plans');
    setPlans(data.plans);
  }
  useEffect(() => { load(); }, []);

  function startEdit(plan) {
    setEditing(plan);
    reset(plan || { durationUnit: 'month', durationValue: 1, price: 0 });
    setOpen(true);
  }

  async function onSubmit(values) {
    try {
      if (editing?._id) await api.put(`/membership-plans/${editing._id}`, values);
      else await api.post('/membership-plans', values);
      toast.success('Plan saved');
      setOpen(false);
      setEditing(null);
      load();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  async function toggle(plan) {
    await api.put(`/membership-plans/${plan._id}`, { status: plan.status === 'active' ? 'inactive' : 'active' });
    load();
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Membership plans" subtitle="Only owners can create, edit, or disable plans." actions={<Button onClick={() => startEdit(null)}>New plan</Button>} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((p) => (
          <Card key={p._id} className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{p.name}</h3>
                <p className="mt-1 text-2xl font-bold">{formatCurrency(p.price)}</p>
                <p className="text-sm text-slate-500">{p.durationValue} {p.durationUnit}{p.durationValue > 1 ? 's' : ''}</p>
              </div>
              <StatusBadge status={p.status} />
            </div>
            <p className="mt-3 text-sm text-slate-600">{p.description}</p>
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="secondary" onClick={() => startEdit(p)}>Edit</Button>
              <Button size="sm" variant="ghost" onClick={() => toggle(p)}>{p.status === 'active' ? 'Disable' : 'Enable'}</Button>
            </div>
          </Card>
        ))}
      </div>
      <Modal open={open} title={editing?._id ? 'Edit plan' : 'New plan'} onClose={() => setOpen(false)}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Name" {...register('name', { required: true })} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Duration" type="number" {...register('durationValue', { required: true })} />
            <Select label="Unit" {...register('durationUnit')}>
              <option value="day">Day</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </Select>
          </div>
          <Input label="Price (₹)" type="number" {...register('price', { required: true })} />
          <Textarea label="Description" {...register('description')} />
          <Button className="w-full">Save plan</Button>
        </form>
      </Modal>
    </div>
  );
}
