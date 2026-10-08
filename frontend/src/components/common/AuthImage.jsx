import { useEffect, useState } from 'react';
import api from '../../services/api';

/** Normalize stored paths like /api/files/... for axios baseURL=/api */
const toApiPath = (src) => {
  if (!src) return null;
  if (/^https?:\/\//i.test(src)) return src;
  return String(src).replace(/^\/?api\//, '');
};

export default function AuthImage({ src, alt = '', className = '' }) {
  const [url, setUrl] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let objectUrl;
    let cancelled = false;

    const load = async () => {
      setFailed(false);
      setUrl(null);
      const path = toApiPath(src);
      if (!path) return;

      try {
        if (/^https?:\/\//i.test(path)) {
          if (!cancelled) setUrl(path);
          return;
        }

        const { data, headers } = await api.get(path, { responseType: 'blob' });
        const contentType = headers?.['content-type'] || '';
        if (contentType.includes('application/json')) {
          throw new Error('Invalid image response');
        }
        objectUrl = URL.createObjectURL(data);
        if (!cancelled) setUrl(objectUrl);
      } catch {
        if (!cancelled) {
          setUrl(null);
          setFailed(true);
        }
      }
    };

    load();
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [src]);

  if (!src || failed) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-[10px] text-slate-400 ${className}`}
        title={failed ? 'Photo unavailable' : undefined}
      />
    );
  }

  if (!url) {
    return <div className={`animate-pulse bg-slate-100 ${className}`} />;
  }

  return <img src={url} alt={alt} className={className} />;
}
