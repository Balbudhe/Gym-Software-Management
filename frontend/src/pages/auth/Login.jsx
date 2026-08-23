import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import { errorMessage } from '../../lib/utils';

export default function Login() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const { login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  async function onSubmit(values) {
    setLoading(true);
    try {
      await login(values.email, values.password);
      navigate('/dashboard');
    } catch (error) {
      toast.error(errorMessage(error, 'Unable to sign in'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden bg-ink p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div>
          <p className="text-sm font-semibold tracking-wide text-brand-500">APEXFIT</p>
          <h1 className="mt-16 max-w-md text-4xl font-bold leading-tight">The operating system for modern gyms.</h1>
          <p className="mt-4 max-w-md text-slate-300">
            Track admissions, trainer attendance, and memberships with complete gym-level isolation.
          </p>
        </div>
        <p className="text-sm text-slate-500">Built for gym owners and trainers.</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={handleSubmit(onSubmit)} className="w-full max-w-md space-y-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">Welcome back</h2>
            <p className="mt-1 text-sm text-slate-500">Sign in to your gym workspace.</p>
          </div>
          <Input label="Email" type="email" error={errors.email?.message} {...register('email', { required: 'Email is required' })} />
          <Input label="Password" type="password" error={errors.password?.message} {...register('password', { required: 'Password is required' })} />
          <Button className="w-full" loading={loading}>Sign in</Button>
          <p className="text-center text-sm text-slate-500">
            New gym? <Link to="/register" className="font-semibold text-brand-700">Create an account</Link>
          </p>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
            Demo: owner@fitzone.com / Owner@123<br />
            Trainer: amit@fitzone.com / Trainer@123
          </div>
        </form>
      </div>
    </div>
  );
}
