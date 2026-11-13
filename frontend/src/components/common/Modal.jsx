import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../utils/format';

export default function Modal({ open, title, children, onClose, wide }) {
  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 bg-slate-950/50" aria-label="Close" onClick={onClose} />
      <div
        className={cn(
          'relative flex max-h-[88dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:max-h-[90vh] sm:rounded-2xl',
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        )}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-4">
          <h2 className="pr-3 text-base font-semibold text-slate-900 sm:text-lg">{title}</h2>
          <button
            type="button"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {children}
        </div>
      </div>
    </div>,
    document.body
  );
}
