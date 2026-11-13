import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet, View } from 'react-native';
import { colors } from '../theme';

const launchDuration = 5000;

export default function LaunchScreen({ ready, onLayout, onFinish }) {
  const [elapsed, setElapsed] = useState(false);
  const [reduced, setReduced] = useState(true);
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => setElapsed(true), launchDuration);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') {
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
      const change = (event) => setReduced(event.matches);
      setReduced(preference.matches);
      preference.addEventListener('change', change);
      return () => preference.removeEventListener('change', change);
    }
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduced(value);
    }).catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduced) return;
    const rotation = Animated.loop(Animated.timing(spin, {
      toValue: 1,
      duration: 1000,
      easing: Easing.linear,
      useNativeDriver: Platform.OS !== 'web',
      isInteraction: false,
    }));
    rotation.start();
    return () => { rotation.stop(); spin.setValue(0); };
  }, [reduced, spin]);

  useEffect(() => {
    if (elapsed && ready) onFinish();
  }, [elapsed, ready, onFinish]);

  return (
    <View onLayout={onLayout} accessibilityLabel="Loading Eventora" accessibilityRole="progressbar" style={styles.screen}>
      <View style={styles.brand}>
        <Image source={require('../../assets/eventora-launch-logo.png')} style={styles.logo} resizeMode="contain" />
        <Animated.View style={[styles.ring, {
          transform: [{ rotate: spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) }],
        }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.white },
  brand: { width: '76%', maxWidth: 300, alignItems: 'center', gap: 24 },
  logo: { width: '100%', height: 96 },
  ring: { width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: colors.lavender, borderTopColor: colors.action },
});
