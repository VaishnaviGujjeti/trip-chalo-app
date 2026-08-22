"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  validateEmail,
  validatePassword,
  validateDisplayName,
  isSafeRedirectPath,
} from "./validation";

export type AuthActionState = {
  error?: string;
  success?: string;
};

/**
 * Resolves the site's own origin for building auth redirect URLs.
 * Deliberately does NOT read the request's Origin header — that value is
 * client-supplied and could be manipulated, and this URL gets emailed to
 * the user, so it must come from server-controlled configuration only.
 * Priority: NEXT_PUBLIC_SITE_URL (explicit, authoritative) ->
 * VERCEL_URL (automatic on Vercel deployments, no protocol prefix) -> null.
 */
function resolveSiteOrigin(): string | null {
  if (process.env.NEXT_PUBLIC_SITE_URL) {
    return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  }

  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  return null;
}

export async function signUpAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  const displayName = String(formData.get("displayName") ?? "");

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) return { error: emailCheck.error };

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.valid) return { error: passwordCheck.error };

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const nameCheck = validateDisplayName(displayName);
  if (!nameCheck.valid) return { error: nameCheck.error };

  const origin = resolveSiteOrigin();
  if (!origin) {
    return {
      error:
        "Could not determine the application URL to send a confirmation link. Set NEXT_PUBLIC_SITE_URL and try again.",
    };
  }

  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: {
      data: { display_name: displayName.trim() },
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  if (data.user && !data.session) {
    return {
      success: "Account created. Check your email to confirm before signing in.",
    };
  }

  redirect("/trips");
}

export async function signInAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const requestedRedirect = String(formData.get("redirectTo") ?? "");

  const emailCheck = validateEmail(email);
  if (!emailCheck.valid) return { error: emailCheck.error };
  if (!password) return { error: "Password is required." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    return { error: error.message };
  }

  const destination = isSafeRedirectPath(requestedRedirect)
    ? requestedRedirect
    : "/trips";

  redirect(destination);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}