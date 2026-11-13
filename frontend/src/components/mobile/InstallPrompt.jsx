import { useEffect, useState } from 'react';
import { Download, Share, X } from 'lucide-react';

const DISMISS_KEY = 'gym_pwa_install_dismissed';

export default function InstallPrompt() {
  const [deferred, setDeferred] = useState(null);
  const [visible, setVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    if (standalone) return undefined;

    const dismissed = sessionStorage.getItem(DISMISS_KEY) === '1';
    const ios = /iphone|ipad|ipod/i.test(window.navigator.userAgent);
    setIsIos(ios);

    const onBeforeInstall = (event) => {
      event.preventDefault();
      setDeferred(event);
      if (!dismissed) setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstall);
    if (ios && !dismissed) {
      const timer = setTimeout(() => setVisible(true), 1800);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('beforeinstallprompt', onBeforeInstall);
      };
    }

    return () => window.removeEventListener('beforeinstallprompt', onBeforeInstall);
  }, []);

  if (!visible) return null;

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, '1');
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    deferred.prompt();
    await deferred.userChoice;
    setDeferred(null);
    dismiss();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.25rem+env(safe-area-inset-bottom))] z-[65] px-3 lg:bottom-4">
      <div className="pointer-events-auto mx-auto flex max-w-lg items-start gap-3 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-brand-500">
          <Download size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-slate-900">Install Gym app</p>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
            {isIos && !deferred
              ? 'Tap Share, then Add to Home Screen for a full-screen app.'
              : 'Add to your home screen for a native-like experience.'}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {deferred ? (
              <button
                type="button"
                onClick={install}
                className="rounded-xl bg-slate-900 px-3 py-1.5 text-xs font-medium text-white"
              >
                Install
              </button>
            ) : isIos ? (
              <span className="inline-flex items-center gap-1 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-700">
                <Share size={12} /> Share → Add to Home Screen
              </span>
            ) : null}
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl px-3 py-1.5 text-xs font-medium text-slate-500"
            >
              Not now
            </button>
          </div>
        </div>
        <button type="button" onClick={dismiss} className="rounded-full p-1 text-slate-400" aria-label="Dismiss">
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
