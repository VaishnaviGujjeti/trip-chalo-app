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
