import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Action } from './FlowUI';

export default function TicketScanner({ onScan, onError }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [open, setOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const accepted = useRef(false);

  async function start() {
    setRequesting(true);
    try {
      const access = permission?.granted ? permission : await requestPermission();
      if (!access.granted) {
        onError('Camera access is unavailable. Enter the ticket code below.');
        return;
      }
      accepted.current = false;
      setOpen(true);
    } catch {
      onError('The camera could not be opened. Enter the ticket code below.');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <>
      {open && (
        <CameraView
          style={styles.camera}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
          onBarcodeScanned={({ data }) => {
            if (accepted.current) return;
            accepted.current = true;
            setOpen(false);
            onScan(data);
          }}
          onMountError={() => {
            setOpen(false);
            onError('Camera unavailable. Enter the ticket code below.');
          }}
        />
      )}
      <Action label={open ? 'Close camera' : 'Scan QR code'} secondary disabled={requesting} onPress={open ? () => setOpen(false) : start} />
    </>
  );
}

const styles = StyleSheet.create({ camera: { height: 230, borderRadius: 12, overflow: 'hidden' } });
