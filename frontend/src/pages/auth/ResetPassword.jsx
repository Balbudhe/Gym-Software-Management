import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import FormField from '../../components/forms/FormField';

export default function ResetPassword() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = useMemo(() => searchParams.get('token') || '', [searchParams]);
  const [submitting, setSubmitting] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();

  const onSubmit = async (values) => {
    if (!token) {
      toast.push('Reset link is missing or invalid', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/reset-password', {
        token,
        newPassword: values.newPassword,
      });
      toast.push(data.message || 'Password updated');
      navigate('/login');
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not reset password', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-semibold">Invalid reset link</h1>
          <p className="mt-2 text-sm text-slate-500">Request a new password reset from the login page.</p>
          <Link to="/forgot-password" className="mt-6 inline-block text-sm font-medium text-brand-700">
            Forgot password
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gym Management</p>
        <h1 className="mt-2 text-2xl font-semibold">Set new password</h1>
        <p className="mt-1 text-sm text-slate-500">Choose a new password for your account.</p>
        <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormField label="New password" error={errors.newPassword?.message}>
            <input
              type="password"
              {...register('newPassword', {
                required: 'Required',
                minLength: { value: 8, message: 'Min 8 characters' },
              })}
            />
          </FormField>
          <FormField label="Confirm password" error={errors.confirmPassword?.message}>
            <input
              type="password"
              {...register('confirmPassword', {
                required: 'Required',
                validate: (value) => value === watch('newPassword') || 'Passwords do not match',
              })}
            />
          </FormField>
          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white"
          >
            {submitting ? 'Updating...' : 'Update password'}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-slate-500">
          <Link className="font-medium text-brand-700" to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
