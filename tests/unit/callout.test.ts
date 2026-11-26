import { describe, expect, it } from 'vitest';
import {
  CALLOUT_TYPES,
  calloutSpec,
  isCalloutType,
} from '../../src/lib/mdx/callout';

describe('AC9: callout types', () => {
  it.each([
    ['nota', 'menta', 'Nota.'],
    ['dica', 'manteiga', 'Dica.'],
    ['atencao', 'pessego', 'Atenção.'],
    ['perigo', 'rosa', 'Perigo.'],
  ])('%s is %s with the lead "%s"', (type, tone, label) => {
    expect(calloutSpec(type)).toEqual({ tone, label });
  });

  it('knows exactly four types', () => {
    expect(CALLOUT_TYPES).toHaveLength(4);
    expect(isCalloutType('nota')).toBe(true);
    expect(isCalloutType('aviso')).toBe(false);
    expect(isCalloutType(undefined)).toBe(false);
  });

  it('fails the build on an unknown type', () => {
    expect(() => calloutSpec('aviso')).toThrow(/expected one of nota, dica/);
    expect(() => calloutSpec(undefined)).toThrow('undefined');
  });
});
