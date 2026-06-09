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

  // Bound length first so the tag strip can't be pushed into superlinear work
  // by a pathological input (ReDoS guard).
  let out = String(input).slice(0, 10_000);
  // Strip HTML/XML tags. The inner class excludes both '<' and '>' (no overlap,
  // linear), and we loop until stable so split/nested tags like
  // "<scr<script>ipt>" can't reconstruct a tag after a single pass. Then remove
  // any leftover angle brackets — the result provably contains no '<' or '>'.
  let prev: string;
  do {
    prev = out;
    out = out.replace(/<[^<>]*>/g, '');
  } while (out !== prev);
  out = out.replace(/[<>]/g, '');
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
