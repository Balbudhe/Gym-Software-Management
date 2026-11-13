import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Dumbbell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import FormField from '../../components/forms/FormField';
import PasswordInput from '../../components/forms/PasswordInput';
import { haptic } from '../../utils/haptics';

export default function Login() {
  const { user, login } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  if (user) {
    return (
      <Navigate
        to={user.role === 'OWNER' ? '/owner/dashboard' : '/trainer/dashboard'}
        replace
      />
    );
  }

  const onSubmit = async (values) => {
    setSubmitting(true);
    try {
      const next = await login(values);
      haptic([12, 40, 12]);
      toast.push('Signed in');
      navigate(next.role === 'OWNER' ? '/owner/dashboard' : '/trainer/dashboard');
    } catch (error) {
      haptic(40);
      toast.push(error.response?.data?.message || 'Login failed', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-dvh w-full overflow-x-hidden bg-slate-950 text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_20%_0%,rgba(16,185,129,0.22),transparent_50%),radial-gradient(ellipse_at_90%_100%,rgba(15,23,42,0.9),transparent_45%),linear-gradient(160deg,#0f172a_0%,#020617_55%,#020617_100%)]" />
      <div className="pointer-events-none fixed inset-0 opacity-[0.035] [background-image:linear-gradient(rgba(255,255,255,.9)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.9)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative z-10 mx-auto flex min-h-dvh w-full max-w-6xl items-center justify-center px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
        <div className="grid w-full max-w-[24rem] items-center gap-5 lg:max-w-none lg:grid-cols-2 lg:gap-14 xl:gap-20">
          <div className="min-w-0 text-center lg:pr-4 lg:text-left">
            <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-500/15 text-brand-400 ring-1 ring-brand-500/30 lg:mx-0 lg:mb-5 lg:h-14 lg:w-14">
              <Dumbbell size={22} />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-400">
              Gym Management
            </p>
            <h1 className="mt-2 text-[1.65rem] font-semibold tracking-tight text-white sm:text-3xl lg:text-[2.35rem] lg:leading-[1.15]">
              Run your gym
              <span className="hidden lg:inline">
                <br />
                from one place
              </span>
            </h1>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400 lg:mx-0 lg:mt-3">
              Sign in with your email and password to manage members, attendance, and trainers.
            </p>
            <ul className="mt-8 hidden gap-3.5 text-sm text-slate-300 lg:grid">
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                Member admissions & renewals
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                Live attendance with photo proof
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-400" />
                Owner & trainer workspaces
              </li>
            </ul>
          </div>

          <div className="min-w-0 w-full">
            <form
              className="w-full rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl shadow-black/30 sm:p-7"
              onSubmit={handleSubmit(onSubmit)}
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold tracking-tight text-slate-900">Sign in</h2>
                <p className="mt-1 text-sm text-slate-500">Use your gym credentials to continue.</p>
              </div>

              <div className="space-y-3">
                <FormField label="Email" error={errors.email?.message}>
                  <input
                    type="email"
                    inputMode="email"
                    autoCapitalize="none"
                    autoComplete="email"
                    {...register('email', { required: 'Required' })}
                  />
                </FormField>
                <FormField label="Password" error={errors.password?.message}>
                  <PasswordInput
                    autoComplete="current-password"
                    {...register('password', { required: 'Required' })}
                  />
                </FormField>
              </div>

              <div className="mt-2 text-right">
                <Link to="/forgot-password" className="text-sm font-medium text-brand-700 hover:text-brand-800">
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.99] disabled:opacity-60"
              >
                {submitting ? 'Signing in...' : 'Sign in'}
              </button>

              <p className="mt-4 text-center text-sm text-slate-500">
                New gym?{' '}
                <Link className="font-medium text-brand-700 hover:text-brand-800" to="/signup">
                  Create an account
                </Link>
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
