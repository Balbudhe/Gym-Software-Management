import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Select from '../../components/ui/Select';
import Textarea from '../../components/ui/Textarea';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { addDuration, errorMessage, formatDate, toInputDate } from '../../lib/utils';

export default function AdmissionForm() {
  const { user, trainer } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: { startDate: toInputDate(new Date()), gender: '' },
  });
  const [plans, setPlans] = useState([]);
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [photo, setPhoto] = useState(null);

  const planId = watch('membershipPlanId');
  const startDate = watch('startDate');
  const selectedPlan = plans.find((p) => p._id === planId);
  const expiryPreview = useMemo(() => {
    if (!selectedPlan || !startDate) return '';
    return formatDate(addDuration(startDate, selectedPlan.durationValue, selectedPlan.durationUnit));
  }, [selectedPlan, startDate]);

  useEffect(() => {
    api.get('/membership-plans').then((res) => setPlans(res.data.plans || []));
    api.get('/trainers/options').then((res) => setTrainers(res.data.trainers || []));
  }, []);

  async function onSubmit(values) {
    setLoading(true);
    try {
      const form = new FormData();
      Object.entries(values).forEach(([k, v]) => {
        if (v !== undefined && v !== null) form.append(k, v);
      });
      if (user.role === 'TRAINER') form.delete('createdByTrainerId');
      if (photo) form.append('profilePhoto', photo);
      await api.post('/members', form);
      toast.success('Admission created');
      navigate(user.role === 'OWNER' ? '/admissions' : '/my-members');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not create admission'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <PageHeader title="New admission" subtitle="Create a member record with membership and trainer assignment." />
      <Card>
        <CardHeader title="Personal information" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Full name" error={errors.name?.message} {...register('name', { required: 'Required' })} />
          <Input label="Mobile number" error={errors.phone?.message} {...register('phone', { required: 'Required' })} />
          <Input label="Email" type="email" {...register('email')} />
          <Input label="Date of birth" type="date" {...register('dateOfBirth')} />
          <Select label="Gender" {...register('gender')}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </Select>
          <Input label="Emergency contact" {...register('emergencyContact')} />
          <div className="sm:col-span-2">
            <Input label="Address" {...register('address')} />
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Profile photo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
          </label>
        </div>
      </Card>
      <Card>
        <CardHeader title="Membership" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Select label="Membership plan" error={errors.membershipPlanId?.message} {...register('membershipPlanId', { required: 'Required' })}>
            <option value="">Select plan</option>
            {plans.filter((p) => p.status === 'active').map((p) => (
              <option key={p._id} value={p._id}>{p.name} · ₹{p.price}</option>
            ))}
          </Select>
          <Input label="Start date" type="date" error={errors.startDate?.message} {...register('startDate', { required: 'Required' })} />
          <Input label="Duration" value={selectedPlan ? `${selectedPlan.durationValue} ${selectedPlan.durationUnit}(s)` : ''} readOnly />
          <Input label="Expiry date" value={expiryPreview} readOnly />
        </div>
      </Card>
      <Card>
        <CardHeader title="Trainer" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          {user.role === 'OWNER' ? (
            <Select label="Added by trainer" {...register('createdByTrainerId')}>
              <option value="">Select trainer</option>
              {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
            </Select>
          ) : (
            <Input label="Added by trainer" value={trainer?.name || user.name} readOnly />
          )}
          <Select label="Assigned trainer" {...register('assignedTrainerId')}>
            <option value="">Select trainer</option>
            {trainers.map((t) => <option key={t._id} value={t._id}>{t.name}</option>)}
          </Select>
        </div>
      </Card>
      <Card>
        <CardHeader title="Additional information" subtitle="Optional" />
        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Height (cm)" type="number" {...register('height')} />
          <Input label="Weight (kg)" type="number" {...register('weight')} />
          <Input label="Fitness goal" {...register('fitnessGoal')} />
          <div className="sm:col-span-2">
            <Textarea label="Remarks" {...register('remarks')} />
          </div>
        </div>
      </Card>
      <div className="flex justify-end">
        <Button loading={loading}>Create admission</Button>
      </div>
    </form>
  );
}
