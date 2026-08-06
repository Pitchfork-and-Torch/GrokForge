"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Label, Card } from "@/components/ui";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("carol@grokforge.demo");
  const [password, setPassword] = useState("demo1234");
  const [handle, setHandle] = useState("x_builder");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
      setError("Login failed. Check email/password (demo: demo1234).");
      return;
    }
    router.push("/dashboard");
    router.refresh();
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
      setError("X demo sign-in failed.");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <Card>
        <h2 className="text-lg font-semibold text-white">Sign in with X (Demo)</h2>
        <p className="mt-1 text-sm text-zinc-400">
          Simulates X OAuth for local MVP. Real X OAuth wires in when app credentials exist.
        </p>
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor="handle">X handle</Label>
            <Input
              id="handle"
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="your_handle"
            />
          </div>
          <Button type="button" disabled={loading} onClick={onXDemo} className="w-full">
            Continue with X (Demo)
          </Button>
        </div>
      </Card>

      <Card>
        <h2 className="text-lg font-semibold text-white">Email fallback</h2>
        <p className="mt-1 text-sm text-zinc-400">
          New emails auto-register. Seed users: alice / bob / carol @grokforge.demo · password{" "}
          <code className="text-sky-300">demo1234</code>
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
            />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <Button type="submit" variant="secondary" disabled={loading} className="w-full">
            {loading ? "Working..." : "Sign in / Register"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
