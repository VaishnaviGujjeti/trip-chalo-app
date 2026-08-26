/**
 * Small shared display helper — kept separate rather than duplicated
 * across the list and detail pages, which both need it.
 *
 * Trip dates are date-only columns (no time component). Parsing as
 * midnight UTC and formatting with timeZone: "UTC" pinned avoids a
 * local-timezone off-by-one: without the pin, a viewer in a negative
 * UTC offset would see the date shifted back by a day.
 */
function formatCalendarDate(value: string): string {
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function formatTripDateRange(start: string | null, end: string | null): string {
  if (!start && !end) return "No dates set";
  if (start && end) return `${formatCalendarDate(start)} – ${formatCalendarDate(end)}`;
  return start ? `From ${formatCalendarDate(start)}` : `Until ${formatCalendarDate(end as string)}`;
}