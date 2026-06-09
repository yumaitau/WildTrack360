import { describe, expect, it } from 'vitest';
import { sanitizePlainText } from './sanitize';

const NUL = String.fromCharCode(0);
const BEL = String.fromCharCode(7);
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const ZWSP = String.fromCharCode(0x200b);
const RLO = String.fromCharCode(0x202e); // right-to-left override

describe('sanitizePlainText', () => {
  it('strips HTML tags', () => {
    expect(sanitizePlainText('Thanks <script>alert(1)</script> Jo')).toBe('Thanks alert(1) Jo');
    expect(sanitizePlainText('<b>Hi</b> there')).toBe('Hi there');
    expect(sanitizePlainText('<img src=x onerror=alert(1)>')).toBe('');
  });

  it('removes stray angle brackets that are not part of a tag', () => {
    expect(sanitizePlainText('a > b < c')).toBe('a b c');
  });

  it('strips control characters', () => {
    expect(sanitizePlainText(`a${NUL}b${BEL}c`)).toBe('a b c');
  });

  it('strips zero-width and bidirectional-override characters', () => {
    expect(sanitizePlainText(`he${ZWSP}llo${RLO}`)).toBe('hello');
  });

  it('removes newlines by default but keeps them when allowed', () => {
    expect(sanitizePlainText(`line1${LF}line2`)).toBe('line1 line2');
    expect(sanitizePlainText(`line1${LF}line2`, { allowNewlines: true })).toBe('line1\nline2');
  });

  it('normalises CRLF and caps consecutive blank lines', () => {
    expect(sanitizePlainText(`a${CR}${LF}${LF}${LF}${LF}b`, { allowNewlines: true })).toBe('a\n\nb');
  });

  it('prevents email-subject header injection (single-line collapses newlines)', () => {
    expect(sanitizePlainText(`Org${CR}${LF}Bcc: evil@example.com`)).toBe('Org Bcc: evil@example.com');
  });

  it('passes clean text through unchanged', () => {
    expect(sanitizePlainText('Thank you for your support!')).toBe('Thank you for your support!');
  });
});
