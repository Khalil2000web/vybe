"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import {
  LockKeyhole,
  LogOut,
  Save,
  Shield,
  Trash2,
  UserRound,
} from "lucide-react";

export default function SettingsClient({ profile, settings }) {
  const router = useRouter();
  const supabase = createClient();

  const [allowMessages, setAllowMessages] = useState(
    settings?.allow_messages ?? true
  );
  const [showActivity, setShowActivity] = useState(
    settings?.show_activity ?? true
  );

  const [saving, setSaving] = useState(false);
  const [passwordSending, setPasswordSending] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteUsername, setDeleteUsername] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canDelete =
    deleteUsername.trim().toLowerCase() === profile.username.toLowerCase() &&
    deletePassword.length > 0;

  async function saveSettings() {
    setSaving(true);
    setError("");
    setSuccess("");

    const { error: settingsError } = await supabase
      .from("user_settings")
      .update({
        allow_messages: allowMessages,
        show_activity: showActivity,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", profile.id);

    if (settingsError) {
      setError(settingsError.message);
      setSaving(false);
      return;
    }

    setSuccess("Settings saved.");
    setSaving(false);
    router.refresh();
  }

  async function sendPasswordReset() {
    setPasswordSending(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.email) {
      setError("Could not find your email.");
      setPasswordSending(false);
      return;
    }

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      user.email,
      {
        redirectTo: `${window.location.origin}/auth/update-password`,
      }
    );

    if (resetError) {
      setError(resetError.message);
      setPasswordSending(false);
      return;
    }

    setSuccess("Password reset email sent.");
    setPasswordSending(false);
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  async function deleteAccount() {
    if (!canDelete || deleting) return;

    const ok = window.confirm(
      "This will permanently delete your account, profile, posts, comments, likes, follows, saved posts, notifications, and uploaded media. This cannot be undone."
    );

    if (!ok) return;

    setDeleting(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      setError("Could not verify your account.");
      setDeleting(false);
      return;
    }

    const { error: passwordError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: deletePassword,
    });

    if (passwordError) {
      setError("Password is incorrect.");
      setDeleting(false);
      return;
    }

    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ confirm: "DELETE_ACCOUNT" }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "Failed to delete account.");
      setDeleting(false);
      return;
    }

    await supabase.auth.signOut();

    router.push("/auth/signup");
    router.refresh();
  }

  return (
    <main className="container-page">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.22em] text-white/40">
          Account control
        </p>

        <h1 className="mt-1 text-4xl font-black">Settings</h1>

        <p className="mt-2 text-white/50">
          General preferences and account safety.
        </p>
      </div>

      {error && (
        <p className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {success && (
        <p className="mb-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
          {success}
        </p>
      )}

      <section className="hidden">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <UserRound size={20} />
          </div>

          <div>
            <h2 className="text-2xl font-black">Public profile</h2>
            <p className="text-sm text-white/45">
              Username, bio, avatar, cover, and links are edited from your
              profile page.
            </p>
          </div>
        </div>

        <Link href={`/@${profile.username}`} className="btn btn-primary w-full">
          Open profile editor
        </Link>
      </section>

      <section className="card mb-5 p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <Shield size={20} />
          </div>

          <div>
            <h2 className="text-2xl font-black flex items-center justify-center gap-2">General preferences<span className="rounded-2xl text-xs text-black bg-yellow-400 py-1 px-2">SOON</span></h2>
            <p className="text-sm text-white/45">
              Control simple app preferences.
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => setAllowMessages((value) => !value)}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left"
          >
            <span>
              <span className="block font-bold">Allow messages</span>
              <span className="text-sm text-white/45">
                This will be used when direct messages are added.
              </span>
            </span>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${
                allowMessages
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {allowMessages ? "On" : "Off"}
            </span>
          </button>

          <button
            onClick={() => setShowActivity((value) => !value)}
            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left"
          >
            <span>
              <span className="block font-bold">Show activity</span>
              <span className="text-sm text-white/45">
                This will be used when activity status is added.
              </span>
            </span>

            <span
              className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${
                showActivity
                  ? "bg-white text-black"
                  : "bg-white/10 text-white/50"
              }`}
            >
              {showActivity ? "On" : "Off"}
            </span>
          </button>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn btn-primary w-full"
          >
            <Save size={16} />
            {saving ? "Saving..." : "Save settings"}
          </button>
        </div>
      </section>

      <section className="card mb-5 p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10">
            <LockKeyhole size={20} />
          </div>

          <div>
            <h2 className="text-2xl font-black">Account safety</h2>
            <p className="text-sm text-white/45">Keep your login safe.</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={sendPasswordReset}
            disabled={passwordSending}
            className="btn btn-secondary w-full"
          >
            {passwordSending ? "Sending..." : "Send password reset email"}
          </button>

          <button onClick={logout} className="btn btn-secondary w-full">
            <LogOut size={16} />
            Log out
          </button>
        </div>
      </section>

      <section className="card mb-5 border-red-400/20 bg-red-500/[0.04] p-5">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/15 text-red-200">
            <Trash2 size={20} />
          </div>

          <div>
            <h2 className="text-2xl font-black text-red-100">Danger zone</h2>
            <p className="text-sm text-red-100/55">
              Permanently delete your account and all related data.
            </p>
          </div>
        </div>

        {!deleteOpen ? (
          <button
            onClick={() => {
              setError("");
              setSuccess("");
              setDeleteOpen(true);
            }}
            className="btn btn-danger w-full"
          >
            <Trash2 size={16} />
            Delete account
          </button>
        ) : (
          <div className="space-y-3">
            <div className="rounded-2xl border border-red-400/20 bg-red-500/10 p-4 text-sm text-red-100/80">
              This is permanent. Your account, posts, comments, likes, follows,
              saved posts, notifications, avatar, cover, and uploaded media will
              be deleted.
            </div>

            <label className="block">
              <p className="mb-2 text-sm uppercase text-red-100/60">
                Type your username to confirm
              </p>

              <input
                className="field border-red-400/20 bg-red-500/5"
                value={deleteUsername}
                onChange={(e) => setDeleteUsername(e.target.value)}
                placeholder={profile.username}
              />
            </label>

            <label className="block">
              <p className="mb-2 text-sm uppercase text-red-100/60">
                Enter your password
              </p>

              <input
                className="field border-red-400/20 bg-red-500/5"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Password"
                autoComplete="current-password"
              />
            </label>

            <button
              onClick={deleteAccount}
              disabled={!canDelete || deleting}
              className="btn btn-danger w-full"
            >
              <Trash2 size={16} />
              {deleting ? "Deleting..." : "Permanently delete account"}
            </button>

            <button
              onClick={() => {
                setDeleteOpen(false);
                setDeleteUsername("");
                setDeletePassword("");
              }}
              disabled={deleting}
              className="btn btn-secondary w-full"
            >
              Cancel
            </button>
          </div>
        )}
      </section>
    </main>
  );
}