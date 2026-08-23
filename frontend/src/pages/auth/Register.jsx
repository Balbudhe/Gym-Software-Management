import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { errorMessage } from '../../lib/utils';

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { register: signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(values) {
    setLoading(true);
    try {
      await signup(values);
      toast.success('Gym workspace created');
      navigate('/dashboard');
    } catch (error) {
      toast.error(errorMessage(error, 'Unable to create gym'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f4f6f8] p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-xl space-y-5 rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div>
          <p className="text-sm font-semibold text-brand-700">ApexFit</p>
          <h1 className="mt-2 text-2xl font-bold">Register your gym</h1>
          <p className="mt-1 text-sm text-slate-500">Create an isolated workspace for your staff and members.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Gym name" error={errors.gymName?.message} {...register('gymName', { required: 'Required' })} />
          <Input label="Owner name" error={errors.ownerName?.message} {...register('ownerName', { required: 'Required' })} />
          <Input label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Required' })} />
          <Input label="Phone" error={errors.phone?.message} {...register('phone', { required: 'Required' })} />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password', { required: 'Required', minLength: { value: 8, message: 'Min 8 characters' } })} />
          <Input label="City" {...register('city')} />
          <Input label="State" {...register('state')} />
          <Input label="Pincode" {...register('pincode')} />
        </div>
        <Input label="Address" {...register('address')} />
        <Button className="w-full" loading={loading}>Create gym</Button>
        <p className="text-center text-sm text-slate-500">
          Already have an account? <Link to="/login" className="font-semibold text-brand-700">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
