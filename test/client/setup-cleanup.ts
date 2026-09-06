import { afterEach } from 'vitest';

// Only runs for jsdom-environment test files; no-op under environment: 'node'.
// Without globals: true, React Testing Library's own auto-cleanup never fires,
// so a jsdom test file that skips this leaks DOM nodes into the next test.
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);
}
