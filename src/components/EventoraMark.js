import { Image } from 'react-native';

export default function EventoraMark({ size = 64 }) {
  return <Image source={require('../../assets/eventora-mark.png')} style={{ width: size, height: size }} resizeMode="contain" />;
}
