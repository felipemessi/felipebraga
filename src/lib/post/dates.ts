import { SITE } from '../site';

const MONTHS = [
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
] as const;

export interface DayParts {
  year: number;
  month: number;
  day: number;
}

/**
 * A value at exactly UTC midnight is a date-only value (`2026-11-12`, which the
 * schema reads as UTC midnight): it names a calendar day, not an instant, so it
 * keeps its own day instead of sliding to the evening before in São Paulo.
 */
export function isDateOnly(date: Date): boolean {
  return date.getTime() % 86_400_000 === 0;
}

/** Calendar day of an instant in the site's time zone. */
export function dayParts(
  date: Date,
  timeZone: string = SITE.timeZone,
): DayParts {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: isDateOnly(date) ? 'UTC' : timeZone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date);
  const pick = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value);
  return { year: pick('year'), month: pick('month'), day: pick('day') };
}

function dayNumber({ year, month, day }: DayParts): number {
  return year * 10_000 + month * 100 + day;
}

/** `12 nov 2026`, or `18 nov` when `withYear` is false. */
export function formatDate(
  date: Date,
  withYear = true,
  timeZone: string = SITE.timeZone,
): string {
  const { year, month, day } = dayParts(date, timeZone);
  const text = `${String(day)} ${MONTHS[month - 1] ?? ''}`;
  return withYear ? `${text} ${String(year)}` : text;
}

/** True when `updated` falls on a later calendar day than `published`. */
export function isUpdatedLater(
  published: Date,
  updated: Date | undefined,
  timeZone: string = SITE.timeZone,
): updated is Date {
  if (updated === undefined) return false;
  return (
    dayNumber(dayParts(updated, timeZone)) >
    dayNumber(dayParts(published, timeZone))
  );
}

/** The updated date drops the year when it matches the publish year. */
export function formatUpdated(
  published: Date,
  updated: Date,
  timeZone: string = SITE.timeZone,
): string {
  const sameYear =
    dayParts(published, timeZone).year === dayParts(updated, timeZone).year;
  return formatDate(updated, !sameYear, timeZone);
}
