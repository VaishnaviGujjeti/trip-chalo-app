"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction, type AuthActionState } from "@/modules/auth/actions";

const initialState: AuthActionState = {};

export function LoginForm({ redirectTo }: { redirectTo?: string }) {
  const [state, formAction, isPending] = useActionState(signInAction, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-4 w-full max-w-sm">
      <input type="hidden" name="redirectTo" value={redirectTo ?? "/trips"} />

      <div className="flex flex-col gap-1">
        <label htmlFor="email" className="text-sm font-medium">Email</label>
        <input
          id="email" name="email" type="email" required autoComplete="email"
          className="rounded-md border px-3 py-2"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label htmlFor="password" className="text-sm font-medium">Password</label>
        <input
          id="password" name="password" type="password" required
          autoComplete="current-password" className="rounded-md border px-3 py-2"
        />
      </div>

      {state.error && (
        <p className="text-sm text-red-600" role="alert">{state.error}</p>
      )}

      <button
        type="submit" disabled={isPending}
        className="rounded-md bg-black text-white px-4 py-2 disabled:opacity-50"
      >
        {isPending ? "Signing in..." : "Sign in"}
      </button>

      <p className="text-sm text-gray-600">
        No account? <Link href="/signup" className="underline">Sign up</Link>
      </p>
    </form>
  );
}