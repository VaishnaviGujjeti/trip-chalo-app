import { LoginForm } from "@/modules/auth/components/LoginForm";
import { isSafeRedirectPath } from "@/modules/auth/validation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string }>;
}) {
  const { redirectTo } = await searchParams;
  const safeRedirectTo = isSafeRedirectPath(redirectTo) ? redirectTo : "/trips";

  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <h1 className="text-2xl font-semibold">Sign in to Trip Chalo</h1>
      <LoginForm redirectTo={safeRedirectTo} />
    </div>
  );
}