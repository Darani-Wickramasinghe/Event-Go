// Wraps screen header content in the shared purple layout.
import { StyleSheet, View } from 'react-native';
import { colors } from '../theme';

export default function PurpleHeader({ children, style }) {
  return (
    <View style={[styles.header, style]}>
      <View pointerEvents="none" style={styles.outerRing} />
      <View pointerEvents="none" style={styles.innerRing} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.purple, borderBottomLeftRadius: 29, borderBottomRightRadius: 29,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 34, overflow: 'hidden',
  },
  outerRing: {
    position: 'absolute', width: 235, height: 235, borderRadius: 118, borderWidth: 1,
    borderColor: '#786BF1', right: -56, top: -96,
  },
  innerRing: {
    position: 'absolute', width: 177, height: 177, borderRadius: 89, borderWidth: 1,
    borderColor: '#786BF1', right: -27, top: -67,
  },
});
