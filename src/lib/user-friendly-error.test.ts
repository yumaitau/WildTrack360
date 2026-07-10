import { describe, expect, it } from 'vitest';

import { getUserFriendlyErrorMessage } from './user-friendly-error';

describe('getUserFriendlyErrorMessage', () => {
  it('preserves specific validation guidance', () => {
    expect(getUserFriendlyErrorMessage('Enter a valid email address.')).toBe(
      'Enter a valid email address.'
    );
  });

  it('extracts a useful message from JSON responses', () => {
    expect(getUserFriendlyErrorMessage('{"error":"That email is already in use."}')).toBe(
      'That email is already in use.'
    );
  });

  it('turns common action failures into actionable copy', () => {
    expect(getUserFriendlyErrorMessage('Failed to save animal')).toBe(
      "We couldn't save your changes. Please try again."
    );
    expect(getUserFriendlyErrorMessage('Upload failed')).toBe(
      "We couldn't upload the file. Please check it and try again."
    );
  });

  it('does not expose implementation details', () => {
    expect(
      getUserFriendlyErrorMessage(
        'PrismaClientKnownRequestError: unique constraint failed on database field'
      )
    ).toBe('Something went wrong. Please try again.');
  });

  it('explains connection and permission problems', () => {
    expect(getUserFriendlyErrorMessage(new TypeError('Failed to fetch'))).toBe(
      "We couldn't connect. Check your internet connection and try again."
    );
    expect(getUserFriendlyErrorMessage('Forbidden')).toBe("You don't have permission to do that.");
  });

  it('replaces backend-oriented request messages', () => {
    expect(getUserFriendlyErrorMessage('Organization ID is required')).toBe(
      "We couldn't identify your organisation. Refresh the page and try again."
    );
    expect(getUserFriendlyErrorMessage('orgMemberId and speciesGroupId are required')).toBe(
      'Complete all required fields and try again.'
    );
    expect(getUserFriendlyErrorMessage('Invalid request body')).toBe(
      "Some of the information wasn't accepted. Check the form and try again."
    );
  });

  it('uses the supplied fallback for unknown errors', () => {
    expect(getUserFriendlyErrorMessage(null, "We couldn't load the map.")).toBe(
      "We couldn't load the map."
    );
  });
});
