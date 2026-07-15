import { describe, expect, it } from 'vitest';
import { getPhotoUrl } from './photo-url';

describe('getPhotoUrl', () => {
  it('routes private S3 keys through the authenticated photo proxy', () => {
    expect(getPhotoUrl('orgs/org-1/animal-photos/photo one.jpg')).toBe(
      '/api/photos/serve?key=orgs%2Forg-1%2Fanimal-photos%2Fphoto%20one.jpg'
    );
  });

  it('keeps proxy, HTTPS, and preview URLs unchanged', () => {
    expect(getPhotoUrl('/api/photos/serve?key=photo')).toBe('/api/photos/serve?key=photo');
    expect(getPhotoUrl('https://example.com/photo.jpg')).toBe('https://example.com/photo.jpg');
    expect(getPhotoUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });

  it('returns null for missing values', () => {
    expect(getPhotoUrl(null)).toBeNull();
    expect(getPhotoUrl('')).toBeNull();
  });
});
