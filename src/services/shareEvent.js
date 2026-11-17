// Builds a shareable event link and opens the platform's sharing options.
import { Platform, Share } from 'react-native';

export async function shareEventLink(event) {
  if (Platform.OS !== 'web') {
    await Share.share({ message: `${event.title} · ${event.date}\n${event.venue}, ${event.city}\neventora://event/${event.id}` });
    return '';
  }

  const url = new URL(window.location.href);
  url.searchParams.set('event', event.id);
  if (navigator.share) {
    await navigator.share({ title: event.title, url: url.toString() });
    return '';
  }
  if (navigator.clipboard) {
    await navigator.clipboard.writeText(url.toString());
    return 'Event link copied.';
  }
  return url.toString();
}
