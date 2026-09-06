import { createClient } from "@/lib/supabase/server";
import { isTripId } from "@/modules/trips/validation";

export type TripMemberRole = "owner" | "member";

export type TripMember = {
  id: string;
  user_id: string;
  role: TripMemberRole;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
};

const TRIP_MEMBER_COLUMNS =
  "id, user_id, role, joined_at, profiles(display_name, avatar_url)";

/**
 * Shape of a raw row from the query below. Without generated Database
 * types, supabase-js has no way to know this is a to-one relation (each
 * trip_members row references exactly one profiles row) and infers the
 * embedded `profiles` field as an array — the same conservative fallback
 * it uses for one-to-many embeds. That inferred type is wrong: confirmed
 * directly against a live PostgREST instance, this embed always comes
 * back as a single JSON object (or null, if profiles_select_trip_member
 * denies it — e.g. a data inconsistency where the member's profile row
 * doesn't exist). This type reflects the verified runtime shape, not the
 * SDK's default inference, and the query result is cast to it below.
 */
type TripMemberRow = {
  id: string;
  user_id: string;
  role: TripMemberRole;
  joined_at: string;
  profiles: { display_name: string; avatar_url: string | null } | null;
};

/**
 * Every member of a trip, with display info resolved from profiles.
 *
 * trip_members_select_member (0003/0007) restricts this to callers who are
 * themselves a member of the trip — a non-member gets an empty list, not
 * an error, which is the correct RLS-enforced outcome.
 *
 * The embedded `profiles(display_name, avatar_url)` relation only resolves
 * because of profiles_select_trip_member (0010): before that policy
 * existed, this exact query would still succeed, but every member's
 * profile would come back null, because PostgREST silently omits (rather
 * than errors on) an RLS-denied embedded relation rather than surfacing a
 * distinct error. Confirmed directly against a live PostgREST instance
 * (not assumed): for a to-one relation like this one, the embed comes back
 * as a single JSON object per row, not an array — the mapping below relies
 * on that shape.
 *
 * Ordered owner-first (role descending — 'owner' sorts after 'member'
 * alphabetically, so descending puts the owner first), then by join order,
 * for a stable and intuitive member-list display.
 *
 * Malformed trip ids return an empty list rather than reaching the
 * database, matching the project's not-found invariant (isTripId comment,
 * trips/validation.ts): a well-formedness check, not an authorization one.
 */
export async function listTripMembers(tripId: string): Promise<TripMember[]> {
  if (!isTripId(tripId)) {
    return [];
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("trip_members")
    .select(TRIP_MEMBER_COLUMNS)
    .eq("trip_id", tripId)
    .order("role", { ascending: false })
    .order("joined_at", { ascending: true });

  if (error) {
    console.error("[memberships] listTripMembers failed", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    });
    throw new Error("Failed to load trip members");
  }

  const rows = (data ?? []) as unknown as TripMemberRow[];

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    role: row.role,
    joined_at: row.joined_at,
    display_name: row.profiles?.display_name ?? "",
    avatar_url: row.profiles?.avatar_url ?? null,
  }));
}
