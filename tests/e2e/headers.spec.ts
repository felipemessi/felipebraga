import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

// The file does not depend on the browser, so run it once.
test('AC3: the build ships the cache and security rules unchanged in dist/_headers', ({
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'browser independent');

  const source = readFileSync('public/_headers', 'utf8');
  const built = readFileSync('dist/_headers', 'utf8');
  expect(built).toBe(source);
  expect(built).toContain('/_astro/*');
  expect(built).toContain('Cache-Control: public, max-age=31536000, immutable');
  expect(built).toContain('X-Content-Type-Options: nosniff');
});
