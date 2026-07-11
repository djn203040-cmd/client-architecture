// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest';

describe('INFRA-008: ai-engine window guard', () => {
  it('throws when imported in a browser (window) context', async () => {
    // happy-dom provides a global window object
    expect(typeof window).toBe('object');

    // The ai-engine must not load in a browser. Our guard at the top of index.ts
    // throws first, but the Anthropic SDK also independently guards against browser
    // usage, both serve the same protection. Either error message is acceptable.
    await expect(import('@client/ai-engine')).rejects.toThrow();
  });

  it('error message references browser restriction', async () => {
    try {
      await import('@client/ai-engine');
      throw new Error('Expected import to throw');
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const isBrowserGuard =
        /client-side/i.test(message) ||
        /browser/i.test(message) ||
        /dangerouslyAllowBrowser/i.test(message);
      expect(isBrowserGuard).toBe(true);
    }
  });
});
