import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet, Text, View } from 'react-native';
import EventoraMark from '../components/EventoraMark';
import { colors, headingFont } from '../theme';

const motion = Platform.OS !== 'web';

export default function LaunchScreen({ ready, fontsLoaded, onLayout, onFinish }) {
  const [entered, setEntered] = useState(false);
  const [reduced, setReduced] = useState(null);
  const opacity = useRef(new Animated.Value(1)).current;
  const entrance = useRef(new Animated.Value(0)).current;
  const finish = useRef(onFinish);
  finish.current = onFinish;

  useEffect(() => {
    let active = true;
    function update(value) {
      if (active) setReduced(value);
    }
    if (Platform.OS === 'web') {
      const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
      const change = (event) => update(event.matches);
      update(preference.matches);
      preference.addEventListener('change', change);
      return () => preference.removeEventListener('change', change);
    }
    AccessibilityInfo.isReduceMotionEnabled().then(update).catch(() => update(true));
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', update);
    return () => { active = false; subscription.remove(); };
  }, []);

  useEffect(() => {
    if (reduced === null || entered) return;
    if (reduced) {
      entrance.setValue(1);
      setEntered(true);
      return;
    }
    const animation = Animated.timing(entrance, {
      toValue: 1, duration: 620, easing: Easing.out(Easing.cubic), useNativeDriver: motion,
    });
    animation.start(({ finished }) => { if (finished) setEntered(true); });
    return () => animation.stop();
  }, [entered, entrance, reduced]);

  useEffect(() => {
    if (!ready || !entered) return;
    if (reduced) {
      finish.current();
      return;
    }
    const exit = Animated.timing(opacity, { toValue: 0, delay: 160, duration: 240, useNativeDriver: motion });
    exit.start(({ finished }) => { if (finished) finish.current(); });
    return () => exit.stop();
  }, [ready, entered, opacity, reduced]);

  return (
    <Animated.View onLayout={onLayout} accessibilityLabel="Loading Eventora" accessibilityRole="progressbar" style={[styles.screen, { opacity }]}>
      <Image source={require('../../assets/launch-glow.jpg')} style={styles.glow} resizeMode="cover" />
      <View style={styles.brand}>
        <Animated.View style={{ transform: [{ scale: entrance.interpolate({ inputRange: [0, 1], outputRange: [0.76, 1] }) }] }}>
          <EventoraMark size={62} />
        </Animated.View>
        <Animated.View style={{ opacity: entrance, transform: [{ translateX: entrance.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) }] }}>
          <Text style={[styles.wordmark, fontsLoaded && styles.customFont]}>Eventora<Text style={styles.period}>.</Text></Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FCFBFF' },
  glow: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingHorizontal: 16 },
  wordmark: { color: colors.ink, fontSize: 36, fontWeight: '800', letterSpacing: -1.6 },
  customFont: { fontFamily: headingFont },
  period: { color: '#008879' },
});
