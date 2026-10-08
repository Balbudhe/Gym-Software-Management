import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import FormField from '../../components/forms/FormField';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  if (user) {
    return <Navigate to={user.role === 'OWNER' ? '/owner/dashboard' : '/trainer/dashboard'} replace />;
  }

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const next = await login(values);
      toast.push('Signed in');
      navigate(next.role === 'OWNER' ? '/owner/dashboard' : '/trainer/dashboard');
    } catch (error) {
      toast.push(error.response?.data?.message || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gym Management</p>
        <h1 className="mt-2 text-2xl font-semibold">Sign in</h1>
        <p className="mt-1 text-sm text-slate-500">Use your gym code, email and password.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Gym code" error={errors.slug?.message}>
            <input placeholder="fitzone" {...register('slug', { required: 'Required' })} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <input type="email" {...register('email', { required: 'Required' })} />
          </FormField>
          <FormField label="Password" error={errors.password?.message}>
            <input type="password" {...register('password', { required: 'Required' })} />
          </FormField>
          <div className="text-right">
            <Link to="/forgot-password" className="text-sm font-medium text-brand-700">
              Forgot password?
            </Link>
          </div>
          <button type="submit" disabled={submitting} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white">
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          New gym? <Link className="font-medium text-brand-700" to="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
