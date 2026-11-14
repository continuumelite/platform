import { useState } from 'react';
import { KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BRAND_VALUES, Wordmark } from '@/components/brand';
import { Button, Input } from '@/components/ui';
import { BrandFonts, MaxContentWidth, Spacing } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

export default function SignInScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function signIn() {
    setError(null);
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setLoading(false);
    // On success the session listener switches to the signed-in screens.
    if (error) setError('That email and password don’t match an account.');
  }

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.content}
        >
          <View style={styles.header}>
            <Wordmark />
            <View style={styles.values}>
              {BRAND_VALUES.map((v) => (
                <ThemedText
                  key={v}
                  type="small"
                  themeColor={v === 'continuum' ? 'accent' : 'textSecondary'}
                  style={[styles.value, v === 'continuum' && styles.valueAccent]}
                >
                  {v}
                </ThemedText>
              ))}
            </View>
            <ThemedText type="serifItalic">Continuum Elite</ThemedText>
            <ThemedText type="subtitle" themeColor="accent">
              Sign in to see today’s plan.
            </ThemedText>
          </View>

          <View style={styles.form}>
            <Input
              placeholder="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            <Input
              placeholder="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="current-password"
              textContentType="password"
              onSubmitEditing={signIn}
            />
            {error && <ThemedText style={styles.error}>{error}</ThemedText>}
            <Button title="Sign in" onPress={signIn} loading={loading} />
          </View>

          <ThemedText type="small" themeColor="textSecondary" style={styles.footer}>
            New here? Use the invitation link from your coach to create your account.
          </ThemedText>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1, alignItems: 'center' },
  content: {
    flex: 1,
    width: '100%',
    maxWidth: 420,
    justifyContent: 'center',
    paddingHorizontal: Spacing.four,
    gap: Spacing.five,
  },
  header: { gap: Spacing.three },
  values: { flexDirection: 'row', flexWrap: 'wrap', marginVertical: Spacing.two },
  value: {
    width: '50%',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#8A8988',
  },
  valueAccent: { fontFamily: BrandFonts.serifItalic },
  form: { gap: Spacing.three, maxWidth: MaxContentWidth },
  error: { color: '#dc2626', fontSize: 14 },
  footer: { textAlign: 'center' },
});
