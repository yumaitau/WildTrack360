import { vi } from 'vitest';

// Stub the 'server-only' import so test files can import server modules
vi.mock('server-only', () => ({}));
