import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import FormField from '../../components/forms/FormField';
import PasswordInput from '../../components/forms/PasswordInput';
import AuthShell from '../../components/auth/AuthShell';

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
      <AuthShell title="Invalid reset link" subtitle="Request a new password reset from the login page.">
        <Link to="/forgot-password" className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white">
          Forgot password
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Set new password"
      subtitle="Choose a new password for your account."
      footer={
        <Link className="font-medium text-brand-700" to="/login">
          Back to sign in
        </Link>
      }
    >
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
        <FormField label="New password" error={errors.newPassword?.message}>
          <PasswordInput
            {...register('newPassword', {
              required: 'Required',
              minLength: { value: 8, message: 'Min 8 characters' },
            })}
          />
        </FormField>
        <FormField label="Confirm password" error={errors.confirmPassword?.message}>
          <PasswordInput
            {...register('confirmPassword', {
              required: 'Required',
              validate: (value) => value === watch('newPassword') || 'Passwords do not match',
            })}
          />
        </FormField>
        <button
          type="submit"
          disabled={submitting}
          className="min-h-12 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white"
        >
          {submitting ? 'Updating...' : 'Update password'}
        </button>
      </form>
    </AuthShell>
  );
}
