import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import FormField from '../../components/forms/FormField';

export default function Settings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [gym, setGym] = useState(null);
  const gymForm = useForm();
  const passwordForm = useForm();

  useEffect(() => {
    api.get('/settings').then(({ data }) => {
      setGym(data.gym);
      gymForm.reset(data.gym);
    });
  }, []);

  const saveGym = async (values) => {
    try {
      const { data } = await api.put('/settings', values);
      setGym(data.gym);
      setUser({
        ...user,
        gymName: data.gym.name,
        name: data.gym.ownerName,
        paymentsEnabled: Boolean(data.gym.paymentsEnabled),
      });
      toast.push('Settings saved');
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not save', 'error');
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
      <PageHeader title="Settings" subtitle="Gym profile only. Database credentials are never shown." />
      <div className="grid gap-6 lg:grid-cols-2">
        <form className="space-y-4 rounded-xl border border-slate-200 bg-white p-5" onSubmit={gymForm.handleSubmit(saveGym)}>
          <h2 className="text-sm font-semibold">Gym profile</h2>
          <FormField label="Gym name"><input {...gymForm.register('name')} /></FormField>
          <FormField label="Owner name"><input {...gymForm.register('ownerName')} /></FormField>
          <FormField label="Phone"><input {...gymForm.register('phone')} /></FormField>
          <FormField label="Login email"><input value={gym?.email || ''} disabled /></FormField>
          <FormField label="Gym code"><input value={gym?.slug || ''} disabled /></FormField>
          <label className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 px-0 py-0 accent-slate-900"
              checked={Boolean(gymForm.watch('paymentsEnabled'))}
              onChange={(e) => gymForm.setValue('paymentsEnabled', e.target.checked, { shouldDirty: true })}
            />
            <span>
              <span className="block font-medium text-slate-800">Allow cash and online membership payments</span>
              <span className="mt-1 block text-xs text-slate-500">
                When on, admissions collect cash or online payment. All payment records are visible only to the owner.
              </span>
            </span>
          </label>
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
