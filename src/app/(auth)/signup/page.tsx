import { SignupForm } from "@/modules/auth/components/SignupForm";

export default function SignupPage() {
  return (
    <div className="flex flex-col gap-6 w-full max-w-sm">
      <h1 className="text-2xl font-semibold">Create your Trip Chalo account</h1>
      <SignupForm />
    </div>
  );
}