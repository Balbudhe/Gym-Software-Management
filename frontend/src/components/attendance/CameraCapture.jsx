import { useEffect, useRef, useState } from 'react';
import Button from '../ui/Button';

export default function CameraCapture({ onCapture, onCancel, title = 'Capture photo' }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [error, setError] = useState('');
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch {
        setError('Camera access is required to mark attendance.');
      }
    }
    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  function snap() {
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        const file = new File([blob], `attendance-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPreview({ file, url: URL.createObjectURL(blob) });
      },
      'image/jpeg',
      0.9
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm font-medium text-slate-800">{title}</p>
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!preview ? (
        <>
          <video ref={videoRef} autoPlay playsInline className="aspect-video w-full rounded-xl bg-black object-cover" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onCancel}>Cancel</Button>
            <Button onClick={snap} disabled={!!error}>Capture</Button>
          </div>
        </>
      ) : (
        <>
          <img src={preview.url} alt="Preview" className="aspect-video w-full rounded-xl object-cover" />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPreview(null)}>Retake</Button>
            <Button onClick={() => onCapture(preview.file)}>Confirm</Button>
          </div>
        </>
      )}
    </div>
  );
}
