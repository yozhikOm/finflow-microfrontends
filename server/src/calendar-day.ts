// Календарный день `YYYY-MM-DD` (ADR-0003). Такая строка сравнивается и
// сортируется лексикографически так же, как хронологически.

const CALENDAR_DAY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Строка ровно `YYYY-MM-DD`, и такой день есть в календаре. */
export const isCalendarDay = (value: string): boolean => {
  const match = CALENDAR_DAY.exec(value);

  if (!match) return false;

  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
};

/** Календарный день, на который приходится момент `instant` в поясе `timeZone`. */
export const calendarDayIn = (instant: Date, timeZone: string): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value;

  return `${part('year')}-${part('month')}-${part('day')}`;
};
