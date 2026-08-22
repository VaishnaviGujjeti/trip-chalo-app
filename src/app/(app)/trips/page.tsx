import { createClient } from "@/lib/supabase/server";

export default async function TripsPage() {
  const supabase = await createClient();
  // Layout above already guarantees valid claims before this renders.
  const { data } = await supabase.auth.getClaims();
  const claims = data!.claims;

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", claims.sub)
    .single();

  return (
    <div>
      <h1 className="text-xl font-semibold">
        Welcome, {profile?.display_name ?? claims.email}
      </h1>
      <p className="text-gray-600 mt-2">
        Signed in as {claims.email}. Trip management arrives in Phase 4.
      </p>
    </div>
  );
}