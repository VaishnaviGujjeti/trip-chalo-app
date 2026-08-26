export type ValidationResult = { valid: true } | { valid: false; error: string };

const TRIP_NAME_MAX_LENGTH = 200;
const TRIP_DESCRIPTION_MAX_LENGTH = 2000;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shape check for a trip id taken from a URL segment or form field. Checked
 * before it reaches the database so a malformed id behaves exactly like a
 * nonexistent one, rather than surfacing a Postgres 22P02 invalid-input error
 * through a different code path — the module's stated invariant is that a
 * caller can never distinguish "no such trip" from "not yours".
 *
 * This is a well-formedness check, not an authorization check: RLS decides
 * whether a well-formed id is actually visible to the caller.
 */
export function isTripId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function validateTripName(name: string): ValidationResult {
  const trimmed = name.trim();
  if (!trimmed) return { valid: false, error: "Trip name is required." };
  if (trimmed.length > TRIP_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Trip name must be ${TRIP_NAME_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { valid: true };
}

/**
 * description is optional (nullable column) — an empty/whitespace-only
 * value is treated as "not provided", not an error.
 */
export function validateTripDescription(description: string): ValidationResult {
  const trimmed = description.trim();
  if (!trimmed) return { valid: true };
  if (trimmed.length > TRIP_DESCRIPTION_MAX_LENGTH) {
    return {
      valid: false,
      error: `Description must be ${TRIP_DESCRIPTION_MAX_LENGTH} characters or fewer.`,
    };
  }
  return { valid: true };
}

/**
 * Parses a strict "YYYY-MM-DD" calendar date (the format produced by an
 * HTML <input type="date">). Rejects anything that isn't exactly that
 * shape, and rejects calendar-invalid dates (e.g. "2026-02-30") instead
 * of letting them silently roll over into the next month. A permissive
 * Date.parse() is deliberately not used here — it accepts many loose
 * formats and does not reject invalid calendar dates consistently
 * across engines.
 */
function parseStrictDate(value: string): number | null {
  if (!DATE_PATTERN.test(value)) return null;

  const [yearStr, monthStr, dayStr] = value.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  const utcMillis = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(utcMillis);

  const isValidCalendarDate =
    roundTrip.getUTCFullYear() === year &&
    roundTrip.getUTCMonth() === month - 1 &&
    roundTrip.getUTCDate() === day;

  return isValidCalendarDate ? utcMillis : null;
}

/**
 * Both dates are optional (nullable columns). Mirrors the DB check
 * constraint `end_date is null or start_date is null or end_date >=
 * start_date` (0002_trips.sql) for a usable client-side error message —
 * the DB constraint remains authoritative regardless of this check.
 */
export function validateTripDates(startDate: string, endDate: string): ValidationResult {
  const trimmedStart = startDate.trim();
  const trimmedEnd = endDate.trim();

  let startMillis: number | null = null;
  if (trimmedStart) {
    startMillis = parseStrictDate(trimmedStart);
    if (startMillis === null) {
      return { valid: false, error: "Start date must be a valid date in YYYY-MM-DD format." };
    }
  }

  let endMillis: number | null = null;
  if (trimmedEnd) {
    endMillis = parseStrictDate(trimmedEnd);
    if (endMillis === null) {
      return { valid: false, error: "End date must be a valid date in YYYY-MM-DD format." };
    }
  }

  if (startMillis !== null && endMillis !== null && endMillis < startMillis) {
    return { valid: false, error: "End date must be on or after the start date." };
  }

  return { valid: true };
}