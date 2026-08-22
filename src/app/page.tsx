import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const isAuthenticated = !error && !!data?.claims;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center">
      <h1 className="text-3xl font-bold">Trip Chalo</h1>
      <p className="text-gray-600 max-w-md">
        A private shared memory space for the trips you take with people who matter.
      </p>
      {isAuthenticated ? (
        <Link href="/trips" className="rounded-md bg-black text-white px-5 py-2.5">
          Go to your trips
        </Link>
      ) : (
        <div className="flex gap-3">
          <Link href="/login" className="rounded-md border px-5 py-2.5">Sign in</Link>
          <Link href="/signup" className="rounded-md bg-black text-white px-5 py-2.5">Sign up</Link>
        </div>
      )}
    </div>
  );
}