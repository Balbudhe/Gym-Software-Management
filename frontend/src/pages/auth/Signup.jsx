import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import FormField from '../../components/forms/FormField';

export default function Signup() {
  const { user, signup } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  if (user) {
    return <Navigate to="/owner/dashboard" replace />;
  }

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      await signup(values);
      toast.push('Gym created. Welcome aboard.');
      navigate('/owner/dashboard');
    } catch (error) {
      toast.push(error.response?.data?.message || 'Signup failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gym Management</p>
        <h1 className="mt-2 text-2xl font-semibold">Create your gym</h1>
        <p className="mt-1 text-sm text-slate-500">We will provision a private database for your gym.</p>
        <form className="mt-6 grid gap-4 sm:grid-cols-2" onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Gym name" error={errors.name?.message}>
            <input {...register('name', { required: 'Required' })} />
          </FormField>
          <FormField label="Owner name" error={errors.ownerName?.message}>
            <input {...register('ownerName', { required: 'Required' })} />
          </FormField>
          <FormField label="Email" error={errors.email?.message}>
            <input type="email" {...register('email', { required: 'Required' })} />
          </FormField>
          <FormField label="Phone">
            <input {...register('phone')} />
          </FormField>
          <FormField label="Password" error={errors.password?.message}>
            <input type="password" {...register('password', { required: 'Min 8 characters', minLength: { value: 8, message: 'Min 8 characters' } })} />
          </FormField>
          <div className="sm:col-span-2">
            <button type="submit" disabled={submitting} className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white">
              {submitting ? 'Creating gym...' : 'Create gym'}
            </button>
          </div>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          Already registered? <Link className="font-medium text-brand-700" to="/login">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
