import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LoaderCircle } from 'lucide-react';
import { cn } from '../../utils/format';
import { haptic } from '../../utils/haptics';

export default function ScrollMain({ children, className = '', onRefresh }) {
  const ref = useRef(null);
  const { pathname } = useLocation();
  const startY = useRef(0);
  const pulling = useRef(false);
  const pullRef = useRef(0);
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const finishRefresh = useCallback(async () => {
    if (!onRefresh || refreshing) {
      pullRef.current = 0;
      setPull(0);
      return;
    }
    setRefreshing(true);
    haptic(15);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
      pullRef.current = 0;
      setPull(0);
    }
  }, [onRefresh, refreshing]);

  useEffect(() => {
    const el = ref.current;
    if (!el || !onRefresh) return undefined;

    const onTouchStart = (event) => {
      if (el.scrollTop > 0 || refreshing) return;
      startY.current = event.touches[0].clientY;
      pulling.current = true;
    };

    const onTouchMove = (event) => {
      if (!pulling.current || refreshing) return;
      if (el.scrollTop > 0) {
        pulling.current = false;
        pullRef.current = 0;
        setPull(0);
        return;
      }
      const delta = event.touches[0].clientY - startY.current;
      if (delta > 0) {
        const next = Math.min(88, delta * 0.45);
        pullRef.current = next;
        setPull(next);
      }
    };

    const onTouchEnd = () => {
      if (!pulling.current) return;
      pulling.current = false;
      if (pullRef.current > 54) finishRefresh();
      else {
        pullRef.current = 0;
        setPull(0);
      }
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd);
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, [finishRefresh, onRefresh, refreshing]);

  return (
    <main
      ref={ref}
      className={cn(
        'app-scroll min-h-0 flex-1 overflow-y-auto overscroll-y-contain p-4 pb-[calc(5.5rem+env(safe-area-inset-bottom))] lg:p-6 lg:pb-6',
        className
      )}
    >
      <div
        className="pointer-events-none flex items-center justify-center text-slate-400 transition-all lg:hidden"
        style={{ height: refreshing ? 36 : pull, opacity: pull > 8 || refreshing ? 1 : 0 }}
        aria-hidden
      >
        <LoaderCircle size={18} className={cn(refreshing || pull > 54 ? 'animate-spin text-brand-600' : '')} />
      </div>
      {children}
    </main>
  );
}
