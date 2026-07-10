import { toast as sonnerToast } from 'sonner';

import { getUserFriendlyErrorMessage } from '@/lib/user-friendly-error';

const error: typeof sonnerToast.error = (message, options) =>
  sonnerToast.error(
    typeof message === 'string' ? getUserFriendlyErrorMessage(message) : message,
    options
  );

/** Sonner with all error messages normalised at the UI boundary. */
export const toast = {
  error,
  info: sonnerToast.info,
  success: sonnerToast.success,
};
