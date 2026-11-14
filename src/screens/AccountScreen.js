import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import EventoraLogo from '../components/EventoraLogo';
import { Action, Copy, Field, Page } from '../components/FlowUI';

export default function AccountScreen({ signUp, role, profile, onContinue, onSwitch, onBack }) {
  const [name, setName] = useState(profile.name);
  const [email, setEmail] = useState(profile.email ?? '');
  const [city, setCity] = useState(profile.name ? profile.city : '');
  const [organization, setOrganization] = useState(profile.organization ?? '');
  const [error, setError] = useState('');
  const title = signUp ? 'Sign up' : 'Log in';
  const organizer = role === 'organizer';

  function submit() {
    const address = email.trim().toLowerCase();
    if (signUp && !name.trim()) return setError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError('Enter a valid email address.');
    if (signUp && !city.trim()) return setError('Enter your home city.');
    if (signUp && organizer && !organization.trim()) return setError('Enter your organization name.');
    try {
      onContinue({ name: name.trim(), email: address, city: city.trim(), organization: organization.trim() });
    } catch (failure) {
      setError(failure.message);
    }
  }

  return (
    <Page title={title} onBack={onBack}>
      <View style={styles.brand}>
        <EventoraLogo style={styles.logo} />
      </View>
      <Copy>{organizer ? 'Event organizer' : 'Attendee'} · {signUp ? 'Create a demo profile on this device. All fields are required.' : 'Use the email from your demo profile on this device.'}</Copy>
      {signUp && <Field label="Full name" value={name} onChangeText={setName} autoCapitalize="words" autoComplete="name" maxLength={70} />}
      <Field label="Email address" value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false}
        keyboardType="email-address" autoComplete="email" placeholder="name@example.com" maxLength={120} onSubmitEditing={submit} />
      {signUp && <Field label="Home city" value={city} onChangeText={setCity} autoCapitalize="words" placeholder="e.g. Kelaniya" maxLength={50} />}
      {signUp && organizer && <Field label="Organization name" value={organization} onChangeText={setOrganization} autoCapitalize="words" maxLength={80} />}
      {!!error && <Copy alert>{error}</Copy>}
      <Action label={signUp ? 'Create demo account' : 'Log in to demo'} icon="arrow-forward" onPress={submit} />
      <Action label={signUp ? 'Already have an account? Log in' : profile.name && !profile.email ? 'Finish setting up your profile' : 'New here? Sign up'} secondary onPress={onSwitch} />
    </Page>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', paddingVertical: 10 },
  logo: { width: 216, maxWidth: '100%', height: 72 },
});
