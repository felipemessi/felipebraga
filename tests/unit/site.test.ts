import { describe, expect, it } from 'vitest';
import { SITE } from '../../src/lib/site';

describe('SITE', () => {
  it('AC9: is a Portuguese (Brazil) site', () => {
    expect(SITE.locale).toBe('pt-BR');
  });

  it('AC9: carries the blog name and tagline', () => {
    expect(SITE.name).toBe('Felipe Braga');
    expect(SITE.tagline).toBe(
      'Apenas um desenvolvedor resolvendo atividades de DevOps em um mundo com IA.',
    );
  });

  it('AC9: never mentions a city (RN7)', () => {
    expect(JSON.stringify(SITE)).not.toMatch(
      /Bras[ií]lia|S[aã]o Paulo|Rio de Janeiro/i,
    );
  });
});
