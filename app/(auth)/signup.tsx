import { Link, router } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { StyleSheet, Text } from 'react-native';
import { z } from 'zod';

import { AuthFormShell } from '@/components/auth/AuthFormShell';
import { Button, TextField } from '@/components/ui';
import { theme } from '@/constants/theme';
import { formatAuthError } from '@/lib/authErrors';
import { supabase } from '@/lib/supabase';

const signupSchema = z.object({
  displayName: z.string().min(2, 'Enter your name.'),
  email: z.string().email('Enter a valid email.'),
  password: z.string().min(8, 'Use at least 8 characters.'),
});

type SignupForm = z.infer<typeof signupSchema>;

export default function SignupScreen() {
  const {
    control,
    formState: { errors, isSubmitSuccessful, isSubmitting },
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
    const parsed = signupSchema.safeParse(values);

    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => {
        setError(issue.path[0] as keyof SignupForm, { message: issue.message });
      });
      return;
    }

    try {
      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
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
        router.replace('/onboarding');
      }
    } catch (error) {
      setError('email', { message: formatAuthError(error) });
      return;
    }
  }

  return (
    <AuthFormShell
      title="Create your account"
      subtitle="Start with a simple login. Profile setup comes in the next phase."
      footer={
        <Text style={styles.footerText}>
          Already have an account?{' '}
          <Link href="/login" style={styles.link}>
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
      <Button label="Sign up" loading={isSubmitting} onPress={handleSubmit(onSubmit)} />
      {isSubmitSuccessful ? <Text style={styles.success}>Check your email to confirm your account.</Text> : null}
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
