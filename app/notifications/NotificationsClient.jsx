"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Heart,
  LockKeyhole,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import TimeAgo from "@/app/components/TimeAgo";
import { createClient } from "@/app/lib/supabase/client";
import FollowRequestActions from "@/app/components/FollowRequestActions";

function getNotificationIcon(type) {
  if (type === "like") return <Heart size={18} />;
  if (type === "comment") return <MessageCircle size={18} />;
  if (type === "follow") return <UserPlus size={18} />;
  return <Bell size={18} />;
}

function getNotificationText(notification) {
  const actorName =
    notification.actor?.display_name ||
    notification.actor?.username ||
    "Someone";

  if (notification.type === "like") {
    return `${actorName} liked your post`;
  }

  if (notification.type === "comment") {
    return `${actorName} commented on your post`;
  }

  if (notification.type === "follow") {
    return `${actorName} followed you`;
  }

  if (notification.type === "mention") {
    return `${actorName} mentioned you`;
  }

  return "You have a new notification";
}

function getNotificationHref(notification) {
  if (notification.type === "follow" && notification.actor?.username) {
    return `/@${notification.actor.username}`;
  }

  if (notification.post_id) {
    return `/post/${notification.post_id}`;
  }

  if (notification.actor?.username) {
    return `/@${notification.actor.username}`;
  }

  return "/";
}

export default function NotificationsClient({
  initialNotifications,
  initialFollowRequests,
  currentProfile,
}) {
  const supabase = createClient();

  const [notifications, setNotifications] = useState(initialNotifications);
  const [followRequests, setFollowRequests] = useState(initialFollowRequests);
  const [working, setWorking] = useState(false);

  async function markOneRead(notificationId) {
    setNotifications((current) =>
      current.map((item) =>
        item.id === notificationId ? { ...item, is_read: true } : item
      )
    );

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", notificationId)
      .eq("user_id", currentProfile.id);
  }

  async function markAllRead() {
    if (working) return;

    setWorking(true);

    setNotifications((current) =>
      current.map((item) => ({ ...item, is_read: true }))
    );

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", currentProfile.id)
      .eq("is_read", false);

    setWorking(false);
  }

  function removeRequest(requesterId) {
    setFollowRequests((current) =>
      current.filter((row) => row.requester?.id !== requesterId)
    );
  }

  const unreadCount = notifications.filter((item) => !item.is_read).length;
  const requestsCount = followRequests.length;

  return (
    <main className="container-page">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">
            Activity
          </p>

          <h1 className="mt-1 text-4xl font-black">Notifications</h1>

          <p className="mt-2 text-white/50">
            {requestsCount > 0
              ? `${requestsCount} follow request${
                  requestsCount === 1 ? "" : "s"
                } · ${unreadCount} unread`
              : unreadCount > 0
              ? `${unreadCount} unread notification${
                  unreadCount === 1 ? "" : "s"
                }`
              : "You're all caught up."}
          </p>
        </div>

        {notifications.length > 0 && (
          <button
            onClick={markAllRead}
            disabled={working || unreadCount === 0}
            className="btn btn-secondary shrink-0"
          >
            <CheckCheck size={16} />
            Read all
          </button>
        )}
      </div>

      {currentProfile.is_private && (
        <section className="mb-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Follow requests</h2>
              <p className="text-sm text-white/45">
                Approve who can follow you and see your private posts.
              </p>
            </div>

            <div className="flex h-10 min-w-10 items-center justify-center rounded-full bg-white text-sm font-black text-black">
              {requestsCount}
            </div>
          </div>

          {followRequests.length === 0 ? (
            <div className="card p-5 text-center text-white/45">
              No follow requests right now.
            </div>
          ) : (
            <div className="space-y-3">
              {followRequests.map((row) => {
                const requester = row.requester;
                if (!requester) return null;

                return (
                  <div
                    key={requester.id}
                    className="card flex items-center justify-between gap-3 p-4"
                  >
                    <Link
                      href={`/@${requester.username}`}
                      className="flex min-w-0 items-center gap-3"
                    >
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
                        {requester.avatar_url ? (
                          <img
                            src={requester.avatar_url}
                            alt=""
                            className="h-full w-full pointer-events-none object-cover"
                          />
                        ) : (
                          (requester.display_name || requester.username)
                            ?.charAt(0)
                            ?.toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0">
                        <p className="truncate font-bold">
                          {requester.display_name || requester.username}
                        </p>

                       <p className="truncate text-sm text-white/45">
  @{requester.username} · <TimeAgo date={row.created_at} />
</p>
                      </div>
                    </Link>

                    <FollowRequestActions
                      requesterId={requester.id}
                      compact
                      onDone={(status, requesterId) => {
                        removeRequest(requesterId);
                      }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {!currentProfile.is_private && followRequests.length > 0 && (
        <section className="mb-5">
          <div className="card p-5 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white/10">
              <LockKeyhole size={22} />
            </div>

            <h2 className="mt-3 text-xl font-black">
              Follow requests are for private accounts
            </h2>

            <p className="mt-2 text-white/50">
              Turn on private account from your profile editor to use requests.
            </p>
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-2xl font-black">Activity</h2>

        {notifications.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
              <Bell size={26} />
            </div>

            <h2 className="mt-4 text-2xl font-black">No activity yet</h2>

            <p className="mt-2 text-white/50">
              Likes, comments, and follows will appear here.
            </p>
          </div>
        ) : (
          notifications.map((notification) => {
            const href = getNotificationHref(notification);
            const actor = notification.actor;

            return (
              <Link
                key={notification.id}
                href={href}
                onClick={() => markOneRead(notification.id)}
                className={`card flex items-center gap-3 p-4 transition hover:border-white/25 ${
                  notification.is_read ? "opacity-65" : "border-white/25"
                }`}
              >
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
                  {actor?.avatar_url ? (
                    <img
                      src={actor.avatar_url}
                      alt=""
                      className="h-full w-full pointer-events-none object-cover"
                    />
                  ) : (
                    <span className="font-bold">
                      {(actor?.display_name || actor?.username || "?")
                        ?.charAt(0)
                        ?.toUpperCase()}
                    </span>
                  )}

                  <span className="absolute bottom-0 right-0 flex h-6 w-6 items-center justify-center rounded-full border border-black bg-white text-black">
                    {getNotificationIcon(notification.type)}
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold">
                    {getNotificationText(notification)}
                  </p>

                  <p className="mt-1 text-sm text-white/45">
  <TimeAgo date={notification.created_at} />
</p>

{notification.post?.body && (
  <p className="mt-1 line-clamp-1 text-sm text-white/45">
    “{notification.post.body}”
  </p>
)}
                </div>

                {!notification.is_read && (
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-white" />
                )}
              </Link>
            );
          })
        )}
      </section>
    </main>
  );
}