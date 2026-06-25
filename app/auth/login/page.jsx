"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const { error: loginError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (loginError) {
      setError(loginError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <form onSubmit={handleLogin} className="card w-full max-w-md p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-white/40">
          Welcome back
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Log in
        </h1>

        <div className="mt-7 space-y-3">
          <input
            className="field"
            placeholder="Email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="field"
            placeholder="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          {error && (
            <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button disabled={loading} className="btn btn-primary w-full">
            {loading ? "Logging in..." : "Log in"}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-white/50">
          New here?{" "}
          <Link href="/auth/signup" className="text-white underline">
            Create account
          </Link>
        </p>
      </form>
    </main>
  );
}