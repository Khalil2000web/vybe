"use client";

import Link from "next/link";
import FollowButton from "@/app/components/FollowButton";
import TimeAgo from "@/app/components/TimeAgo";

export default function UserListClient({
  title,
  emptyText,
  users,
  currentUserId,
  followingIds = [],
}) {
  return (
    <main className="container-page">
      <div className="mb-5">
        <Link href="/" className="text-sm text-white/45 hover:text-white">
          ← Back home
        </Link>

        <h1 className="mt-3 text-4xl font-black">{title}</h1>
      </div>

      <section className="space-y-3">
        {users.length === 0 ? (
          <div className="card p-8 text-center text-white/50">{emptyText}</div>
        ) : (
          users.map((profile) => (
            <div
              key={profile.id}
              className="card flex items-center justify-between gap-3 p-4"
            >
              <Link
                href={`/@${profile.username}`}
                className="flex min-w-0 items-center gap-3"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
                  {profile.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt=""
                      className="h-full w-full  pointer-events-none object-cover"
                    />
                  ) : (
                    (profile.display_name || profile.username)
                      ?.charAt(0)
                      ?.toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <p className="truncate font-bold">
                    {profile.display_name || profile.username}
                  </p>
<p className="truncate text-sm text-white/45">
  @{profile.username}
  {profile.followed_at && (
    <>
      {" "}· followed <TimeAgo date={profile.followed_at} />
    </>
  )}
</p>
                </div>
              </Link>

              <FollowButton
                currentUserId={currentUserId}
                targetUserId={profile.id}
                initiallyFollowing={followingIds.includes(profile.id)}
                size="small"
              />
            </div>
          ))
        )}
      </section>
    </main>
  );
}