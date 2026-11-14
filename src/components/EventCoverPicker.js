import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useRef, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { Action, Copy, Panel } from './FlowUI';
import { colors } from '../theme';

export default function EventCoverPicker({ image, hasCustomCover, onChange, onBusyChange }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const picking = useRef(false);

  async function chooseImage() {
    if (picking.current) return;
    picking.current = true;
    setBusy(true);
    onBusyChange(true);
    setError('');
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'] });
      if (result.canceled) return;
      const asset = result.assets[0];
      const size = Math.max(asset.width, asset.height);
      const context = ImageManipulator.manipulate(asset.uri);
      try {
        if (size > 1000) {
          context.resize(asset.width >= asset.height ? { width: 1000 } : { height: 1000 });
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
      onBusyChange(false);
    }
  }

  return (
    <Panel title="Event cover">
      <Image source={image} accessibilityRole="image" accessibilityLabel="Event cover preview" resizeMode="cover" style={styles.cover} />
      <Copy>{hasCustomCover ? 'Selected photo' : 'Default event cover'}</Copy>
      <Action label={busy ? 'Preparing image…' : hasCustomCover ? 'Change cover image' : 'Choose cover image'}
        icon="image-outline" secondary disabled={busy} onPress={chooseImage} />
      {hasCustomCover && <Action label="Remove cover image" secondary disabled={busy} onPress={() => { setError(''); onChange(null); }} />}
      {!!error && <Copy alert>{error}</Copy>}
    </Panel>
  );
}

const styles = StyleSheet.create({
  cover: { width: '100%', height: 155, borderRadius: 12, backgroundColor: colors.lavender },
});
