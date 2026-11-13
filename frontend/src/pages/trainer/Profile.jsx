import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import FormField from '../../components/forms/FormField';
import PasswordInput from '../../components/forms/PasswordInput';
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
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Profile"
        subtitle={`Branch is fixed: ${user.branchName || 'Assigned branch'}`}
      />
      <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <form
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          onSubmit={form.handleSubmit(save)}
        >
          <h2 className="text-sm font-semibold text-slate-900">Personal details</h2>
          <FormField label="Name"><input {...form.register('name')} /></FormField>
          <FormField label="Email"><input value={user.email} disabled /></FormField>
          <FormField label="Phone"><input inputMode="tel" {...form.register('phone')} /></FormField>
          <FormField label="Specialization"><input {...form.register('specialization')} /></FormField>
          <div>
            <p className="mb-1 text-sm font-medium text-slate-700">Assigned batches</p>
            <BatchChips batches={batches} empty="No batch assigned by owner" />
          </div>
          <button type="submit" className="min-h-11 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white sm:w-auto">
            Save profile
          </button>
        </form>
        <form
          className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          onSubmit={passwordForm.handleSubmit(savePassword)}
        >
          <h2 className="text-sm font-semibold text-slate-900">Change password</h2>
          <FormField label="Current password">
            <PasswordInput {...passwordForm.register('currentPassword', { required: true })} />
          </FormField>
          <FormField label="New password">
            <PasswordInput {...passwordForm.register('newPassword', { required: true, minLength: 8 })} />
          </FormField>
          <button type="submit" className="min-h-11 w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white sm:w-auto">
            Update password
          </button>
        </form>
      </div>
    </div>
  );
}
