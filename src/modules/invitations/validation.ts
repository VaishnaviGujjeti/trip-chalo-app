import { validateEmail } from "@/modules/auth/validation";

export type ValidationResult = { valid: true } | { valid: false; error: string };

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Shape check for an invitation id taken from a URL segment, form field, or
 * RPC parameter. Mirrors isTripId (trips/validation.ts) exactly: this is a
 * well-formedness check, not an authorization check. A malformed id is
 * rejected before it reaches the database so it behaves identically to a
 * valid-but-not-yours id — both resolve to "nothing here," never a
 * distinguishable error. That indistinguishability is enforced server-side
 * by get_invited_trip_preview() (0010) and by accept/decline/revoke_invitation
 * (0007); this keeps the client-side guard consistent with it rather than
 * leaking a different signal for a malformed id specifically.
 */
export function isInvitationId(value: string): boolean {
  return UUID_PATTERN.test(value);
}

/**
 * Validates an email address being used to invite someone to a trip.
 * Delegates the actual format check to the shared validator (auth module)
 * rather than re-implementing the regex — this module only supplies
 * invitation-specific copy for the error shown to the person sending the
 * invite.
 */
export function validateInviteeEmail(email: string): ValidationResult {
  const result = validateEmail(email);
  if (!result.valid) {
    return { valid: false, error: "Enter a valid email address to invite." };
  }
  return { valid: true };
}

/**
 * Normalizes an invitee email before it is stored, so the later equality
 * comparison against auth.jwt() ->> 'email' (accept_invitation,
 * decline_invitation, get_invited_trip_preview — all a plain, case-sensitive
 * `is distinct from` on the server) is not sensitive to incidental case or
 * whitespace differences between how the inviter typed the address and how
 * the invitee's own account email is cased. This changes no database
 * behavior; it only makes what gets written match reliably against what the
 * server later compares it to.
 *
 * Not wired into a server action yet — actions are a later, separately
 * approved batch. Provided now so that batch can use it directly rather
 * than requiring a further validation-layer change.
 */
export function normalizeInviteeEmail(email: string): string {
  return email.trim().toLowerCase();
}
