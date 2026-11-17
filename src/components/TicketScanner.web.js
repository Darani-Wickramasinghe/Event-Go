// Reads QR codes from browser camera frames using jsQR.
import jsQR from 'jsqr';
import { useEffect, useRef, useState } from 'react';
import { Action } from './FlowUI';
import ScannerPreview from './ScannerPreview';

export default function TicketScanner({ onScan, onStart, onError, disabled, startRequest }) {
  const [open, setOpen] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const scanning = useRef(false);
  const handledRequest = useRef(0);
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

    // Cancel QR frame checks and close the preview so effect cleanup can release the camera.
    function stop() {
      scanning.current = false;
      clearInterval(interval);
      setPreparing(false);
      setOpen(false);
    }

    function handleCameraError(error) {
      if (!active || !scanning.current) return;
      stop();
      callbacks.current.onError(error?.name === 'NotAllowedError'
        ? 'Camera permission denied. Allow browser access or enter the ticket code.'
        : 'Camera unavailable. Connect a camera or enter the ticket code.');
    }

    // Open the browser camera stream and begin looking for a QR code in its frames.
    async function start() {
      try {
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) throw new Error('Camera frames are unavailable.');
        stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: 'environment' } } });
        if (!active || !scanning.current) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        preview.srcObject = stream;
        await preview.play();
        if (!active) return;
        setPreparing(false);
        interval = setInterval(() => {
          if (!active || !scanning.current || preview.readyState < 2 || !preview.videoWidth) return;
          let ticketCode;
          try {
            canvas.width = Math.min(preview.videoWidth, 640);
            canvas.height = Math.round(preview.videoHeight * canvas.width / preview.videoWidth);
            context.drawImage(preview, 0, 0, canvas.width, canvas.height);
            const frame = context.getImageData(0, 0, canvas.width, canvas.height);
            ticketCode = jsQR(frame.data, frame.width, frame.height, { inversionAttempts: 'dontInvert' })?.data;
          } catch {
            handleCameraError();
            return;
          }
          if (!ticketCode) return;
          stop();
          callbacks.current.onScan(ticketCode);
        }, 250);
      } catch (error) {
        handleCameraError(error);
      }
    }

    start();
    return () => {
      active = false;
      clearInterval(interval);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [open]);

  function toggleCamera() {
    if (!open) {
      if (disabled || scanning.current) return;
      onStart?.();
      setPreparing(true);
    } else setPreparing(false);
    scanning.current = !open;
    setOpen(!open);
  }

  useEffect(() => {
    if (!startRequest || handledRequest.current === startRequest) return;
    handledRequest.current = startRequest;
    if (!open) toggleCamera();
  }, [startRequest]);

  return (
    <>
      {open && <ScannerPreview><video ref={video} aria-label="QR scanner camera" muted playsInline
        style={{ width: '100%', height: '100%', objectFit: 'cover' }} /></ScannerPreview>}
      <Action label={preparing ? 'Cancel camera request' : open ? 'Close camera' : 'Scan QR code'} icon={open ? 'close-outline' : 'scan-outline'}
        secondary={open} disabled={disabled} onPress={toggleCamera} />
    </>
  );
}
