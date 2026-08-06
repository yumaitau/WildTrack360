export type AllowlistMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface AllowlistEntry {
  path: string;
  method: AllowlistMethod;
}

// (path, method) pairs not yet migrated to the OpenAPI contract convention.
// The coverage gate (scripts/openapi-coverage.ts) requires every route method to
// be either contracted OR listed here. Regenerate with `npm run openapi:check -- --init`
// so this stays exactly the set of uncontracted routes; it drains to empty as
// Phase 1+ domains are migrated.
export const ROUTE_ALLOWLIST: AllowlistEntry[] = [
  // Svix-signed Clerk webhook — not a session API, never part of the public contract.
  { path: '/api/webhooks/clerk', method: 'POST' },
  { path: '/api/community/admin/categories/{id}', method: 'DELETE' },
  { path: '/api/community/admin/rooms/{id}', method: 'DELETE' },
  { path: '/api/community/blocks', method: 'DELETE' },
  { path: '/api/community/chats/{roomId}/messages/{messageId}', method: 'DELETE' },
  { path: '/api/community/posts/{id}', method: 'DELETE' },
  { path: '/api/community/posts/{id}/bookmark', method: 'DELETE' },
  { path: '/api/community/posts/{id}/comments/{commentId}', method: 'DELETE' },
  { path: '/api/community/posts/{id}/follow', method: 'DELETE' },
  { path: '/api/community/reactions', method: 'DELETE' },
  { path: '/api/community/admin/categories', method: 'GET' },
  { path: '/api/community/admin/feedback', method: 'GET' },
  { path: '/api/community/admin/feedback/export', method: 'GET' },
  { path: '/api/community/admin/metrics', method: 'GET' },
  { path: '/api/community/admin/moderators', method: 'GET' },
  { path: '/api/community/admin/rooms', method: 'GET' },
  { path: '/api/community/admin/sanctions', method: 'GET' },
  { path: '/api/community/blocks', method: 'GET' },
  { path: '/api/community/chats', method: 'GET' },
  { path: '/api/community/chats/{roomId}/messages', method: 'GET' },
  { path: '/api/community/members', method: 'GET' },
  { path: '/api/community/members/{id}', method: 'GET' },
  { path: '/api/community/moderation/cases', method: 'GET' },
  { path: '/api/community/notification-preferences', method: 'GET' },
  { path: '/api/community/notification-preferences/unsubscribe', method: 'GET' },
  { path: '/api/community/notifications', method: 'GET' },
  { path: '/api/community/posts', method: 'GET' },
  { path: '/api/community/posts/{id}', method: 'GET' },
  { path: '/api/community/profile', method: 'GET' },
  { path: '/api/community/search', method: 'GET' },
  { path: '/api/internal/community-email', method: 'GET' },
  { path: '/api/internal/community-moderation', method: 'GET' },
  { path: '/api/community/admin/categories/{id}', method: 'PATCH' },
  { path: '/api/community/admin/feedback/{id}', method: 'PATCH' },
  { path: '/api/community/admin/rooms/{id}', method: 'PATCH' },
  { path: '/api/community/notification-preferences', method: 'PATCH' },
  { path: '/api/community/notifications', method: 'PATCH' },
  { path: '/api/community/posts/{id}', method: 'PATCH' },
  { path: '/api/community/posts/{id}/comments/{commentId}', method: 'PATCH' },
  { path: '/api/community/admin/categories', method: 'POST' },
  { path: '/api/community/admin/moderators', method: 'POST' },
  { path: '/api/community/admin/rooms', method: 'POST' },
  { path: '/api/community/admin/sanctions', method: 'POST' },
  { path: '/api/community/admin/sanctions/{id}/revoke', method: 'POST' },
  { path: '/api/community/chats/{roomId}/messages', method: 'POST' },
  { path: '/api/community/email-digest/sync', method: 'POST' },
  { path: '/api/community/feedback', method: 'POST' },
  { path: '/api/community/moderation/appeals', method: 'POST' },
  { path: '/api/community/moderation/appeals/{id}/actions', method: 'POST' },
  { path: '/api/community/moderation/cases/{id}/actions', method: 'POST' },
  { path: '/api/community/notification-preferences/unsubscribe', method: 'POST' },
  { path: '/api/community/posts', method: 'POST' },
  { path: '/api/community/posts/{id}/accept-answer', method: 'POST' },
  { path: '/api/community/posts/{id}/comments', method: 'POST' },
  { path: '/api/community/posts/{id}/publish', method: 'POST' },
  { path: '/api/community/reports', method: 'POST' },
  { path: '/api/community/reports/{id}/actions', method: 'POST' },
  { path: '/api/internal/community-email', method: 'POST' },
  { path: '/api/internal/community-moderation', method: 'POST' },
  { path: '/api/community/blocks', method: 'PUT' },
  { path: '/api/community/posts/{id}/bookmark', method: 'PUT' },
  { path: '/api/community/posts/{id}/follow', method: 'PUT' },
  { path: '/api/community/profile', method: 'PUT' },
  { path: '/api/community/reactions', method: 'PUT' },
];
