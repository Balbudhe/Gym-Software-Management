import { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((message, type = 'success') => {
    const id = Date.now() + Math.random();
    const duration = String(message || '').length > 80 ? 8000 : 3200;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ push }}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(5.25rem+env(safe-area-inset-bottom))] z-[80] flex flex-col items-center gap-2 px-3 lg:inset-x-auto lg:bottom-auto lg:right-4 lg:top-4 lg:w-[min(28rem,calc(100vw-2rem))] lg:items-stretch lg:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto w-full max-w-md rounded-2xl border px-4 py-3 text-sm leading-5 shadow-lg lg:max-w-none lg:rounded-lg ${
              toast.type === 'error'
                ? 'border-red-200 bg-red-50 text-red-800'
                : 'border-emerald-200 bg-white text-slate-800'
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);
