import { signOutAction } from "@/modules/auth/actions";

export function SignOutButton() {
  return (
    <form action={signOutAction}>
      <button type="submit" className="text-sm underline">
        Sign out
      </button>
    </form>
  );
}