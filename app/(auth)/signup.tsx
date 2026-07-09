import * as Linking from 'expo-linking';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { Button, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { useNetworkStatus } from '@/context/NetworkStatusContext';
import { authRoute, normalizeInternalNext } from '@/lib/authNavigation';
import { formatAuthError } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

const signupSchema = z.object({
  displayName: z.string().min(2, 'Enter your name.'),
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const nextPath = normalizeInternalNext(next);
  const { isOffline } = useNetworkStatus();
  const [confirmationSent, setConfirmationSent] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<SignupForm>({
    defaultValues: {
      displayName: '',
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: SignupForm) {
    setConfirmationSent(false);
    if (isOffline) {
      setError('email', {
        message: 'Reconnect before creating your account. Nothing was sent.',
      });
      return;
    }
    const parsed = signupSchema.safeParse(values);

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        setError(issue.path[0] as keyof SignupForm, { message: issue.message });
      });
      return;
    }

    try {
      const emailRedirectTo = Linking.createURL('/onboarding', {
        queryParams: nextPath ? { next: String(nextPath) } : undefined,
      });
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo,
          data: {
            display_name: parsed.data.displayName,
          },
        },
      });

      if (error) {
        setError('email', { message: formatAuthError(error) });
        return;
      }

      if (data.session) {
        router.replace(authRoute('/onboarding', nextPath));
      } else {
        setConfirmationSent(true);
      }
    } catch (error) {
      setError('email', { message: formatAuthError(error) });
      return;
    }
  }

  return (
    <AuthFormShell
      title="Create your account"
      subtitle="Create your login, then build a reusable Lance profile."
      footer={
        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Link href={authRoute('/login', nextPath)} style={styles.link}>
            Log in
          </Link>
        </Text>
      }>
      <Controller
        control={control}
        name="displayName"
        render={({ field: { onBlur, onChange, value } }) => (
          <TextField
            autoCapitalize="words"
            error={errors.displayName?.message}
            label="Display name"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="Alex Carter"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="email"
        render={({ field: { onBlur, onChange, value } }) => (
          <TextField
            autoCapitalize="none"
            autoComplete="email"
            error={errors.email?.message}
            inputMode="email"
            label="Email"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="you@example.com"
            value={value}
          />
        )}
      />
      <Controller
        control={control}
        name="password"
        render={({ field: { onBlur, onChange, value } }) => (
          <TextField
            autoCapitalize="none"
            error={errors.password?.message}
            label="Password"
            onBlur={onBlur}
            onChangeText={onChange}
            placeholder="At least 8 characters"
            secureTextEntry
            value={value}
          />
        )}
      />
      <Button
        disabled={isOffline}
        label={isOffline ? 'Reconnect to sign up' : 'Sign up'}
        loading={isSubmitting}
        onPress={handleSubmit(onSubmit)}
      />
      {confirmationSent ? (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          {String(nextPath ?? '').startsWith('/o/')
            ? 'Check your email to confirm your account. Lance will bring you back to the opportunity afterward.'
            : 'Check your email to confirm your account, then return to Lance to finish your profile.'}
        </Text>
      ) : null}
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  footerText: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
  },
  link: {
    color: theme.colors.text,
    fontWeight: '800',
  },
  success: {
    color: theme.colors.success,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
});
