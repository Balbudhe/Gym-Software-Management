import { useForm } from 'react-hook-form';
import api from '../../lib/api';
import PageHeader from '../../components/ui/PageHeader';
import Card from '../../components/ui/Card';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Avatar from '../../components/ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { errorMessage, formatDate } from '../../lib/utils';

export default function TrainerProfile() {
  const { user, trainer, refresh } = useAuth();
  const toast = useToast();
  const { register, handleSubmit } = useForm({
    defaultValues: { name: user?.name || '', currentPassword: '', password: '' },
  });

  async function onSubmit(values) {
    try {
      await api.put('/settings/account', values);
      toast.success('Profile updated');
      refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  }

  return (
    <div className="space-y-5">
      <PageHeader title="Profile" />
      <Card className="flex items-center gap-4 p-5">
        <Avatar name={trainer?.name || user?.name} src={trainer?.profilePhoto} size="lg" />
        <div>
          <p className="font-semibold">{trainer?.name || user?.name}</p>
          <p className="text-sm text-slate-500">{trainer?.specialization}</p>
          <p className="text-sm text-slate-500">Joined {formatDate(trainer?.joiningDate)}</p>
        </div>
      </Card>
      <Card className="p-5">
        <form onSubmit={handleSubmit(onSubmit)} className="grid max-w-xl gap-4">
          <Input label="Name" {...register('name')} />
          <Input label="Current password" type="password" {...register('currentPassword')} />
          <Input label="New password" type="password" {...register('password')} />
          <Button>Save</Button>
        </form>
      </Card>
    </div>
  );
}
