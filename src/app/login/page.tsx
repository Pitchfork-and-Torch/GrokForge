import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white">Join GrokForge</h1>
        <p className="mt-2 text-stone-400">
          Sign in with X for real identity, or email as fallback. Reputation and capacity live on your
          profile.
        </p>
      </div>

      <LoginForm />
    </div>
  );
}
