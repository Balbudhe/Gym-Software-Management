import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card, { CardHeader } from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage } from '../../lib/utils';

export default function SettingsPage() {
  const { gym, refresh } = useAuth();
  const toast = useToast();
  const gymForm = useForm();
  const settingsForm = useForm();
  const accountForm = useForm();
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    api.get('/gyms/me').then(({ data }) => {
      gymForm.reset(data.gym);
      settingsForm.reset(data.gym.settings);
    });
  }, []);

  async function saveGym(values) {
    const form = new FormData();
    ['name', 'email', 'phone', 'address', 'city', 'state', 'pincode'].forEach((k) => form.append(k, values[k] || ''));
    if (logo) form.append('logo', logo);
    await api.put('/gyms/me', form);
    toast.success('Gym profile updated');
    refresh();
  }

  async function saveSettings(values) {
    await api.put('/settings', values);
    toast.success('Settings updated');
  }

  async function saveAccount(values) {
    try {
      await api.put('/settings/account', values);
      toast.success('Account updated');
      accountForm.reset({ name: values.name, currentPassword: '', password: '' });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle={`Workspace for ${gym?.name || 'your gym'}.`} />
      <Card>
        <CardHeader title="Gym profile" />
        <form onSubmit={gymForm.handleSubmit(saveGym)} className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Gym name" {...gymForm.register('name', { required: true })} />
          <Input label="Email" {...gymForm.register('email')} />
          <Input label="Phone" {...gymForm.register('phone')} />
          <Input label="City" {...gymForm.register('city')} />
          <Input label="State" {...gymForm.register('state')} />
          <Input label="Pincode" {...gymForm.register('pincode')} />
          <div className="sm:col-span-2"><Input label="Address" {...gymForm.register('address')} /></div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Logo</span>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => setLogo(e.target.files?.[0] || null)} />
          </label>
          <div className="sm:col-span-2"><Button>Save gym profile</Button></div>
        </form>
      </Card>
      <Card>
        <CardHeader title="Membership & attendance settings" />
        <form onSubmit={settingsForm.handleSubmit(saveSettings)} className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Expiring soon (days)" type="number" {...settingsForm.register('expiringSoonDays')} />
          <Input label="Late after (HH:MM)" {...settingsForm.register('lateAfterTime')} />
          <div className="sm:col-span-2"><Button>Save settings</Button></div>
        </form>
      </Card>
      <Card>
        <CardHeader title="Account settings" />
        <form onSubmit={accountForm.handleSubmit(saveAccount)} className="grid gap-4 p-5 sm:grid-cols-2">
          <Input label="Name" {...accountForm.register('name')} />
          <Input label="Current password" type="password" {...accountForm.register('currentPassword')} />
          <Input label="New password" type="password" {...accountForm.register('password')} />
          <div className="sm:col-span-2"><Button>Update account</Button></div>
        </form>
      </Card>
    </div>
  );
}
