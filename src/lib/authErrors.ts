type ErrorLike = {
  message?: unknown;
  name?: unknown;
};

export function formatAuthError(error: unknown) {
  if (error && typeof error === 'object') {
    const { message, name } = error as ErrorLike;
    const errorName = typeof name === 'string' && name.length > 0 ? name : 'AuthError';
    const errorMessage =
      typeof message === 'string' && message.length > 0
        ? message
        : 'The request could not be completed.';
    const normalized = errorMessage.toLowerCase();

    if (normalized.includes('invalid login credentials')) {
      return 'Email or password is incorrect.';
    }

    if (normalized.includes('email not confirmed')) {
      return 'Confirm your email before logging in.';
    }

    if (normalized.includes('already registered') || normalized.includes('already exists')) {
      return 'An account already exists for this email.';
    }

    if (normalized.includes('rate limit') || normalized.includes('too many requests')) {
      return 'Too many attempts. Wait a moment and try again.';
    }

    return `${errorName}: ${errorMessage}`;
  }

  if (typeof error === 'string' && error.length > 0) {
    return `AuthError: ${error}`;
  }

  return 'AuthError: The request could not be completed.';
}
