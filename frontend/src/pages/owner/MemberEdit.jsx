import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import { PageSpinner } from '../../components/ui/Spinner';
import { useToast } from '../../context/ToastContext';
import { errorMessage, toInputDate } from '../../lib/utils';

export default function MemberEdit() {
  const { id } = useParams();
  const toast = useToast();
  const navigate = useNavigate();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [photo, setPhoto] = useState(null);

  useEffect(() => {
    Promise.all([api.get(`/members/${id}`), api.get('/trainers/options')])
      .then(([memberRes, trainerRes]) => {
        const m = memberRes.data.member;
        reset({
          name: m.name,
          phone: m.phone,
          email: m.email,
          dateOfBirth: toInputDate(m.dateOfBirth),
          gender: m.gender || '',
          address: m.address,
          emergencyContact: m.emergencyContact,
          assignedTrainerId: m.assignedTrainerId?._id || '',
          height: m.height || '',
          weight: m.weight || '',
          fitnessGoal: m.fitnessGoal,
          remarks: m.remarks,
          status: m.status === 'inactive' ? 'inactive' : 'active',
        });
        setTrainers(trainerRes.data.trainers || []);
      })
      .finally(() => setLoading(false));
  }, [id, reset]);

  async function onSubmit(values) {
    setSaving(true);
    try {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => form.append(k, v ?? ''));
      if (photo) form.append('profilePhoto', photo);
      await api.put(`/members/${id}`, form);
      toast.success('Member updated');
      navigate(`/members/${id}`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <PageSpinner />;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <PageHeader title="Edit member" subtitle="Changing assigned trainer does not change who created the admission." />
      <Card className="grid gap-4 p-5 sm:grid-cols-2">
        <Input label="Full name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
        <Input label="Phone" {...register('phone', { required: 'Required' })} />
        <Input label="Email" {...register('email')} />
        <Input label="Date of birth" type="date" {...register('dateOfBirth')} />
        <Select label="Gender" {...register('gender')}>
          <option value="">Select</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
        </Select>
        <Select label="Assigned trainer" {...register('assignedTrainerId')}>
          <option value="">Unassigned</option>
          {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
        </Select>
        <Input label="Address" className="sm:col-span-2" {...register('address')} />
        <Input label="Emergency contact" {...register('emergencyContact')} />
        <Select label="Account status" {...register('status')}>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </Select>
        <Input label="Height" type="number" {...register('height')} />
        <Input label="Weight" type="number" {...register('weight')} />
        <Input label="Fitness goal" {...register('fitnessGoal')} />
        <div className="sm:col-span-2"><Textarea label="Remarks" {...register('remarks')} /></div>
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Profile photo</span>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
        </label>
      </Card>
      <Button loading={saving}>Save changes</Button>
    </form>
  );
}
