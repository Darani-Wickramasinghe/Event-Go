import { Linking } from 'react-native';
import { buildDirectionsUrl } from './directionsUrl';

// Opens the external navigation app. Resolves { ok: false } instead of throwing,
// so the UI can fall back to showing the venue address.
export async function openDirections(args) {
  try {
    await Linking.openURL(buildDirectionsUrl(args));
    return { ok: true };
  } catch (e) {
    return { ok: false };
  }
}