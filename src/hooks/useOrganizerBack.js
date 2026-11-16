import { useEffect } from 'react';
import { BackHandler } from 'react-native';

export default function useOrganizerBack(onBack, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => { onBack(); return true; });
    return () => subscription.remove();
  }, [onBack, enabled]);
}
