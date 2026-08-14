"use client";

import { signIn } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Card } from "@/components/ui";

type Flags = {
  twitterConfigured: boolean;
  demoAuthEnabled: boolean;
};

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [handle, setHandle] = useState("x_builder");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [flags, setFlags] = useState<Flags>({
    twitterConfigured: false,
    demoAuthEnabled: false,
  });
  const [showDemo, setShowDemo] = useState(false);

  useEffect(() => {
    fetch("/api/auth/flags")
      .then((r) => r.json())
      .then((j: Flags) => setFlags(j))
      .catch(() => {});

    // Auth.js redirects here with ?error=AccessDenied etc. when pages.error = /login
    try {
      const params = new URLSearchParams(window.location.search);
      const authErr = params.get("error");
      if (authErr) {
        const friendly: Record<string, string> = {
          AccessDenied:
            "X approved you, but GrokForge could not finish sign-in. Try Sign in with X again.",
          OAuthAccountNotLinked:
            "That X account email is already tied to another login. Use the original method, or email support.",
          Configuration: "Auth is misconfigured. Try again in a minute.",
          OAuthCallback: "X returned an error on callback. Retry Continue with X.",
          Default: "Sign-in failed. Try again.",
        };
        setError(friendly[authErr] || friendly.Default + ` (${authErr})`);
      }
    } catch {
      /* ignore */
    }
  }, []);

  async function onEmail(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      mode: "email",
      email,
      password,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Login failed. Check email/password.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  async function onXReal() {
    setLoading(true);
    setError(null);
    // Full redirect to X OAuth
    await signIn("twitter", { callbackUrl: "/dashboard" });
  }

  async function onXDemo() {
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", {
      mode: "x-demo",
      handle,
      name: handle,
      redirect: false,
    });
    setLoading(false);
    if (res?.error) {
      setError("Demo sign-in failed or disabled.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <Card>
        <h2 className="text-lg font-semibold text-white">Sign in with X</h2>
        <p className="mt-1 text-sm text-stone-400">
          Primary path for GrokForge. Uses real X OAuth - your handle and avatar, no password
          stored here. We never ask for your SuperGrok or xAI API keys.
        </p>
        <div className="mt-4 space-y-3">
          {flags.twitterConfigured ? (
            <Button
              type="button"
              disabled={loading}
              onClick={onXReal}
              className="w-full rounded-full bg-amber-500 py-3 text-base font-bold text-black shadow-[0_0_28px_rgba(245, 158, 11,0.45)] hover:bg-amber-400"
            >
              {loading ? "Redirecting to X..." : "Sign in with X"}
            </Button>
          ) : (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
              Real X OAuth is not configured on this environment yet (missing{" "}
              <code className="text-amber-200">AUTH_TWITTER_ID</code> /{" "}
              <code className="text-amber-200">AUTH_TWITTER_SECRET</code>). Use email below, or
              enable local demo.
            </div>
          )}
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Email fallback</h2>
        <p className="mt-1 text-sm text-stone-400">
          Optional fallback. Prefer Sign in with X for real handle + avatar. New emails
          auto-register with a password (min 6 characters).
        </p>
        <form onSubmit={onEmail} className="mt-4 space-y-3">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button type="submit" variant="secondary" disabled={loading} className="w-full">
            {loading ? "Working..." : "Sign in / Register with email"}
          </Button>
        </form>
      </Card>

      {flags.demoAuthEnabled && (
        <Card className="border-white/5 opacity-95">
          <button
            type="button"
            className="text-left text-xs font-medium uppercase tracking-wide text-stone-500 hover:text-stone-300"
            onClick={() => setShowDemo((v) => !v)}
          >
            {showDemo ? "Hide" : "Show"} developer demo sign-in
          </button>
          {showDemo && (
            <div className="mt-3 space-y-3">
              <p className="text-sm text-stone-500">
                Local / preview only. Anyone can claim any handle - not real X identity.
              </p>
              <div>
                <Label htmlFor="handle">Demo handle</Label>
                <Input
                  id="handle"
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="your_handle"
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                onClick={onXDemo}
                className="w-full"
              >
                Continue with X (Demo)
              </Button>
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
