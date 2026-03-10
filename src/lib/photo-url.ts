/**
 * Convert a stored S3 key to a display-safe URL that goes through
 * the authenticated proxy at /api/photos/serve?key=...
 *
 * Handles three cases:
 *  - S3 key (e.g. "orgs/org_xxx/animal-photos/123-cat.jpg") → "/api/photos/serve?key=orgs/org_xxx/..."
 *  - Data URI (e.g. "data:image/png;base64,...") → returned as-is (local preview)
 *  - null / undefined / empty → returns null
 */
export function getPhotoUrl(keyOrUrl: string | null | undefined): string | null {
  if (!keyOrUrl) return null

  // Data URIs are local previews — pass through
  if (keyOrUrl.startsWith('data:')) return keyOrUrl

  // Already a proxy URL
  if (keyOrUrl.startsWith('/api/photos/serve')) return keyOrUrl

  // Legacy full URL — should not happen for new uploads, but handle gracefully
  if (keyOrUrl.startsWith('http://') || keyOrUrl.startsWith('https://')) return keyOrUrl

  // S3 key → proxy URL with query parameter
  return `/api/photos/serve?key=${encodeURIComponent(keyOrUrl)}`
}
