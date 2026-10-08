import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import FormField from '../../components/forms/FormField';
import BatchChips from '../../components/common/BatchChips';

export default function TrainerProfile() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const form = useForm({ defaultValues: { name: user?.name } });
  const passwordForm = useForm();
  const [batches, setBatches] = useState([]);

  useEffect(() => {
    api.get(`/trainers/${user.trainerId}`).then(({ data }) => {
      form.reset({
        name: data.item.name,
        phone: data.item.phone,
        specialization: data.item.specialization,
      });
      setBatches(data.item.batches || []);
    });
  }, [user]);

  const save = async (values) => {
    try {
      const { data } = await api.put('/settings/profile', values);
      setUser({ ...user, name: data.user.name });
      toast.push('Profile updated');
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not update profile', 'error');
    }
  };

  const savePassword = async (values) => {
    try {
      await api.post('/auth/change-password', values);
      passwordForm.reset();
      toast.push('Password updated');
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not update password', 'error');
    }
  };

  return (
    <div>
      <PageHeader title="Profile" subtitle={`Branch is assigned and cannot be changed. ${user.branchName || ''}`} />
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={form.handleSubmit(save)}>
          <FormField label="Name"><input {...form.register('name')} /></FormField>
          <FormField label="Email"><input value={user.email} disabled /></FormField>
          <FormField label="Phone"><input {...form.register('phone')} /></FormField>
          <FormField label="Specialization"><input {...form.register('specialization')} /></FormField>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Assigned batches</p>
            <BatchChips batches={batches} empty="No batch assigned by owner" />
          </div>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Save</button>
        </form>
        <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={passwordForm.handleSubmit(savePassword)}>
          <h2 className="text-sm font-semibold">Change password</h2>
          <FormField label="Current password"><input type="password" {...passwordForm.register('currentPassword', { required: true })} /></FormField>
          <FormField label="New password"><input type="password" {...passwordForm.register('newPassword', { required: true, minLength: 8 })} /></FormField>
          <button type="submit" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white">Update password</button>
        </form>
      </div>
    </div>
  );
}
