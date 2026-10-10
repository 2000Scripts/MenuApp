import React, { useState } from 'react';
import { Alert, Button, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity } from 'react-native';
import type { StackScreenProps } from '@react-navigation/stack';
import { requireSupabaseConfig, supabase } from './src/lib/supabase';
import type { RootStackParamList } from './src/navigation';

type Props = StackScreenProps<RootStackParamList, 'ConfirmEmail'>;

export default function ConfirmEmailScreen({ route, navigation }: Props) {
  const { email } = route.params;
  const [token, setToken] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);

  const confirm = async () => {
    const code = token.trim();
    if (code.length !== 6) {
      Alert.alert('Enter your code', 'Use the six-digit code from the confirmation email.');
      return;
    }
    try {
      setVerifying(true);
      requireSupabaseConfig();
      const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'signup' });
      if (error) throw error;
      // Verification creates a session; App.tsx then routes to the authenticated app.
    } catch (error) {
      Alert.alert('Could not verify email', error instanceof Error ? error.message : 'Check the code and try again.');
    } finally {
      setVerifying(false);
    }
  };

  const resend = async () => {
    try {
      setResending(true);
      requireSupabaseConfig();
      const { error } = await supabase.auth.resend({ email, type: 'signup' });
      if (error) throw error;
      Alert.alert('Code sent', `A new confirmation code was sent to ${email}.`);
    } catch (error) {
      Alert.alert('Could not resend code', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text style={styles.title}>Confirm your email</Text>
      <Text style={styles.message}>Enter the six-digit code sent to {email}.</Text>
      <TextInput
        style={styles.codeInput}
        value={token}
        onChangeText={value => setToken(value.replace(/\D/g, '').slice(0, 6))}
        placeholder="000000"
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        maxLength={6}
        accessibilityLabel="Email confirmation code"
      />
      <Button title={verifying ? 'Verifying…' : 'Confirm email'} onPress={confirm} disabled={verifying || resending} />
      <TouchableOpacity onPress={resend} disabled={resending || verifying}>
        <Text style={styles.link}>{resending ? 'Sending a new code…' : 'Resend confirmation code'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => navigation.navigate('Login')}>
        <Text style={styles.link}>Back to login</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E6E6FA' },
  contentContainer: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 16 },
  title: { fontSize: 26, fontWeight: '700', color: '#26243a', textAlign: 'center' },
  message: { color: '#4b4960', textAlign: 'center', lineHeight: 21 },
  codeInput: {
    alignSelf: 'center',
    width: 220,
    borderWidth: 1,
    borderColor: '#77738f',
    borderRadius: 12,
    backgroundColor: 'white',
    padding: 14,
    fontSize: 26,
    letterSpacing: 8,
    textAlign: 'center',
  },
  link: { marginTop: 8, textAlign: 'center', color: '#007bff' },
});