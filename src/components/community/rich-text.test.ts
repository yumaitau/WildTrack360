import { test } from 'vitest';
import assert from 'node:assert/strict';
import { parseCommunityRichText } from '@/components/community/rich-text-core';

// Adversarial coverage of the community rich-text/link parser. The security
// model is: bodies are stored raw and escaped on OUTPUT by React; the only
// markup the component ever generates is <a> elements whose href is constrained
// to http(s)/www by the link regex. These parser-level tests lock in that a
// future change can't silently introduce a dangerous-scheme link sink. (The
// component itself only maps these segments to <a>/<Link>/text, and React
// escapes every text node, so href safety here is the whole security boundary.)

test('parser is loss-free — segments rejoin to the original input', () => {
  for (const input of [
    'plain text',
    'see https://example.com/path?q=1 for more',
    'multi\nline\nbody',
    'trailing https://example.com.',
    'www.gov.au and http://a.co mixed',
    '',
  ]) {
    assert.equal(
      parseCommunityRichText(input)
        .map((s) => s.value)
        .join(''),
      input
    );
  }
});

test('only http/https/www segments become links', () => {
  const linked = (text: string) => parseCommunityRichText(text).filter((s) => s.href);
  assert.equal(linked('https://ok.com')[0].href, 'https://ok.com');
  assert.equal(linked('http://ok.com')[0].href, 'http://ok.com');
  assert.equal(linked('www.ok.com')[0].href, 'https://www.ok.com');
});

test('dangerous schemes never produce a link href', () => {
  for (const payload of [
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    '  javascript:alert(document.cookie)  ',
  ]) {
    const segments = parseCommunityRichText(payload);
    assert.equal(
      segments.some((s) => s.href),
      false,
      `linkified: ${payload}`
    );
  }
});

test('a URL carrying an attribute-breakout payload still only ever gets a safe scheme', () => {
  // Breakout characters after the URL are neutralised at RENDER time by React
  // escaping the href attribute value; the parser-level guarantee we lock in
  // here is narrower but load-bearing: any linkified segment always carries an
  // http(s) scheme, so no javascript:/data: sink can ever reach the anchor.
  const segments = parseCommunityRichText('http://evil.com/"><img src=x onerror=alert(1)>');
  for (const link of segments.filter((s) => s.href)) {
    assert.match(link.href!, /^https?:\/\//);
  }
});

test('known @mentions become internal member links; unknown @text stays plain', () => {
  const mentions = [{ id: 'prof_1', name: 'Jane Smith' }];
  const segments = parseCommunityRichText('hi @Jane Smith and @Ghost', mentions);
  const linked = segments.filter((s) => s.mentionId);
  assert.equal(linked.length, 1);
  assert.equal(linked[0].value, '@Jane Smith');
  assert.equal(linked[0].mentionId, 'prof_1');
  assert.equal(
    segments.some((s) => s.value.includes('@Ghost') && s.mentionId),
    false
  );
});

test('longest mention token wins over a prefix collision', () => {
  const mentions = [
    { id: 'short', name: 'Jane' },
    { id: 'long', name: 'Jane Smith' },
  ];
  const linked = parseCommunityRichText('@Jane Smith here', mentions).filter((s) => s.mentionId);
  assert.equal(linked[0].mentionId, 'long');
});

test('mention parsing is loss-free', () => {
  const mentions = [{ id: 'prof_9', name: 'Jane' }];
  assert.equal(
    parseCommunityRichText('yo @Jane', mentions)
      .map((s) => s.value)
      .join(''),
    'yo @Jane'
  );
});

test('linkifier is linear-time on adversarial input (no ReDoS)', () => {
  const hostile = 'http://' + 'a'.repeat(200_000) + ' tail';
  const start = process.hrtime.bigint();
  parseCommunityRichText(hostile);
  const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
  assert.ok(ms < 250, `parse took ${ms.toFixed(1)}ms — possible catastrophic backtracking`);
});
