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

    return `${errorName}: ${errorMessage}`;
  }

  if (typeof error === 'string' && error.length > 0) {
    return `AuthError: ${error}`;
  }

  return 'AuthError: The request could not be completed.';
}
