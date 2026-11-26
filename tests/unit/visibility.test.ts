import { describe, expect, it } from 'vitest';
import { filterPublished, isPublished } from '../../src/lib/content/visibility';

const now = new Date('2026-12-01T12:00:00Z');
const past = new Date('2026-11-01T12:00:00Z');
const future = new Date('2027-01-01T12:00:00Z');

describe('AC8: isPublished', () => {
  it('publishes a non-draft with a past date', () => {
    expect(isPublished({ draft: false, publishDate: past }, now)).toBe(true);
  });

  it('counts the exact instant as published', () => {
    expect(isPublished({ draft: false, publishDate: now }, now)).toBe(true);
  });

  it('compares instants, not wall-clock times, across offsets', () => {
    const sameInstant = new Date('2026-12-01T09:00:00-03:00');
    expect(isPublished({ draft: false, publishDate: sameInstant }, now)).toBe(
      true,
    );
    const oneSecondLater = new Date('2026-12-01T09:00:01-03:00');
    expect(
      isPublished({ draft: false, publishDate: oneSecondLater }, now),
    ).toBe(false);
  });

  it('holds back a scheduled post', () => {
    expect(isPublished({ draft: false, publishDate: future }, now)).toBe(false);
  });

  it('never publishes a draft, even with a past date', () => {
    expect(isPublished({ draft: true, publishDate: past }, now)).toBe(false);
  });

  it('applies only draft when there is no publishDate', () => {
    expect(isPublished({ draft: false }, now)).toBe(true);
    expect(isPublished({ draft: true }, now)).toBe(false);
  });
});

describe('AC9: filterPublished', () => {
  it('keeps published entries in their original order', () => {
    const entries = [
      { id: 'a', data: { draft: false, publishDate: past } },
      { id: 'b', data: { draft: true, publishDate: past } },
      { id: 'c', data: { draft: false, publishDate: future } },
      { id: 'd', data: { draft: false, publishDate: now } },
    ];
    expect(filterPublished(entries, now).map((e) => e.id)).toEqual(['a', 'd']);
  });

  it('returns an empty list for no entries', () => {
    expect(filterPublished([], now)).toEqual([]);
  });
});
