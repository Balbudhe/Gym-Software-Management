import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../context/ToastContext';
import { errorMessage, toInputDate } from '../../lib/utils';

export default function TrainerForm() {
  const { id } = useParams();
  const editing = Boolean(id);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    defaultValues: { joiningDate: toInputDate(new Date()) },
  });
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);
  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!editing) return;
    api.get(`/trainers/${id}`).then((res) => {
      const t = res.data.trainer;
      reset({
        name: t.name,
        email: t.email,
        phone: t.phone,
        specialization: t.specialization,
        experience: t.experience,
        joiningDate: toInputDate(t.joiningDate),
      });
    }).finally(() => setLoading(false));
  }, [editing, id, reset]);

  async function onSubmit(values) {
    setSaving(true);
    try {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (editing && k === 'password' && !v) return;
        if (editing && k === 'email') return;
        form.append(k, v ?? '');
      });
      if (photo) form.append('profilePhoto', photo);
      if (editing) await api.put(`/trainers/${id}`, form);
      else await api.post('/trainers', form);
      toast.success(editing ? 'Trainer updated' : 'Trainer created');
      navigate('/trainers');
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <PageHeader title={editing ? 'Edit trainer' : 'Add trainer'} subtitle="Trainers receive their own login for admissions and attendance." />
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Input label="Name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
        {!editing && <Input label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Required' })} />}
        <Input label="Phone" error={errors.phone?.message} {...register('phone', { required: 'Required' })} />
        {!editing && <Input label="Password" type="password" error={errors.password?.message} {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />}
        <Input label="Specialization" {...register('specialization')} />
        <Input label="Experience (years)" type="number" {...register('experience')} />
        <Input label="Joining date" type="date" {...register('joiningDate')} />
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Profile photo</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </label>
      </Card>
      <Button loading={saving}>{editing ? 'Save changes' : 'Create trainer'}</Button>
    </form>
  );
}
