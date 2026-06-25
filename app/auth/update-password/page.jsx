"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function updatePassword(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    if (updateError) {
      setError(updateError.message);
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10">
      <form onSubmit={updatePassword} className="card w-full max-w-md p-6">
        <p className="text-sm uppercase tracking-[0.25em] text-white/40">
          Account safety
        </p>

        <h1 className="mt-2 text-4xl font-black">New password</h1>

        <p className="mt-2 text-sm text-white/50">
          Choose a strong new password for your account.
        </p>

        <div className="mt-7 space-y-3">
          <input
            className="field"
            placeholder="New password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <input
            className="field"
            placeholder="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />

          {error && (
            <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
              {error}
            </p>
          )}

          <button disabled={loading} className="btn btn-primary w-full">
            {loading ? "Saving..." : "Update password"}
          </button>
        </div>
      </form>
    </main>
  );
}