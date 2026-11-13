import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import FormField from '../../components/forms/FormField';
import PasswordInput from '../../components/forms/PasswordInput';
import AuthShell from '../../components/auth/AuthShell';

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
    <AuthShell
      title="Create your gym"
      subtitle="We will set up a private database for your gym."
      footer={
        <>
          Already registered?{' '}
          <Link className="font-medium text-brand-700" to="/login">
            Sign in
          </Link>
        </>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField label="Gym name" error={errors.name?.message}>
          <input {...register('name', { required: 'Required' })} />
        </FormField>
        <FormField label="Owner name" error={errors.ownerName?.message}>
          <input {...register('ownerName', { required: 'Required' })} />
        </FormField>
        <FormField label="Email" error={errors.email?.message}>
          <input type="email" inputMode="email" {...register('email', { required: 'Required' })} />
        </FormField>
        <FormField label="Phone">
          <input inputMode="tel" {...register('phone')} />
        </FormField>
        <FormField label="Password" error={errors.password?.message}>
          <PasswordInput
            {...register('password', {
              required: 'Min 8 characters',
              minLength: { value: 8, message: 'Min 8 characters' },
            })}
          />
        </FormField>
        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white"
        >
          {submitting ? 'Creating gym...' : 'Create gym'}
        </button>
      </form>
    </AuthShell>
  );
}
