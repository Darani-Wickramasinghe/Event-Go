// Provides shared event covers, status badges, and detail rows for organizer screens.
import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { Badge } from './FlowUI';
import { colors, iconSizes, spacing, typography } from '../theme';

const statusBadges = {
  Published: ['Published', 'success'],
  Rescheduled: ['Rescheduled', 'warning'],
  Closed: ['Registration closed', 'neutral'],
  Completed: ['Completed', 'neutral'],
  Draft: ['Draft', 'neutral'],
  Cancelled: ['Cancelled', 'error'],
  Archived: ['Archived', 'neutral'],
};

export function OrganizerEventBadge({ status }) {
  const [label, tone] = statusBadges[status] ?? [status || 'Status unavailable', 'neutral'];
  return <Badge label={label} tone={tone} />;
}

export function OrganizerEventImage({ source, style, iconSize = iconSizes.md }) {
  const [failedSource, setFailedSource] = useState(null);
  return source && failedSource !== source
    ? <Image source={source} resizeMode="cover" style={style} onError={() => setFailedSource(source)} />
    : <View style={[style, styles.fallback]}><Ionicons name="image-outline" size={iconSize} color={colors.purpleDark} /></View>;
}

export function OrganizerEventFact({ icon, children }) {
  return (
    <View style={styles.fact}>
      <Ionicons name={icon} size={iconSizes.sm} color={colors.purpleDark} />
      <Text style={styles.factText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.lavender },
  fact: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  factText: { ...typography.label, flexShrink: 1, minWidth: 0, color: colors.textSecondary },
});
