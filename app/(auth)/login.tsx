import { useState } from 'react';
import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text, View } from 'react-native';
import { z } from 'zod';

import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { Button, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { formatAuthError } from '@/lib/authErrors';
import { supabase, testSupabaseAuthHealth } from '@/lib/supabase';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(6, 'Use at least 6 characters.'),
});

type LoginForm = z.infer<typeof loginSchema>;
type ConnectionResult = Awaited<ReturnType<typeof testSupabaseAuthHealth>>;

export default function LoginScreen() {
  const [connectionResult, setConnectionResult] = useState<ConnectionResult | null>(null);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<LoginForm>({
    defaultValues: {
      email: '',
      password: '',
    },
  });

  async function onSubmit(values: LoginForm) {
    const parsed = loginSchema.safeParse(values);

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        setError(issue.path[0] as keyof LoginForm, { message: issue.message });
      });
      return;
    }

    try {
      const { error } = await supabase.auth.signInWithPassword(parsed.data);

      if (error) {
        setError('password', { message: formatAuthError(error) });
        return;
      }
    } catch (error) {
      setError('password', { message: formatAuthError(error) });
      return;
    }

    router.replace('/discover');
  }

  async function onTestConnection() {
    setIsTestingConnection(true);
    setConnectionResult(null);

    try {
      setConnectionResult(await testSupabaseAuthHealth());
    } finally {
      setIsTestingConnection(false);
    }
  }

  return (
    <AuthFormShell
      title="Welcome back"
      subtitle="Sign in to keep discovering people worth building with."
      footer={
        <Text style={styles.footerText}>
          New to Lance?{' '}
          <Link href="/signup" style={styles.link}>
            Create an account
          </Link>
        </Text>
      }>
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
            placeholder="Your password"
            secureTextEntry
            value={value}
          />
        )}
      />
      <Button label="Log in" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      <View style={styles.diagnostic}>
        <Button
          label="Test Supabase connection"
          loading={isTestingConnection}
          onPress={onTestConnection}
          variant="secondary"
        />
        {connectionResult ? (
          <View style={styles.diagnosticResult}>
            <Text style={styles.diagnosticText}>
              Completed: {connectionResult.completed ? 'yes' : 'no'}
            </Text>
            {typeof connectionResult.status === 'number' ? (
              <Text style={styles.diagnosticText}>HTTP status: {connectionResult.status}</Text>
            ) : null}
            {connectionResult.name ? (
              <Text style={styles.diagnosticText}>Response name: {connectionResult.name}</Text>
            ) : null}
            {connectionResult.version ? (
              <Text style={styles.diagnosticText}>Version: {connectionResult.version}</Text>
            ) : null}
            {connectionResult.errorName || connectionResult.errorMessage ? (
              <Text style={styles.diagnosticError}>
                Error: {connectionResult.errorName ?? 'Error'}: {connectionResult.errorMessage ?? 'No message'}
              </Text>
            ) : null}
          </View>
        ) : null}
      </View>
      <Link href="/reset-password" style={styles.secondaryLink}>
        Forgot your password?
      </Link>
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
  secondaryLink: {
    color: theme.colors.muted,
    fontSize: theme.typography.small,
    fontWeight: '700',
    textAlign: 'center',
  },
  diagnostic: {
    gap: theme.spacing.md,
  },
  diagnosticResult: {
    backgroundColor: theme.colors.surfaceMuted,
    borderColor: theme.colors.border,
    borderRadius: theme.radii.md,
    borderWidth: 1,
    gap: theme.spacing.xs,
    padding: theme.spacing.md,
  },
  diagnosticText: {
    color: theme.colors.muted,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
  diagnosticError: {
    color: theme.colors.danger,
    fontSize: theme.typography.tiny,
    lineHeight: 18,
  },
});
