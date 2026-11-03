import { useEffect } from 'react';
import { X } from 'lucide-react';
import AuthImage from './AuthImage';

export default function ImageLightbox({ open, src, alt = 'Photo', onClose }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !src) return null;

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 rounded-full bg-white/10 p-2 text-white transition hover:bg-white/20"
        aria-label="Close image"
      >
        <X size={20} />
      </button>
      <div
        className="relative max-h-[90vh] max-w-[92vw] overflow-hidden rounded-2xl bg-slate-900/40 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <AuthImage
          src={src}
          alt={alt}
          className="max-h-[90vh] max-w-[92vw] object-contain"
        />
      </div>
    </div>
  );
}
