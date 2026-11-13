import { Link } from 'react-router-dom';
import { X } from 'lucide-react';
import { haptic } from '../../utils/haptics';

export default function MobileMoreSheet({ open, title = 'More', links = [], onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-[1px]"
        aria-label="Close menu"
        onClick={onClose}
      />
      <div className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-hidden rounded-t-3xl bg-white shadow-2xl animate-fade-up">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 pb-3 pt-[max(0.9rem,env(safe-area-inset-top))]">
          <div>
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-200 lg:hidden" />
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
            <p className="text-xs text-slate-500">Quick links for the gym console</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 p-2 text-slate-500"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto px-3 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
          <div className="grid gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => {
                    haptic(10);
                    onClose?.();
                  }}
                  className="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-medium text-slate-800 transition active:bg-slate-100"
                >
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                    <Icon size={18} />
                  </span>
                  {link.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
