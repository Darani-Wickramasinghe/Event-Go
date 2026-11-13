import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Action, Copy, Field, Page } from '../components/FlowUI';
import { colors, headingFont } from '../theme';

export default function AccountScreen({ signUp, profile, onContinue, onSwitch, onBack }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? '');
  const [error, setError] = useState('');
  const title = signUp ? 'Sign up' : 'Log in';

  function submit() {
    const address = email.trim().toLowerCase();
    if (signUp && !name.trim()) return setError('Enter your display name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError('Enter a valid email address.');
    try {
      onContinue({ name: name.trim(), email: address });
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <Page title={title} onBack={onBack}>
      <View style={styles.brand}>
        <View style={styles.mark}><Ionicons name="ticket-outline" size={30} color={colors.white} /></View>
        <Text style={styles.wordmark}>Eventora</Text>
      </View>
      <Copy>{signUp ? 'Create a demo profile on this device. Use a sample email.' : 'Enter the email you used to set up your demo profile on this device.'}</Copy>
      {signUp && <Field label="Display name" value={name} onChangeText={setName} autoCapitalize="words" maxLength={70} />}
      <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
        keyboardType="email-address" autoComplete="email" placeholder="name@example.com" maxLength={120} onSubmitEditing={submit} />
      {!!error && <Copy alert>{error}</Copy>}
      <Action label={signUp ? 'Create demo account' : 'Log in to demo'} icon="arrow-forward" onPress={submit} />
      {(!signUp || profile.email || !profile.name) && (
        <Action label={signUp ? 'Already have an account? Log in' : profile.name && !profile.email ? 'Finish setting up your profile' : 'New here? Sign up'} secondary onPress={onSwitch} />
      )}
    </Page>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', gap: 12, paddingVertical: 16 },
  mark: { width: 64, height: 64, borderRadius: 21, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.action },
  wordmark: { color: colors.ink, fontFamily: headingFont, fontSize: 25 },
});
