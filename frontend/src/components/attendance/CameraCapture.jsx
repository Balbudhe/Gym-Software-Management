import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Camera, Check, ImagePlus, RefreshCw, ShieldAlert, X } from 'lucide-react';
import { cn } from '../../utils/format';
import { haptic } from '../../utils/haptics';

const isSecureCameraContext = () => {
  if (typeof window === 'undefined') return false;
  if (window.isSecureContext) return true;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
};

const describeCameraError = (error) => {
  const name = error?.name || '';
  const message = String(error?.message || '');
  const protocol = typeof window !== 'undefined' ? window.location.protocol : '';
  const host = typeof window !== 'undefined' ? window.location.host : '';

  if (!isSecureCameraContext() || protocol === 'http:') {
    return `Camera is blocked on HTTP. On your phone open: https://${host || 'YOUR-PC-IP:5173'} (tap Advanced → Proceed), then try again.`;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return 'Live camera is not available in this browser. Use “Take photo” below.';
  }
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return 'Camera permission is blocked for this site. Allow Camera in browser settings, or use “Take photo” below.';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return 'No camera found. Use “Take photo” below.';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'Camera is busy in another app. Close it, or use “Take photo” below.';
  }
  if (name === 'SecurityError') {
    return `Browser blocked camera for security. Use HTTPS (${protocol}//${host}) or “Take photo” below.`;
  }
  if (message) return `${message} You can also use “Take photo” below.`;
  return 'Could not open live camera. Use “Take photo” below.';
};

export default function CameraCapture({
  open,
  title,
  onClose,
  onCapture,
  helper,
  confirmDisabled = false,
  confirmLabel = 'Confirm & save',
}) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileInputRef = useRef(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [saving, setSaving] = useState(false);
  const [starting, setStarting] = useState(false);
  const [live, setLive] = useState(false);

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setLive(false);
  }, []);

  const setPreviewSafe = useCallback((next) => {
    setPreview((current) => {
      if (current?.url && current.url !== next?.url) {
        URL.revokeObjectURL(current.url);
      }
      return next;
    });
  }, []);

  const clearPreview = useCallback(() => {
    setPreviewSafe(null);
  }, [setPreviewSafe]);

  const attachStream = useCallback(async (stream) => {
    streamRef.current = stream;
    for (let i = 0; i < 12; i += 1) {
      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        try {
          await video.play();
        } catch {
          // Frames can still be captured.
        }
        setLive(true);
        return true;
      }
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    return false;
  }, []);

  const startLiveCamera = useCallback(async () => {
    setError('');
    setInfo('');
    clearPreview();
    stop();

    if (!isSecureCameraContext()) {
      setError(describeCameraError({ name: 'SecurityError' }));
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setError(describeCameraError({ name: 'NotSupportedError' }));
      return;
    }

    setStarting(true);
    setInfo('Requesting camera permission…');

    const attempts = [
      { audio: false, video: true },
      { audio: false, video: { facingMode: 'user' } },
      {
        audio: false,
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
    ];

    let lastError = null;
    for (const constraints of attempts) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        const attached = await attachStream(stream);
        if (!attached) {
          stream.getTracks().forEach((t) => t.stop());
          throw new Error('Camera opened but preview could not start. Try Take photo.');
        }
        setInfo('Camera ready — tap Capture photo.');
        setStarting(false);
        haptic(10);
        return;
      } catch (err) {
        lastError = err;
        stop();
      }
    }

    setError(describeCameraError(lastError));
    setInfo('');
    setStarting(false);
  }, [attachStream, clearPreview, stop]);

  const openNativeCamera = () => {
    setError('');
    setInfo('Opening your phone camera…');
    fileInputRef.current?.click();
  };

  const onNativePhoto = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) {
      setInfo('No photo selected. Try again.');
      return;
    }
    stop();
    const url = URL.createObjectURL(file);
    setPreviewSafe({ blob: file, url });
    setInfo('Photo ready — tap Confirm & save below.');
    setError('');
    haptic(12);
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video || !streamRef.current) {
      setError('Live camera is not ready. Tap Open live camera, or use Take photo.');
      return;
    }
    const width = video.videoWidth || 0;
    const height = video.videoHeight || 0;
    if (!width || !height) {
      setError('Preview is still loading. Wait a moment, then tap Capture photo.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, width, height);

    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setError('Could not capture photo. Try Take photo instead.');
          return;
        }
        const url = URL.createObjectURL(blob);
        stop();
        setPreviewSafe({ blob, url });
        setInfo('Photo captured — tap Confirm & save below.');
        setError('');
        haptic(12);
      },
      'image/jpeg',
      0.92
    );
  };

  const confirm = async () => {
    if (!preview?.blob || saving) return;
    setSaving(true);
    setError('');
    setInfo(confirmDisabled ? 'Saving… fetching GPS if needed.' : 'Saving attendance…');
    try {
      await onCapture(preview.blob);
      clearPreview();
      haptic([10, 30, 10]);
      onClose();
    } catch (captureError) {
      setError(captureError.message || 'Could not save. Try again.');
      setInfo('Photo is kept — fix the issue and tap Confirm & save again.');
      haptic(40);
    } finally {
      setSaving(false);
    }
  };

  const close = () => {
    stop();
    clearPreview();
    setError('');
    setInfo('');
    onClose();
  };

  useEffect(() => {
    if (!open) return undefined;
    setError('');
    setInfo(
      isSecureCameraContext()
        ? 'Tap Open live camera (Allow when asked), or Take photo.'
        : describeCameraError({ name: 'SecurityError' })
    );
    setStarting(false);
    setLive(false);
    clearPreview();
    return () => stop();
  }, [open, stop, clearPreview]);

  if (!open || typeof document === 'undefined') return null;

  const insecure = !isSecureCameraContext();
  const hasPreview = Boolean(preview?.url);

  // Portal to body so bottom tab bar (z-50) cannot cover Confirm.
  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-stretch justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/80"
        aria-label="Close camera"
        onClick={close}
      />

      <div className="relative flex h-full w-full max-w-lg flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90dvh] sm:rounded-3xl">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-400">
              {hasPreview ? 'Review photo' : 'Camera'}
            </p>
            <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={close}
            className="rounded-full border border-slate-200 p-2 text-slate-500"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {insecure ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm text-red-900">
              You are on <strong>{window.location.protocol}//{window.location.host}</strong>. Use{' '}
              <strong>https://</strong> then retry.
            </div>
          ) : null}

          {error ? (
            <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
              <ShieldAlert size={16} className="mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          ) : null}

          {info ? <p className="text-xs leading-5 text-slate-500">{info}</p> : null}

          <div className="relative overflow-hidden rounded-2xl bg-slate-950">
            {!hasPreview ? (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className={cn(
                    'mx-auto aspect-[3/4] max-h-[min(48dvh,420px)] w-full bg-slate-950 object-cover sm:aspect-video sm:max-h-[50dvh]',
                    live ? 'opacity-100' : 'opacity-30'
                  )}
                  style={{ transform: 'scaleX(-1)' }}
                />
                {!live ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-white">
                    <Camera size={28} className="text-white/80" />
                    <p className="text-sm font-medium">
                      {starting ? 'Waiting for permission…' : 'Camera preview'}
                    </p>
                    <p className="text-xs text-white/60">Tap Open live camera — allow when asked</p>
                  </div>
                ) : null}
              </>
            ) : (
              <img
                src={preview.url}
                alt="Captured preview"
                className="mx-auto max-h-[min(50dvh,440px)] w-full object-contain"
              />
            )}
          </div>

          {helper ? <p className="text-xs leading-5 text-slate-500">{helper}</p> : null}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="user"
            className="hidden"
            onChange={onNativePhoto}
          />
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {!hasPreview ? (
            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-slate-200 px-3 py-3.5 text-sm font-medium text-slate-700"
                  onClick={startLiveCamera}
                  disabled={starting || insecure}
                >
                  <RefreshCw size={15} className={starting ? 'animate-spin' : ''} />
                  {starting ? 'Opening…' : 'Open live camera'}
                </button>
                <button
                  type="button"
                  className="flex-[1.15] rounded-2xl bg-slate-900 px-3 py-3.5 text-sm font-semibold text-white disabled:opacity-50"
                  onClick={capture}
                  disabled={!live || starting}
                >
                  Capture photo
                </button>
              </div>
              <button
                type="button"
                onClick={openNativeCamera}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-brand-200 bg-brand-50 px-3 py-3.5 text-sm font-semibold text-brand-700"
              >
                <ImagePlus size={16} />
                Take photo (phone camera)
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-center text-xs font-medium text-emerald-700">
                Photo ready. Confirm to save attendance.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="flex-1 rounded-2xl border border-slate-200 px-4 py-3.5 text-sm font-medium text-slate-700"
                  onClick={() => {
                    clearPreview();
                    setInfo('Choose Open live camera or Take photo.');
                    setError('');
                  }}
                  disabled={saving}
                >
                  Retake
                </button>
                <button
                  type="button"
                  className="inline-flex flex-[1.4] items-center justify-center gap-2 rounded-2xl bg-brand-600 px-4 py-3.5 text-sm font-semibold text-white disabled:opacity-60"
                  onClick={confirm}
                  disabled={saving}
                >
                  <Check size={16} />
                  {saving ? 'Saving…' : confirmLabel || 'Confirm & save'}
                </button>
              </div>
              {confirmDisabled && !saving ? (
                <p className="text-center text-[11px] text-amber-700">
                  GPS is still loading — you can still tap Confirm & save.
                </p>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
