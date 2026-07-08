import { Link, router, useLocalSearchParams } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { Button, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { authRoute, normalizeInternalNext } from '@/lib/authNavigation';
import { formatAuthError } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

const loginSchema = z.object({
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(6, 'Use at least 6 characters.'),
});

type LoginForm = z.infer<typeof loginSchema>;
export default function LoginScreen() {
  const { next } = useLocalSearchParams<{ next?: string | string[] }>();
  const nextPath = normalizeInternalNext(next);
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

    router.replace(nextPath ?? '/');
  }

  return (
    <AuthFormShell
      title="Welcome back"
      subtitle="Sign in to keep discovering people worth building with."
      footer={
        <Text style={styles.footerText}>
          New to Lance?{' '}
          <Link href={authRoute('/signup', nextPath)} style={styles.link}>
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
      <Link href={authRoute('/reset-password', nextPath)} style={styles.secondaryLink}>
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
});
