// Sanitise user-provided free text that is later rendered into emails and
// receipts (org legal name, thank-you messages, contact fields). React already
// escapes interpolated text on output, so this is defence-in-depth at the input
// layer: we never store HTML markup, control characters, or invisible/bidi
// "funny business", and the email subject line can't be split with newlines.
export function sanitizePlainText(
  input: string,
  opts: { allowNewlines?: boolean } = {}
): string {
  const allowNewlines = opts.allowNewlines ?? false;

  // Strip HTML/XML tags, then neutralise any stray angle brackets left behind.
  let out = String(input).replace(/<[^>]*>/g, '').replace(/[<>]/g, '');
  // Normalise line endings so only \n can survive (no lone \r for headers).
  out = out.replace(/\r\n?/g, '\n');

  let result = '';
  for (const ch of out) {
    const code = ch.codePointAt(0) ?? 0;

    // Newline: keep only when allowed (multi-line messages), else → space.
    if (code === 0x0a) {
      result += allowNewlines ? '\n' : ' ';
      continue;
    }
    // C0 control characters (0x00–0x1F) and DEL (0x7F) → space.
    if (code <= 0x1f || code === 0x7f) {
      result += ' ';
      continue;
    }
    // Zero-width, BOM, word-joiner, and bidirectional override/isolate chars.
    if (
      (code >= 0x200b && code <= 0x200f) ||
      (code >= 0x202a && code <= 0x202e) ||
      (code >= 0x2066 && code <= 0x2069) ||
      code === 0x2060 ||
      code === 0xfeff
    ) {
      continue;
    }
    result += ch;
  }

  // Collapse runs of spaces/tabs; cap consecutive blank lines at one.
  result = result.replace(/[^\S\n]{2,}/g, ' ');
  if (allowNewlines) result = result.replace(/\n{3,}/g, '\n\n');

  return result.trim();
}
