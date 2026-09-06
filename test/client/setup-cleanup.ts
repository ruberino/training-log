import { afterEach } from 'vitest';

// Only runs for jsdom-environment test files; no-op under environment: 'node'.
// Without globals: true, React Testing Library's own auto-cleanup never fires,
// so a jsdom test file that skips this leaks DOM nodes into the next test.
if (typeof document !== 'undefined') {
  const { cleanup } = await import('@testing-library/react');
  afterEach(cleanup);

  // jsdom has no layout engine and no ResizeObserver, so Recharts'
  // ResponsiveContainer measures a permanent 0x0 and never renders its
  // children. This stub fires synchronously on observe() with a fixed
  // size, which is enough for Recharts to lay out and render its SVG.
  class ResizeObserverStub {
    private readonly callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(target: Element): void {
      const entry = { target, contentRect: { width: 300, height: 240 } } as ResizeObserverEntry;
      this.callback([entry], this as unknown as ResizeObserver);
    }

    unobserve(): void {}
    disconnect(): void {}
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    writable: true,
    value: ResizeObserverStub,
  });
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', { configurable: true, value: 300 });
  Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 240 });
}
