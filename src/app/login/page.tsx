import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md space-y-6">
      <div className="text-center">
        <h1 className="font-display text-3xl font-bold text-[var(--foreground)]">
          Sign in to ship in public
        </h1>
        <p className="mt-2 text-sm text-[var(--muted)] sm:text-base">
          X identity is the default. Your xAI keys stay on your machine. Reputation and
          capacity live on your dashboard.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
