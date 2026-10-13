import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

export default function ScrollMain({ children }) {
  const ref = useRef(null);
  const { pathname } = useLocation();

  useEffect(() => {
    ref.current?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <main ref={ref} className="min-h-0 flex-1 overflow-y-auto p-4 lg:p-6">
      {children}
    </main>
  );
}
