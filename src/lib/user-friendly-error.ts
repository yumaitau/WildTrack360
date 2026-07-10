const DEFAULT_ERROR_MESSAGE = 'Something went wrong. Please try again.';

const NETWORK_ERROR_MESSAGE = "We couldn't connect. Check your internet connection and try again.";

const INTERNAL_ERROR_PATTERNS = [
  /\b(?:Prisma|SQLSTATE|Sequelize|Postgres|ECONN\w*|ENOTFOUND|ETIMEDOUT)\b/i,
  /\b(?:TypeError|ReferenceError|SyntaxError|ZodError|AggregateError)\b/i,
  /\b(?:node_modules|DATABASE_URL|S3_[A-Z_]+|AWS_[A-Z_]+|CLERK_[A-Z_]+)\b/i,
  /\bP\d{4}\b/,
  /\bat\s+[\w.[\]<>]+\s*\([^\n]+:\d+:\d+\)/,
  /\b(?:unique|foreign key|database) constraint\b/i,
];

function messageFromUnknown(error: unknown): string | null {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;

  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    if (typeof record.error === 'string') return record.error;
    if (typeof record.message === 'string') return record.message;
  }

  return null;
}

function messageFromJson(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return null;

  try {
    return messageFromUnknown(JSON.parse(trimmed));
  } catch {
    return null;
  }
}

function makeActionMessage(action: string): string | null {
  const normalised = action
    .trim()
    .replace(/[.!]+$/, '')
    .toLowerCase();

  if (/^(?:load|fetch|get|retrieve)\b/.test(normalised)) {
    return "We couldn't load that information. Please refresh and try again.";
  }
  if (/^(?:save|update)\b/.test(normalised)) {
    return "We couldn't save your changes. Please try again.";
  }
  if (/^(?:create|add)\b/.test(normalised)) {
    return "We couldn't add that item. Please try again.";
  }
  if (/^(?:delete|remove|archive)\b/.test(normalised)) {
    return "We couldn't remove that item. Please try again.";
  }
  if (/^(?:upload)\b/.test(normalised)) {
    return "We couldn't upload the file. Please check it and try again.";
  }
  if (/^(?:send)\b/.test(normalised)) {
    return "We couldn't send that. Please try again.";
  }
  if (/^(?:submit)\b/.test(normalised)) {
    return "We couldn't submit the form. Please check the details and try again.";
  }
  if (/^(?:generate|export|download)\b/.test(normalised)) {
    return "We couldn't prepare the file. Please try again.";
  }
  if (/^(?:cancel|disconnect)\b/.test(normalised)) {
    return "We couldn't complete that request. Please try again.";
  }
  if (/^(?:process payment|create payment|take payment|charge)\b/.test(normalised)) {
    return "We couldn't process the payment. Check the payment details and try again.";
  }

  return null;
}

/**
 * Converts unknown API and runtime errors into copy that is safe and useful in the UI.
 * Specific validation messages are preserved; implementation details are replaced.
 */
export function getUserFriendlyErrorMessage(
  error: unknown,
  fallback = DEFAULT_ERROR_MESSAGE
): string {
  let message = messageFromUnknown(error)
    ?.replace(/^Error:\s*/i, '')
    .trim();
  if (!message) return fallback;

  const jsonMessage = messageFromJson(message);
  if (jsonMessage) message = jsonMessage.trim();

  if (!message || message.length > 280 || /<\/?(?:html|body|pre|script)\b/i.test(message)) {
    return fallback;
  }

  if (
    /\b(?:failed to fetch|network ?error|network request failed|load failed|offline)\b/i.test(
      message
    )
  ) {
    return NETWORK_ERROR_MESSAGE;
  }
  if (/\b(?:aborterror|request aborted|timed? out|timeout)\b/i.test(message)) {
    return 'The request took too long. Please try again.';
  }
  if (
    /^(?:unauthori[sz]ed|authentication required|invalid session|session expired)$/i.test(message)
  ) {
    return 'Your session has expired. Please sign in again.';
  }
  if (/^(?:forbidden|access denied|permission denied)$/i.test(message)) {
    return "You don't have permission to do that.";
  }
  if (/^(?:not found|item not found)$/i.test(message)) {
    return "We couldn't find that item. It may have been removed.";
  }
  if (/^(?:invalid request body|invalid json|validation failed)$/i.test(message)) {
    return "Some of the information wasn't accepted. Check the form and try again.";
  }
  if (/\b(?:organi[sz]ation|org) id is required\b/i.test(message)) {
    return "We couldn't identify your organisation. Refresh the page and try again.";
  }
  if (
    /\b(?:access_denied|invalid_grant|invalid_request|temporarily_unavailable)\b/i.test(message)
  ) {
    return "We couldn't connect the payment service. Please try again.";
  }
  if (/\b(?:too many requests|rate limit)\b/i.test(message)) {
    return 'There have been too many requests. Wait a moment, then try again.';
  }
  if (
    /^(?:internal server error|bad gateway|service unavailable|gateway timeout)$/i.test(message) ||
    INTERNAL_ERROR_PATTERNS.some((pattern) => pattern.test(message))
  ) {
    return fallback;
  }

  if (/\b[a-z][A-Za-z]*(?:Id|_id)\b/.test(message) && /\brequired\b/i.test(message)) {
    return 'Complete all required fields and try again.';
  }

  const failedAction =
    message.match(/^(?:failed|unable) to\s+(.+)$/i)?.[1] ??
    message.match(/^(?:could not|couldn't)\s+(.+)$/i)?.[1];
  if (failedAction) return makeActionMessage(failedAction) ?? fallback;

  const terseFailure = message.match(/^(.+?)\s+failed$/i)?.[1];
  if (terseFailure) return makeActionMessage(terseFailure) ?? fallback;

  return message;
}

export { DEFAULT_ERROR_MESSAGE };
