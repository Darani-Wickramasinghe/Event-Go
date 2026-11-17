// Lets users choose a photo and prepares it for use in a profile or event.
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRef, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Image, StyleSheet, View } from 'react-native';
import { Action, Copy, Panel } from './FlowUI';
import { colors } from '../theme';

export default function PhotoPicker({ image, hasCustomImage, onChange, onBusyChange, profile = false }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const picking = useRef(false);

  async function chooseImage() {
    if (picking.current) return;
    picking.current = true;
    setBusy(true);
    onBusyChange?.(true);
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      if (result.canceled) return;
      const asset = result.assets[0];
      const size = Math.max(asset.width, asset.height);
      const context = ImageManipulator.manipulate(asset.uri);
      try {
        const maxSize = profile ? 400 : 1000;
        if (size > maxSize) {
          context.resize(asset.width >= asset.height ? { width: maxSize } : { height: maxSize });
        }
        const rendered = await context.renderAsync();
        try {
          const photo = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
          if (!photo.base64) throw new Error('No image data');
          onChange(`data:image/jpeg;base64,${photo.base64}`);
        } finally {
          rendered.release();
        }
      } finally {
        context.release();
      }
    } catch {
      setError('This photo couldn’t be loaded. Try choosing another image.');
    } finally {
      picking.current = false;
      setBusy(false);
      onBusyChange?.(false);
    }
  }

  const label = profile ? 'profile picture' : 'cover image';
  const imageStyle = profile ? styles.avatar : styles.cover;
  return (
    <Panel title={profile ? 'Profile picture' : 'Event cover'}>
      {image ? (
        <Image source={image} accessibilityRole="image" accessibilityLabel={profile ? 'Profile picture preview' : 'Event cover preview'}
          resizeMode="cover" style={imageStyle} />
      ) : <View style={imageStyle}><Ionicons name="person-outline" size={30} color={colors.purpleDark} /></View>}
      {!profile && <Copy>{hasCustomImage ? 'Selected photo' : 'Default event cover'}</Copy>}
      <Action label={busy ? 'Preparing image…' : `${hasCustomImage ? 'Change' : 'Choose'} ${label}`}
        icon="image-outline" secondary disabled={busy} onPress={chooseImage} />
      {hasCustomImage && <Action label={`Remove ${label}`} secondary disabled={busy} onPress={() => { setError(''); onChange(null); }} />}
      {!!error && <Copy alert>{error}</Copy>}
    </Panel>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 155, borderRadius: 12, backgroundColor: colors.lavender },
  avatar: { width: 84, height: 84, borderRadius: 42, backgroundColor: colors.lavender,
    alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
});
