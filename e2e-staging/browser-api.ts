import type { Page } from '@playwright/test';

type BrowserClerk = {
  user?: unknown;
  session?: { getToken(): Promise<string | null> };
};

declare global {
  interface Window {
    Clerk?: BrowserClerk;
  }
}

export type BrowserApiResponse<T = unknown> = {
  ok: boolean;
  status: number;
  body: T;
};

export async function refreshAuthenticatedPage(page: Page, path = '/'): Promise<void> {
  // Refresh Clerk from a stable authenticated route before asking the server to
  // render the target. This matters in long headed runs where the setup
  // project's short-lived session token may otherwise be stale by the time a
  // later role project begins.
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.Clerk?.user));
  await page.evaluate(async () => {
    await window.Clerk?.session?.getToken();
  });
  if (path === '/') {
    await page.reload({ waitUntil: 'domcontentloaded' });
  } else {
    await page.goto(path, { waitUntil: 'domcontentloaded' });
  }
}

export async function browserApi<T = unknown>(
  page: Page,
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  data?: unknown,
): Promise<BrowserApiResponse<T>> {
  if (!page.url().startsWith('http')) {
    await refreshAuthenticatedPage(page);
  } else {
    await page.waitForFunction(() => Boolean(window.Clerk?.user));
    await page.evaluate(async () => {
      await window.Clerk?.session?.getToken();
    });
  }

  return page.evaluate(
    async ({ requestMethod, requestPath, requestData }) => {
      const response = await fetch(requestPath, {
        method: requestMethod,
        headers: requestData === undefined ? undefined : { 'content-type': 'application/json' },
        body: requestData === undefined ? undefined : JSON.stringify(requestData),
      });
      const text = await response.text();
      let body: unknown = null;
      if (text) {
        try {
          body = JSON.parse(text);
        } catch {
          body = text;
        }
      }
      return { ok: response.ok, status: response.status, body };
    },
    { requestMethod: method, requestPath: path, requestData: data },
  ) as Promise<BrowserApiResponse<T>>;
}
