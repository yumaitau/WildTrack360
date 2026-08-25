'server-only';

const TAG_PATTERN = /^[A-Za-z0-9_-]+$/;
const MAX_TAGS = 75;
const BACKOFFS_MS = [100, 500, 1000];

export type PaperboyTag = {
  name: string;
  value: string;
};

export type PaperboySendInput = {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  tags?: PaperboyTag[];
};

export function isPaperboyConfigured(): boolean {
  return Boolean(process.env.PAPERBOY_URL?.trim() && process.env.PAPERBOY_API_KEY?.trim());
}

export function getPaperboyFromEmail(fallback: string): string {
  return (
    process.env.PAPERBOY_FROM_EMAIL?.trim() ||
    process.env.RESEND_FROM_EMAIL?.trim() ||
    fallback
  );
}

function paperboyEndpoint(): { url: string; apiKey: string } {
  const baseUrl = process.env.PAPERBOY_URL?.trim();
  const apiKey = process.env.PAPERBOY_API_KEY?.trim();
  if (!baseUrl || !apiKey) {
    throw new Error('PAPERBOY_URL and PAPERBOY_API_KEY are not configured');
  }
  return { url: `${baseUrl.replace(/\/+$/, '')}/api/v1/emails`, apiKey };
}

export function sanitiseTags(tags?: PaperboyTag[]): PaperboyTag[] | undefined {
  if (!tags?.length) return undefined;
  const filtered = tags
    .filter((tag) => TAG_PATTERN.test(tag.name) && TAG_PATTERN.test(tag.value))
    .slice(0, MAX_TAGS);
  return filtered.length ? filtered : undefined;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function postWithRetry(url: string, init: RequestInit): Promise<Response> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= BACKOFFS_MS.length; attempt += 1) {
    try {
      const response = await fetch(url, init);
      const retryable = response.status === 429 || response.status >= 500;
      if (retryable && attempt < BACKOFFS_MS.length) {
        await sleep(BACKOFFS_MS[attempt]);
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < BACKOFFS_MS.length) {
        await sleep(BACKOFFS_MS[attempt]);
        continue;
      }
      throw error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Paperboy request failed');
}

export async function sendPaperboyEmail(input: PaperboySendInput): Promise<{ id: string | null }> {
  const { url, apiKey } = paperboyEndpoint();
  const html = input.html?.trim();
  const text = input.text?.trim();
  if (!html && !text) {
    throw new Error('Paperboy requires an html or text body');
  }

  const subject = input.subject.replace(/[\r\n]/g, ' ').trim();
  if (!subject) {
    throw new Error('Paperboy requires a subject');
  }

  const body: Record<string, unknown> = {
    from: input.from,
    to: input.to,
    subject,
  };
  if (html) body.html = html;
  if (text) body.text = text;
  const tags = sanitiseTags(input.tags);
  if (tags) body.tags = tags;

  const response = await postWithRetry(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': crypto.randomUUID(),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errBody = await response.text().catch(() => '');
    throw new Error(`Paperboy API failed (${response.status}): ${errBody.slice(0, 300)}`);
  }

  const payload = (await response.json().catch(() => null)) as { id?: string } | null;
  return { id: payload?.id ?? null };
}
