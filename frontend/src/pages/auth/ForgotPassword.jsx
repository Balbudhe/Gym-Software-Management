import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import FormField from '../../components/forms/FormField';

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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Gym Management</p>
        <h1 className="mt-2 text-2xl font-semibold">Forgot password</h1>
        <p className="mt-1 text-sm text-slate-500">
          Enter your gym code and email. We will send a reset link if the account exists.
        </p>

        {sent ? (
          <div className="mt-6 space-y-4">
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              If an account exists for that gym code and email, a password reset link has been sent.
              Check your inbox (and spam folder).
            </p>
            <Link to="/login" className="block text-center text-sm font-medium text-brand-700">
              Back to sign in
            </Link>
          </div>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleSubmit(onSubmit)}>
            <FormField label="Gym code" error={errors.slug?.message}>
              <input placeholder="fitzone" {...register('slug', { required: 'Required' })} />
            </FormField>
            <FormField label="Email" error={errors.email?.message}>
              <input type="email" {...register('email', { required: 'Required' })} />
            </FormField>
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-lg bg-slate-900 py-2.5 text-sm font-medium text-white"
            >
              {submitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        )}

        {!sent ? (
          <p className="mt-4 text-center text-sm text-slate-500">
            Remembered it? <Link className="font-medium text-brand-700" to="/login">Sign in</Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
