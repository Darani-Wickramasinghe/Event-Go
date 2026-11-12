import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { Action } from './FlowUI';

export default function TicketScanner({ onScan, onError }) {
  const [open, setOpen] = useState(false);
  const video = useRef(null);
  const callbacks = useRef({ onScan, onError });
  callbacks.current = { onScan, onError };

  useEffect(() => {
    if (!open) return;
    let active = true;
    let stream;
    let interval;
    const preview = video.current;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d', { willReadFrequently: true });

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
        if (!active) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        preview.srcObject = stream;
        await preview.play();
        if (!active) return;
        interval = setInterval(() => {
          if (preview.readyState < 2 || !preview.videoWidth) return;
          canvas.width = Math.min(preview.videoWidth, 640);
          canvas.height = Math.round(preview.videoHeight * canvas.width / preview.videoWidth);
          context.drawImage(preview, 0, 0, canvas.width, canvas.height);
          const frame = context.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' });
          if (!code?.data) return;
          clearInterval(interval);
          setOpen(false);
          callbacks.current.onScan(code.data);
        }, 250);
      } catch {
        if (!active) return;
        setOpen(false);
        callbacks.current.onError('Camera unavailable. Allow browser camera access or enter the ticket code below.');
      }
    }

    start();
    return () => {
      active = false;
      clearInterval(interval);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  return (
    <>
      {open && <video ref={video} aria-label="QR scanner camera" muted playsInline style={{ width: '100%', height: 230, borderRadius: 12, background: '#171833', objectFit: 'cover' }} />}
      <Action label={open ? 'Close camera' : 'Scan QR code'} secondary onPress={() => setOpen(!open)} />
    </>
  );
}
