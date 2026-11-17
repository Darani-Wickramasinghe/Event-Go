// Shows sign-up and login forms for attendees and organizers.
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import EventoraLogo from '../components/EventoraLogo';
import { Action, Copy, Field, HeaderAction, Page } from '../components/FlowUI';
import { accountFormDefaults } from '../services/authService';

// Add a control to show or hide the password while typing.
function PasswordField({ label, ...props }) {
  const [visible, setVisible] = useState(false);

  return (
    <Field
      {...props}
      label={label}
      secureTextEntry={!visible}
      autoCapitalize="none"
      autoCorrect={false}
      maxLength={128}
      trailingAction={(
        <HeaderAction
          label={`${visible ? 'Hide' : 'Show'} ${label.toLowerCase()}`}
          icon={visible ? 'eye-off-outline' : 'eye-outline'}
          onPress={() => setVisible((current) => !current)}
        />
      )}
    />
  );
}

export default function AccountScreen({ signUp, role, profile, onContinue, onSwitch, onBack }) {
  const [initial] = useState(() => accountFormDefaults(profile, role, signUp));
  const [name, setName] = useState(initial.name);
  const [email, setEmail] = useState(initial.email);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState(initial.city);
  const [organization, setOrganization] = useState(initial.organization);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const title = signUp ? 'Sign up' : 'Log in';
  const organizer = role === 'organizer';

  // Validate form fields before calling the account action supplied by App.
  async function submit() {
    if (loading) return;
    setError('');

    const address = email.trim().toLowerCase();
    if (signUp && !name.trim()) return setError('Enter your full name.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return setError('Enter a valid email address.');
    if (!password) return setError('Enter your password.');
    if (password.length < 6) return setError('Password must be at least 6 characters.');
    if (signUp && password !== confirmPassword) return setError('Passwords do not match.');
    if (signUp && !city.trim()) return setError('Enter your home city.');
    if (signUp && organizer && !organization.trim()) return setError('Enter your organization name.');

    setLoading(true);
    try {
      await onContinue({
        name: name.trim(),
        email: address,
        password,
        city: city.trim(),
        organization: organization.trim(),
      });
    } catch (failure) {
      setError(failure.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Page title={title} onBack={onBack}>
      <View style={styles.brand}>
        <EventoraLogo style={styles.logo} />
      </View>
      <Copy>
        {organizer ? 'Event organizer' : 'Attendee'} · {signUp ? 'Create your cloud account. All fields are required.' : 'Log in with your registered email and password.'}
      </Copy>

      {signUp && (
        <Field
          label="Full name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          autoComplete={signUp ? 'off' : 'name'}
          maxLength={70}
          editable={!loading}
        />
      )}

      <Field
        label="Email address"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="email-address"
        autoComplete={signUp ? 'off' : 'email'}
        placeholder="name@example.com"
        maxLength={120}
        editable={!loading}
      />

      <PasswordField
        label="Password"
        value={password}
        onChangeText={setPassword}
        placeholder="Minimum 6 characters"
        editable={!loading}
        onSubmitEditing={signUp ? undefined : submit}
      />

      {signUp && (
        <PasswordField
          label="Confirm password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          placeholder="Re-enter your password"
          editable={!loading}
          onSubmitEditing={submit}
        />
      )}

      {signUp && (
        <Field
          label="Home city"
          value={city}
          onChangeText={setCity}
          autoCapitalize="words"
          placeholder="e.g. Kelaniya"
          maxLength={50}
          editable={!loading}
        />
      )}

      {signUp && organizer && (
        <Field
          label="Organization name"
          value={organization}
          onChangeText={setOrganization}
          autoCapitalize="words"
          placeholder="e.g. ACM Student Chapter"
          maxLength={80}
          editable={!loading}
        />
      )}

      {!!error && <Copy alert>{error}</Copy>}

      <Action
        label={loading ? 'Please wait…' : (signUp ? 'Create account' : 'Log in')}
        icon="arrow-forward"
        onPress={submit}
        disabled={loading}
      />

      <Action
        label={signUp ? 'Already have an account? Log in' : 'New here? Sign up'}
        secondary
        onPress={onSwitch}
        disabled={loading}
      />
    </Page>
  );
}

const styles = StyleSheet.create({
  brand: { alignItems: 'center', paddingVertical: 10 },
  logo: { width: 216, maxWidth: '100%', height: 72 },
});
