// Shows attendance progress as a bar and exposes its percentage to assistive technology.
import { StyleSheet, View } from 'react-native';
import { colors, radii } from '../theme';

export default function AttendanceProgress({ value }) {
  return (
    <View accessibilityRole="progressbar" accessibilityLabel="Attendance rate"
      accessibilityValue={{ min: 0, max: 100, now: value }} style={styles.track}>
      <View style={[styles.fill, { width: `${value}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: { height: 8, borderRadius: radii.pill, overflow: 'hidden', backgroundColor: colors.lavender },
  fill: { height: '100%', backgroundColor: colors.primary },
});
