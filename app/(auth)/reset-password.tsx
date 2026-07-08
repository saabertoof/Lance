import { Link, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { Button, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { authRoute, normalizeInternalNext } from '@/lib/authNavigation';
import { formatAuthError } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

const resetSchema = z.object({
  email: z.string().email('Enter a valid email.'),
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPasswordScreen() {
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const nextPath = normalizeInternalNext(next);
  const [resetSent, setResetSent] = useState(false);
  const {
    control,
    formState: { errors, isSubmitting },
    handleSubmit,
    setError,
  } = useForm<ResetForm>({
    defaultValues: {
      email: '',
    },
  });

  async function onSubmit(values: ResetForm) {
    setResetSent(false);
    const parsed = resetSchema.safeParse(values);

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        setError(issue.path[0] as keyof ResetForm, { message: issue.message });
      });
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email);

      if (error) {
        setError('email', { message: formatAuthError(error) });
        return;
      }
      setResetSent(true);
    } catch (error) {
      setError('email', { message: formatAuthError(error) });
    }
  }

  return (
    <AuthFormShell
      title="Reset password"
      subtitle="Enter your email and Lance will send you a secure reset link."
      footer={
        <Link href={authRoute('/login', nextPath)} style={styles.link}>
          Back to login
        </Link>
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
      <Button label="Send reset link" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      {resetSent ? (
        <Text accessibilityLiveRegion="polite" style={styles.success}>
          If that email exists, a reset link is on its way.
        </Text>
      ) : null}
    </AuthFormShell>
  );
}

const styles = StyleSheet.create({
  link: {
    color: theme.colors.text,
    fontSize: theme.typography.small,
    fontWeight: '800',
  },
  success: {
    color: theme.colors.success,
    fontSize: theme.typography.small,
    textAlign: 'center',
  },
});
