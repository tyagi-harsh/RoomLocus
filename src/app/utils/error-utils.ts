// Utility helpers for normalizing error payloads received from the backend.
const MESSAGE_KEYS = ['message', 'error', 'details', 'description', 'detail'];
const DEEP_KEYS = ['body', 'data', 'response'];

/**
 * Attempts to traverse a variety of backend error shapes and return the first meaningful message.
 */
export function parseBackendErrorString(error: unknown): string | null {
  const seen = new Set<unknown>();
  return extractErrorMessage(error, seen);
}

function extractErrorMessage(value: unknown, seen: Set<unknown>): string | null {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed.length) {
      return null;
    }
    // If backend sent a JSON string (e.g. '{"message":"..."}'), parse and traverse it
    const first = trimmed[0];
    if (first === '{' || first === '[') {
      try {
        const parsed = JSON.parse(trimmed);
        const parsedMsg = extractErrorMessage(parsed, seen);
        if (parsedMsg) return parsedMsg;
      } catch {
        // ignore JSON parse failure, fall back to raw string
      }
    }
    return trimmed;
  }

  if (typeof value !== 'object') {
    return null;
  }

  if (seen.has(value)) {
    return null;
  }
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      const message = extractErrorMessage(item, seen);
      if (message) {
        return message;
      }
    }
  }

  const record = value as Record<string, unknown>;
  for (const key of MESSAGE_KEYS) {
    if (key in record) {
      const message = extractErrorMessage(record[key], seen);
      if (message) {
        return message;
      }
    }
  }

  for (const key of DEEP_KEYS) {
    if (key in record) {
      const message = extractErrorMessage(record[key], seen);
      if (message) {
        return message;
      }
    }
  }

  return null;
}
