import { describe, expect, it } from 'vitest';
import {
  dayParts,
  formatDate,
  formatUpdated,
  isDateOnly,
  isUpdatedLater,
} from '../../src/lib/post/dates';

describe('AC5: dates in America/Sao_Paulo', () => {
  it('formats a date in Portuguese', () => {
    expect(formatDate(new Date('2026-11-12T12:00:00Z'))).toBe('12 nov 2026');
    expect(formatDate(new Date('2026-03-05T12:00:00Z'))).toBe('5 mar 2026');
  });

  it('uses the São Paulo day, not the UTC day', () => {
    expect(formatDate(new Date('2026-12-01T01:00:00Z'))).toBe('30 nov 2026');
    expect(dayParts(new Date('2026-12-01T01:00:00Z'))).toEqual({
      year: 2026,
      month: 11,
      day: 30,
    });
  });

  it('can drop the year', () => {
    expect(formatDate(new Date('2026-11-18T12:00:00Z'), false)).toBe('18 nov');
  });

  it('accepts another zone', () => {
    expect(formatDate(new Date('2026-12-01T01:00:00Z'), true, 'UTC')).toBe(
      '1 dez 2026',
    );
  });

  it('has an abbreviation for every month', () => {
    const labels = Array.from(
      { length: 12 },
      (_, index) =>
        formatDate(new Date(Date.UTC(2026, index, 15)), false).split(' ')[1],
    );
    expect(labels).toEqual([
      'jan',
      'fev',
      'mar',
      'abr',
      'mai',
      'jun',
      'jul',
      'ago',
      'set',
      'out',
      'nov',
      'dez',
    ]);
  });
});

describe('AC5: date-only values keep their own day', () => {
  it('shows 2026-11-12 as 12 nov, not the evening before', () => {
    expect(formatDate(new Date('2026-11-12'))).toBe('12 nov 2026');
    expect(dayParts(new Date('2026-11-12'))).toEqual({
      year: 2026,
      month: 11,
      day: 12,
    });
  });

  it('treats a datetime at UTC midnight as the same calendar day', () => {
    expect(isDateOnly(new Date('2026-11-12T00:00:00Z'))).toBe(true);
    expect(isDateOnly(new Date('2026-11-12T00:00:01Z'))).toBe(false);
    expect(isDateOnly(new Date('2026-11-12T09:00:00-03:00'))).toBe(false);
  });

  it('compares date-only publish and update days correctly', () => {
    const published = new Date('2026-11-12');
    expect(isUpdatedLater(published, new Date('2026-11-12'))).toBe(false);
    expect(isUpdatedLater(published, new Date('2026-11-13'))).toBe(true);
    expect(formatUpdated(published, new Date('2026-11-13'))).toBe('13 nov');
  });
});

describe('AC3: the updated date', () => {
  const published = new Date('2026-11-12T12:00:00Z');

  it('is shown only when it falls on a later day', () => {
    expect(isUpdatedLater(published, undefined)).toBe(false);
    expect(isUpdatedLater(published, new Date('2026-11-12T20:00:00Z'))).toBe(
      false,
    );
    expect(isUpdatedLater(published, new Date('2026-11-10T12:00:00Z'))).toBe(
      false,
    );
    expect(isUpdatedLater(published, new Date('2026-11-18T12:00:00Z'))).toBe(
      true,
    );
  });

  it('compares São Paulo days across midnight UTC', () => {
    const lateEvening = new Date('2026-11-12T23:30:00-03:00');
    const sameDayUtcNext = new Date('2026-11-13T01:00:00-03:00');
    expect(isUpdatedLater(lateEvening, sameDayUtcNext)).toBe(true);
  });

  it('drops the year when it matches the publish year', () => {
    expect(formatUpdated(published, new Date('2026-11-18T12:00:00Z'))).toBe(
      '18 nov',
    );
    expect(formatUpdated(published, new Date('2027-01-18T12:00:00Z'))).toBe(
      '18 jan 2027',
    );
  });
});
