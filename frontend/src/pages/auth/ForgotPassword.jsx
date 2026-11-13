import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import FormField from '../../components/forms/FormField';
import AuthShell from '../../components/auth/AuthShell';

export default function ForgotPassword() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const { data } = await api.post('/auth/forgot-password', values);
      setSent(true);
      toast.push(data.message || 'Check your email for a reset link');
    } catch (error) {
      toast.push(error.response?.data?.message || 'Could not send reset email', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell
      title="Forgot password"
      subtitle="Enter your account email. We will send a reset link if the account exists."
      footer={
        !sent ? (
          <>
            Remembered it?{' '}
            <Link className="font-medium text-brand-700" to="/login">
              Sign in
            </Link>
          </>
        ) : null
      }
    >
      {sent ? (
        <div className="space-y-4">
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            If an account exists for that email, a password reset link has been sent.
          </p>
          <Link to="/login" className="block text-center text-sm font-medium text-brand-700">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <FormField label="Email" error={errors.email?.message}>
            <input type="email" inputMode="email" {...register('email', { required: 'Required' })} />
          </FormField>
          <button
            type="submit"
            disabled={submitting}
            className="min-h-12 w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white"
          >
            {submitting ? 'Sending...' : 'Send reset link'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
