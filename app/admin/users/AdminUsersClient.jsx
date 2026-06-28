"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { Dialog, Transition } from "@headlessui/react";
import {
  AlertTriangle,
  BadgeCheck,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import VerifiedBadge from "@/app/components/VerifiedBadge";

export default function AdminUsersClient({ currentProfile }) {
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState([]);
  const [note, setNote] = useState("Verified by VYBE");
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState("");
  const [error, setError] = useState("");

  const [verificationConfirm, setVerificationConfirm] = useState(null);
  const [confirmUsername, setConfirmUsername] = useState("");

  useEffect(() => {
    let ignore = false;

    async function searchUsers() {
      const cleanQuery = query.trim();

      if (!cleanQuery) {
        setUsers([]);
        return;
      }

      setLoading(true);
      setError("");

      const response = await fetch(
        `/api/admin/users/search?q=${encodeURIComponent(cleanQuery)}`
      );

      const result = await response.json().catch(() => ({}));

      if (ignore) return;

      if (!response.ok) {
        setError(result.error || "Failed to search users.");
        setLoading(false);
        return;
      }

      setUsers(result.users || []);
      setLoading(false);
    }

    const timer = setTimeout(searchUsers, 250);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query]);

  function openVerificationConfirm(user, isVerified) {
    setError("");
    setConfirmUsername("");
    setVerificationConfirm({
      user,
      isVerified,
    });
  }

  function closeVerificationConfirm() {
    if (workingId) return;

    setVerificationConfirm(null);
    setConfirmUsername("");
  }

  async function setVerification(userId, isVerified) {
    setWorkingId(userId);
    setError("");

    const response = await fetch("/api/admin/users/verify", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_id: userId,
        is_verified: isVerified,
        note,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "Failed to update verification.");
      setWorkingId("");
      return false;
    }

    setUsers((current) =>
      current.map((user) => (user.id === userId ? result.user : user))
    );

    setWorkingId("");
    return true;
  }

  async function confirmVerificationAction() {
    if (!verificationConfirm?.user) return;

    const ok = await setVerification(
      verificationConfirm.user.id,
      verificationConfirm.isVerified
    );

    if (ok) {
      setVerificationConfirm(null);
      setConfirmUsername("");
    }
  }

  const confirmUser = verificationConfirm?.user || null;
  const confirmIsVerify = Boolean(verificationConfirm?.isVerified);

  const typedUsername = confirmUsername.trim().replace(/^@/, "").toLowerCase();
  const targetUsername = String(confirmUser?.username || "").toLowerCase();

  const canConfirm =
    Boolean(confirmUser) &&
    typedUsername === targetUsername &&
    workingId !== confirmUser?.id;

  return (
    <main className="container-page">
      <section className="card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/10">
            <ShieldCheck size={22} />
          </div>

          <div>
            <h1 className="text-3xl font-black">User verification</h1>
            <p className="mt-2 text-white/50">
              Search users and give or remove the verified badge.
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3">
          <label className="block">
            <p className="mb-2 text-sm uppercase text-white/45">Search user</p>

            <div className="relative">
              <Search
                size={18}
                className="hidden pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
              />

              <input
                className="field"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="username or display name"
              />
            </div>
          </label>

          <label className="block">
            <p className="mb-2 text-sm uppercase text-white/45">
              Verification note
            </p>

            <input
              className="field"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Verified by VYBE"
              maxLength={120}
            />
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}
      </section>

      <section className="mt-5 space-y-3">
        {loading && (
          <div className="card p-5 text-white/50">Searching users...</div>
        )}

        {!loading && query.trim() && users.length === 0 && (
          <div className="card p-8 text-center">
            <h2 className="text-2xl font-black">No users found</h2>
            <p className="mt-2 text-white/50">
              Try searching another username.
            </p>
          </div>
        )}

        {users.map((user) => {
          const isWorking = workingId === user.id;

          return (
            <div
              key={user.id}
              className="card flex items-center justify-between gap-4 p-4"
            >
              <Link
                href={`/@${user.username}`}
                className="flex min-w-0 items-center gap-3"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (user.display_name || user.username || "?")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-black">
                    <span className="truncate">
                      {user.display_name || user.username}
                    </span>

                    {user.is_verified && <VerifiedBadge size={15} />}
                  </p>

                  <p className="truncate text-sm text-white/45">
                    @{user.username}
                    {user.role ? ` · ${user.role}` : ""}
                  </p>

                  {user.verification_note && (
                    <p className="mt-1 truncate text-xs text-white/35">
                      {user.verification_note}
                    </p>
                  )}
                </div>
              </Link>

              {user.is_verified ? (
                <button
                  onClick={() => openVerificationConfirm(user, false)}
                  disabled={isWorking}
                  className="btn btn-danger shrink-0"
                >
                  {isWorking ? "Updating..." : "Remove"}
                </button>
              ) : (
                <button
                  onClick={() => openVerificationConfirm(user, true)}
                  disabled={isWorking}
                  className="btn btn-primary shrink-0"
                >
                  <BadgeCheck size={16} />
                  {isWorking ? "Updating..." : "Verify"}
                </button>
              )}
            </div>
          );
        })}
      </section>

      <Transition appear show={Boolean(verificationConfirm)} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-[99999]"
          onClose={closeVerificationConfirm}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/80 backdrop-blur-xl" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95 translate-y-4"
                enterTo="opacity-100 scale-100 translate-y-0"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100 translate-y-0"
                leaveTo="opacity-0 scale-95 translate-y-4"
              >
                <Dialog.Panel className="card w-full max-w-lg overflow-hidden p-0">
                  <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
                    <div className="flex items-start gap-3">
                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full ${
                          confirmIsVerify
                            ? "bg-sky-500/15 text-sky-200"
                            : "bg-red-500/15 text-red-200"
                        }`}
                      >
                        {confirmIsVerify ? (
                          <BadgeCheck size={23} />
                        ) : (
                          <AlertTriangle size={23} />
                        )}
                      </div>

                      <div>
                        <Dialog.Title className="text-2xl font-black">
                          {confirmIsVerify
                            ? "Verify this user?"
                            : "Remove verification?"}
                        </Dialog.Title>

                        <p className="mt-2 text-sm leading-6 text-white/55">
                          {confirmIsVerify
                            ? "This will show the verified badge on this user’s profile and posts."
                            : "This will remove the verified badge from this user’s profile and posts."}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={closeVerificationConfirm}
                      disabled={Boolean(workingId)}
                      className="rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
                    >
                      <X size={19} />
                    </button>
                  </div>

                  {confirmUser && (
                    <div className="p-5">
                      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
                            {confirmUser.avatar_url ? (
                              <img
                                src={confirmUser.avatar_url}
                                alt=""
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              (
                                confirmUser.display_name ||
                                confirmUser.username ||
                                "?"
                              )
                                .charAt(0)
                                .toUpperCase()
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="flex items-center gap-1 font-black">
                              <span className="truncate">
                                {confirmUser.display_name ||
                                  confirmUser.username}
                              </span>

                              {confirmUser.is_verified && (
                                <VerifiedBadge size={15} />
                              )}
                            </p>

                            <p className="truncate text-sm text-white/45">
                              @{confirmUser.username}
                              {confirmUser.role ? ` · ${confirmUser.role}` : ""}
                            </p>
                          </div>
                        </div>
                      </div>

                      <label className="mt-5 block">
                        <p className="mb-2 text-sm uppercase text-white/45">
                          Type username to confirm
                        </p>

                        <input
                          className="field"
                          value={confirmUsername}
                          onChange={(e) => setConfirmUsername(e.target.value)}
                          placeholder={`Type ${confirmUser.username}`}
                          autoFocus
                        />

                        <p className="mt-2 text-xs text-white/35">
                          You must type{" "}
                          <span className="font-bold text-white">
                            @{confirmUser.username}
                          </span>{" "}
                          exactly before continuing.
                        </p>
                      </label>

                      <div className="mt-5 grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={closeVerificationConfirm}
                          disabled={Boolean(workingId)}
                          className="btn btn-secondary w-full"
                        >
                          Cancel
                        </button>

                        <button
                          type="button"
                          onClick={confirmVerificationAction}
                          disabled={!canConfirm}
                          className={`btn w-full ${
                            confirmIsVerify ? "btn-primary" : "btn-danger"
                          }`}
                        >
                          {workingId === confirmUser.id
                            ? "Updating..."
                            : confirmIsVerify
                            ? "Verify user"
                            : "Remove badge"}
                        </button>
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </main>
  );
}