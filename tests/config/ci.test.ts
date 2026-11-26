import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const ci = readFileSync('.github/workflows/ci.yml', 'utf8');

function job(name: string): string {
  const match = new RegExp(
    `\\n  ${name}:\\n[\\s\\S]*?(?=\\n  [a-z-]+:\\n|$)`,
  ).exec(ci);
  return match?.[0] ?? '';
}

describe('ci.yml', () => {
  it('1.5: runs SonarQube only on pull requests, where the quality gate is available', () => {
    const sonar = job('sonar');
    expect(sonar).not.toBe('');
    expect(sonar).toMatch(/if: github\.event_name == 'pull_request' &&/);
    expect(sonar).toContain('sonar.qualitygate.wait=true');
  });

  it('1.5: the gate accepts a skipped sonar job but not a failed one', () => {
    const gate = job('ci-gate');
    expect(gate).toMatch(/needs: \[changes, verify, e2e, sonar\]/);
    expect(gate).toMatch(/success\|skipped/);
  });
});

function jobOf(file: string, name: string): string {
  const text = readFileSync(file, 'utf8');
  const match = new RegExp(
    `\\n  ${name}:\\n[\\s\\S]*?(?=\\n  [a-z-]+:\\n|$)`,
  ).exec(text);
  return match?.[0] ?? '';
}

describe('1.4 AC20: the building jobs install Chromium before pnpm build', () => {
  it.each([
    ['.github/workflows/ci.yml', 'verify'],
    ['.github/workflows/deploy.yml', 'build'],
    ['.github/workflows/preview.yml', 'build'],
  ])('%s %s runs the chromium action right before the build', (file, name) => {
    const text = jobOf(file, name);
    expect(text).not.toBe('');
    const chromium = text.indexOf('uses: ./.github/actions/chromium');
    const build = text.indexOf('run: pnpm build');
    expect(chromium).toBeGreaterThan(-1);
    expect(build).toBeGreaterThan(chromium);
  });

  it.each([
    ['.github/workflows/deploy.yml', 'build'],
    ['.github/workflows/preview.yml', 'build'],
  ])('%s %s still holds no secrets', (file, name) => {
    expect(jobOf(file, name)).not.toContain('secrets.');
  });

  it('the action caches ~/.cache/ms-playwright and installs only Chromium', () => {
    const action = readFileSync('.github/actions/chromium/action.yml', 'utf8');
    expect(action).toContain('path: ~/.cache/ms-playwright');
    expect(action).toContain('playwright install --with-deps chromium');
    expect(action).toContain('playwright install-deps chromium');
    expect(action).not.toContain('webkit');
    expect(action).toMatch(/actions\/cache@[0-9a-f]{40}/);
  });

  it('lychee skips /tags/<id> until the tag pages exist', () => {
    expect(readFileSync('lychee.toml', 'utf8')).toContain("'/tags/[^/]+$'");
  });
});
