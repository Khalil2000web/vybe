"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";

const usernameRegex = /^[a-z0-9_]{3,24}$/;

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signup(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    const cleanUsername = username.toLowerCase().trim().replace(/^@/, "");
    const cleanEmail = email.trim().toLowerCase();

    if (!usernameRegex.test(cleanUsername)) {
      setError(
        "Username must be 3-24 characters. Use letters, numbers, and underscores only."
      );
      setLoading(false);
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    const { data: usernameAvailable, error: usernameCheckError } =
      await supabase.rpc("is_username_available", {
        p_username: cleanUsername,
        p_email: cleanEmail,
      });

    if (usernameCheckError) {
      setError(usernameCheckError.message);
      setLoading(false);
      return;
    }

    if (!usernameAvailable) {
      setError(
        "This username is unavailable or reserved. Contact support if you want to request it."
      );
      setLoading(false);
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          username: cleanUsername,
          display_name: displayName.trim() || cleanUsername,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <form onSubmit={signup} className="card w-full max-w-md p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-white/40">
          Create account
        </p>

        <h1 className="mt-2 text-4xl font-black">
          Join {process.env.NEXT_PUBLIC_APP_NAME || "CARTYR"}
        </h1>

        <p className="mt-2 text-sm text-white/50">
          Create your profile and start posting.
        </p>

        <div className="mt-7 space-y-3">
          <input
            className="field"
            placeholder="Display name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={40}
          />

          <input
            className="field"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={24}
            required
          />

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
            autoComplete="new-password"
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
            {loading ? "Creating..." : "Create account"}
          </button>
        </div>

        <p className="mt-5 text-center text-sm text-white/45">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-white underline">
            Log in
          </Link>
        </p>
      </form>
    </main>
  );
}