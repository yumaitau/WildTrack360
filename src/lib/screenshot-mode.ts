export const WILDTRACK_SCREENSHOT_MODE_ENV = 'WILDTRACK360_SCREENSHOT_MODE';
export const WILDTRACK_SCREENSHOT_CLIENT_ENV = 'NEXT_PUBLIC_WILDTRACK360_SCREENSHOT_MODE';

export const SCREENSHOT_FIXED_ISO = '2026-06-10T10:30:00+10:00';
export const SCREENSHOT_DEMO_USER_ID = 'demo-user-wildtrack360-admin';
export const SCREENSHOT_DEMO_ORG_ID = 'demo-org-wildtrack360';
export const SCREENSHOT_DEMO_ORG_SLUG = 'wilddemo';
export const SCREENSHOT_DEMO_ORG_NAME = 'Illawarra Wildlife Rescue';

export const DEMO_CLERK_USERS = [
  {
    id: SCREENSHOT_DEMO_USER_ID,
    firstName: 'Amelia',
    lastName: 'Hart',
    email: 'amelia.hart@illawarra-wildlife.example',
    role: 'org:admin',
    imageUrl: '',
  },
  {
    id: 'demo-user-macropods',
    firstName: 'Noah',
    lastName: 'Singh',
    email: 'noah.singh@illawarra-wildlife.example',
    role: 'org:member',
    imageUrl: '',
  },
  {
    id: 'demo-user-bats',
    firstName: 'Maya',
    lastName: 'Nguyen',
    email: 'maya.nguyen@illawarra-wildlife.example',
    role: 'org:member',
    imageUrl: '',
  },
  {
    id: 'demo-user-reptiles',
    firstName: 'Ethan',
    lastName: 'Cole',
    email: 'ethan.cole@illawarra-wildlife.example',
    role: 'org:member',
    imageUrl: '',
  },
  {
    id: 'demo-user-birds',
    firstName: 'Priya',
    lastName: 'Rao',
    email: 'priya.rao@illawarra-wildlife.example',
    role: 'org:member',
    imageUrl: '',
  },
] as const;

export function isScreenshotMode() {
  return process.env[WILDTRACK_SCREENSHOT_MODE_ENV] === 'true';
}

export function isClientScreenshotMode() {
  return process.env.NEXT_PUBLIC_WILDTRACK360_SCREENSHOT_MODE === 'true';
}

export function assertScreenshotModeSafe() {
  if (isScreenshotMode() && process.env.NODE_ENV === 'production') {
    throw new Error('WILDTRACK360_SCREENSHOT_MODE must never be enabled in production.');
  }
}

export function fixedScreenshotDate() {
  return new Date(SCREENSHOT_FIXED_ISO);
}
