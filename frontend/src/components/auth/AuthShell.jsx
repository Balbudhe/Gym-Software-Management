import { Dumbbell } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AuthShell({ title, subtitle, children, footer }) {
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
              {title}
            </h1>
            {subtitle ? (
              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-400 lg:mx-0 lg:mt-3">
                {subtitle}
              </p>
            ) : null}
          </div>

          <div className="min-w-0 w-full">
            <div className="w-full overflow-x-hidden rounded-2xl border border-white/10 bg-white p-5 text-slate-900 shadow-2xl shadow-black/30 sm:p-7">
              {children}
              {footer ? <div className="mt-4 text-center text-sm text-slate-500">{footer}</div> : null}
              <p className="mt-5 text-center text-xs text-slate-400">
                <Link to="/login" className="hover:text-slate-600">
                  Back to sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
