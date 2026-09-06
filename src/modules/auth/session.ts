import { createClient } from "@/lib/supabase/server";

/**
 * The authenticated user's id, taken from the server-verified JWT, or null if
 * there is no valid session.
 *
 * Single definition of "who is the caller" for server-side code. getClaims()
 * verifies the token signature on every call (see src/lib/supabase/proxy.ts);
 * getSession() deliberately is not used here, because it does not.
 *
 * A null return means "not authenticated" — it is never an authorization
 * answer. Whether this user may read or write a given row is decided by RLS in
 * PostgreSQL, not by comparing ids in application code.
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  return data.claims.sub;
}

/**
 * The authenticated user's email, taken from the same server-verified JWT
 * used by getCurrentUserId(), or null if there is no valid session or the
 * claim is absent.
 *
 * Needed wherever application code must narrow a query beyond what RLS
 * already permits — e.g. "invitations addressed to me" is a strict subset
 * of everything invitations RLS lets the caller see (which also includes
 * invitations they sent, or that belong to a trip they own). RLS is the
 * authorization ceiling, not the intended result set for a given screen;
 * the caller's own email is what narrows it correctly.
 *
 * This is the same claim value Postgres reads via `auth.jwt() ->> 'email'`
 * in RLS policies and SECURITY DEFINER functions (0007, 0010) — using it
 * here keeps the client-side filter and the server-side authorization
 * check aligned on the same identity value, rather than trusting a
 * separately-sourced email (e.g. from a form field).
 *
 * `email` is an optional field on the verified JWT payload (a user could in
 * principle authenticate by a method that doesn't set it); a missing claim
 * returns null rather than throwing, matching getCurrentUserId's contract.
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();

  if (error || !data?.claims) {
    return null;
  }

  return data.claims.email ?? null;
}
