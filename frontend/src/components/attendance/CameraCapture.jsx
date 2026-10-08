import { useEffect, useRef, useState } from 'react';

export default function CameraCapture({
  open,
  title,
  onClose,
  onCapture,
  helper,
  confirmDisabled = false,
  confirmLabel = 'Confirm',
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const stop = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const start = async () => {
    setError('');
    setPreview(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      setError('Camera access was denied. Allow camera permission and try again.');
    }
  };

  useEffect(() => {
    if (open) start();
    return () => stop();
  }, [open]);

  const capture = () => {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setPreview({ blob, url });
      stop();
    }, 'image/jpeg', 0.9);
  };

  const confirm = async () => {
    if (!preview?.blob || confirmDisabled || saving) return;
    setSaving(true);
    try {
      await onCapture(preview.blob);
      URL.revokeObjectURL(preview.url);
      setPreview(null);
      onClose();
    } catch (captureError) {
      setError(captureError.message || 'Could not save. Try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40" onClick={() => { stop(); onClose(); }} />
      <div className="relative w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold">{title}</h2>
        {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
        {!preview ? (
          <video ref={videoRef} autoPlay playsInline className="aspect-video w-full rounded-lg bg-slate-900" onLoadedMetadata={() => {}} />
        ) : (
          <img src={preview.url} alt="Preview" className="aspect-video w-full rounded-lg object-cover" />
        )}
        {helper ? <p className="mt-3 text-xs text-slate-500">{helper}</p> : null}
        <div className="mt-4 flex justify-end gap-2">
          {!preview ? (
            <>
              <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={start}>
                Open Camera
              </button>
              <button type="button" className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white" onClick={capture}>
                Capture
              </button>
            </>
          ) : (
            <>
              <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => { setPreview(null); start(); }}>
                Retake
              </button>
              <button
                type="button"
                className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white"
                onClick={confirm}
                disabled={confirmDisabled || saving}
              >
                {saving ? 'Saving...' : confirmLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
