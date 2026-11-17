// Renders the Eventora logo as a reusable image.
import { Image } from 'react-native';

export default function EventoraLogo({ style }) {
  return (
    <Image accessibilityRole="image" accessibilityLabel="Eventora logo"
      source={require('../../assets/eventora-launch-logo.png')} style={style} resizeMode="contain" />
  );
}
