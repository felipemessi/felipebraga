import { describe, expect, it } from 'vitest';
import {
  idFromFile,
  invalidIdProblems,
  isValidId,
} from '../../src/lib/content/ids';

describe('AC1: content ids', () => {
  it('idFromFile drops only the extension and keeps the case', () => {
    expect(idFromFile('devops.yaml')).toBe('devops');
    expect(idFromFile('DevOps.yaml')).toBe('DevOps');
    expect(idFromFile('me-contrate.md')).toBe('me-contrate');
    expect(idFromFile('no-extension')).toBe('no-extension');
  });

  it('accepts lowercase kebab-case ids', () => {
    for (const id of ['devops', 'ia', 'agentes-de-ia', 'v2', 'a-1-b']) {
      expect(isValidId(id), id).toBe(true);
    }
  });

  it('rejects uppercase, spaces, underscores, accents and stray hyphens', () => {
    for (const id of [
      'DevOps',
      'dev ops',
      'dev_ops',
      'plataforma-é',
      '-a',
      'a-',
      'a--b',
      '',
    ]) {
      expect(isValidId(id), id).toBe(false);
    }
  });

  it('invalidIdProblems names the collection and the id', () => {
    expect(invalidIdProblems('tags', ['devops', 'DevOps'])).toEqual([
      'tags/DevOps: id must be lowercase kebab-case (letters, digits and single hyphens)',
    ]);
    expect(invalidIdProblems('tags', [])).toEqual([]);
  });
});
