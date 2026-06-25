"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { LockKeyhole, UserMinus, UserPlus } from "lucide-react";

export default function FollowButton({
  currentUserId,
  targetUserId,
  targetIsPrivate = false,
  initiallyFollowing = false,
  initiallyRequested = false,
  onFollowChange,
  size = "default",
}) {
  const router = useRouter();
  const supabase = createClient();

  const [following, setFollowing] = useState(initiallyFollowing);
  const [requested, setRequested] = useState(initiallyRequested);
  const [working, setWorking] = useState(false);

  const isSelf = currentUserId && targetUserId && currentUserId === targetUserId;

  if (isSelf) return null;

  async function toggleFollow() {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    if (!targetUserId || working) return;

    setWorking(true);

    if (following) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUserId)
        .eq("following_id", targetUserId);

      if (!error) {
        setFollowing(false);
        onFollowChange?.(false);

        // Important: if you unfollow a private account,
        // refresh so their private posts disappear immediately.
        if (targetIsPrivate) {
          router.refresh();
        }
      }

      setWorking(false);
      return;
    }

    if (requested) {
      const { error } = await supabase
        .from("follow_requests")
        .delete()
        .eq("requester_id", currentUserId)
        .eq("target_id", targetUserId);

      if (!error) {
        setRequested(false);
        router.refresh();
      }

      setWorking(false);
      return;
    }

    if (targetIsPrivate) {
      const { error } = await supabase.from("follow_requests").insert({
        requester_id: currentUserId,
        target_id: targetUserId,
      });

      if (!error) {
        setRequested(true);
        router.refresh();
      }

      setWorking(false);
      return;
    }

    const { error } = await supabase.from("follows").insert({
      follower_id: currentUserId,
      following_id: targetUserId,
    });

    if (!error) {
      setFollowing(true);
      onFollowChange?.(true);
      router.refresh();
    }

    setWorking(false);
  }

  let label = "Follow";
  let Icon = UserPlus;
  let style = "btn-primary";

  if (following) {
    label = "Following";
    Icon = UserMinus;
    style = "btn-secondary";
  } else if (requested) {
    label = "Requested";
    Icon = LockKeyhole;
    style = "btn-secondary";
  } else if (targetIsPrivate) {
    label = "Request";
    Icon = LockKeyhole;
    style = "btn-primary";
  }

  return (
    <button
      onClick={toggleFollow}
      disabled={working}
      className={`btn ${style} ${
        size === "small" ? "min-h-10 px-4 text-xs" : ""
      }`}
    >
      <Icon size={16} />
      {working ? "..." : label}
    </button>
  );
}