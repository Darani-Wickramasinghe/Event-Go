import { CameraView, useCameraPermissions } from 'expo-camera';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Action } from './FlowUI';
import ScannerPreview from './ScannerPreview';

export default function TicketScanner({ onScan, onStart, onError, disabled, startRequest }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [session, setSession] = useState(null);
  const [requesting, setRequesting] = useState(false);
  const [torch, setTorch] = useState(false);
  const activeSession = useRef(null);
  const requestingRef = useRef(false);
  const handledRequest = useRef(0);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; activeSession.current = null; };
  }, []);

  function close() {
    activeSession.current = null;
    setSession(null);
    setTorch(false);
  }

  async function start() {
    if (requestingRef.current || activeSession.current || disabled) return;
    requestingRef.current = true;
    onStart?.();
    setRequesting(true);
    try {
      const access = permission?.granted ? permission : await requestPermission();
      if (!mounted.current) return;
      if (!access.granted) {
        onError('Camera permission denied. Allow access in your device settings or enter the ticket code.');
        return;
      }
      const scanSession = Symbol('ticket scan');
      activeSession.current = scanSession;
      setSession(scanSession);
    } catch {
      if (mounted.current) onError('The camera could not be opened. Enter the ticket code.');
    } finally {
      requestingRef.current = false;
      if (mounted.current) setRequesting(false);
    }
  }

  useEffect(() => {
    if (!startRequest || handledRequest.current === startRequest) return;
    handledRequest.current = startRequest;
    start();
  }, [startRequest]);

  return (
    <>
      {session && <ScannerPreview>
        <CameraView
          style={styles.camera}
          enableTorch={torch}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            if (activeSession.current !== session) return;
            close();
            onScan(data);
          }}
          onMountError={() => {
            if (activeSession.current !== session) return;
            close();
            onError('Camera unavailable. Enter the ticket code.');
          }}
        />
      </ScannerPreview>}
      {session && <Action label={torch ? 'Turn off flashlight' : 'Turn on flashlight'} icon="flashlight-outline"
        secondary onPress={() => setTorch((current) => !current)} />}
      <Action label={session ? 'Close camera' : 'Scan QR code'} icon={session ? 'close-outline' : 'scan-outline'}
        secondary={!!session} loading={requesting} disabled={disabled} onPress={session ? close : start} />
    </>
  );
}

const styles = StyleSheet.create({ camera: { flex: 1 } });
