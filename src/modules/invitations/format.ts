/**
 * Formats a timestamptz value (invitations.created_at / responded_at,
 * trip_members.joined_at) as an absolute, deterministic UTC date+time.
 *
 * Deliberately NOT viewer-local: nothing in the project's stated
 * requirements calls for per-viewer local time here, and these components
 * are Server Components — Intl.DateTimeFormat with no `timeZone` resolves
 * to the server runtime's timezone, not the browser's, so an earlier
 * version of this comment claiming "viewer's local time zone" was simply
 * incorrect. Getting genuine viewer-local time right would require a
 * Client Component boundary and would risk a server/client hydration
 * mismatch (the SSR pass and the browser pass would format the same
 * instant differently) for a requirement that was never actually stated.
 *
 * Pinning to UTC explicitly avoids that entirely and matches this
 * project's existing convention in trips/format.ts, which pins UTC for
 * the same determinism reason (there, to avoid a date-only value shifting
 * by a day for viewers in a negative UTC offset). `timeZoneName: "short"`
 * labels the output ("... UTC") so it can't be mistaken for local time.
 */
export function formatInvitationTimestamp(value: string): string {
  const date = new Date(value);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(date);
}