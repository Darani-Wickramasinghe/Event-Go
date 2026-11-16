import { StyleSheet, View } from 'react-native';
import { colors, radii } from '../theme';

export default function ScannerPreview({ children }) {
  return (
    <View style={styles.preview}>
      {children}
      <View pointerEvents="none" accessible={false} style={styles.overlay}>
        <View style={styles.frame} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { height: 230, overflow: 'hidden', position: 'relative', borderRadius: radii.md, backgroundColor: colors.text },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: { width: 150, height: 150, borderWidth: 3, borderColor: colors.surface, borderRadius: radii.md },
});
