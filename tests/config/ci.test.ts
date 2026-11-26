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
