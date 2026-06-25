"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import TimeAgo from "@/app/components/TimeAgo";
import Link from "next/link";
import {
  Bookmark,
  Heart,
  MessageCircle,
  Trash2,
} from "lucide-react";
import CommentsModal from "./CommentsModal";

function parseStoragePath(mediaUrl) {
  if (!mediaUrl) return null;

  try {
    const url = new URL(mediaUrl);
    const marker = "/storage/v1/object/public/post-media/";
    const index = url.pathname.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
}

export default function PostCard({
  post,
  currentUserId,
  onDeleted,
  onChanged,
  onSavedChange,
}) {
  const router = useRouter();
  const supabase = createClient();

  const author = post.profiles;
  const isOwner = currentUserId === post.user_id;

  const [likesCount, setLikesCount] = useState(0);
  const [commentsCount, setCommentsCount] = useState(0);
  const [liked, setLiked] = useState(false);
  const [saved, setSaved] = useState(false);

  const [loadingActions, setLoadingActions] = useState(true);
  const [working, setWorking] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  async function loadActions() {
    setLoadingActions(true);

    const [
      likesCountResult,
      commentsCountResult,
      likedResult,
      savedResult,
    ] = await Promise.all([
      supabase
        .from("post_likes")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id),

      supabase
        .from("comments")
        .select("*", { count: "exact", head: true })
        .eq("post_id", post.id),

      currentUserId
        ? supabase
            .from("post_likes")
            .select("post_id")
            .eq("post_id", post.id)
            .eq("user_id", currentUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),

      currentUserId
        ? supabase
            .from("saved_posts")
            .select("post_id")
            .eq("post_id", post.id)
            .eq("user_id", currentUserId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

    setLikesCount(likesCountResult.count || 0);
    setCommentsCount(commentsCountResult.count || 0);
    setLiked(Boolean(likedResult.data));
    setSaved(Boolean(savedResult.data));

    setLoadingActions(false);
  }

  useEffect(() => {
    loadActions();
  }, [post.id, currentUserId]);

  function requireLogin() {
    if (!currentUserId) {
      router.push("/auth/login");
      return false;
    }

    return true;
  }

  async function createLikeNotification() {
    if (!currentUserId || currentUserId === post.user_id) return;

    const { data: existing } = await supabase
      .from("notifications")
      .select("id")
      .eq("user_id", post.user_id)
      .eq("actor_id", currentUserId)
      .eq("post_id", post.id)
      .eq("type", "like")
      .maybeSingle();

    if (existing) return;

    await supabase.from("notifications").insert({
      user_id: post.user_id,
      actor_id: currentUserId,
      post_id: post.id,
      type: "like",
    });
  }

  async function toggleLike() {
    if (!requireLogin() || working) return;

    setWorking(true);

    if (liked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId);

      if (!error) {
        setLiked(false);
        setLikesCount((count) => Math.max(0, count - 1));
      }
    } else {
      const { error } = await supabase.from("post_likes").insert({
        post_id: post.id,
        user_id: currentUserId,
      });

      if (!error) {
        setLiked(true);
        setLikesCount((count) => count + 1);
        await createLikeNotification();
      }
    }

    setWorking(false);
  }

  async function toggleSave() {
    if (!requireLogin() || working) return;

    setWorking(true);

    if (saved) {
      const { error } = await supabase
        .from("saved_posts")
        .delete()
        .eq("post_id", post.id)
        .eq("user_id", currentUserId);

      if (!error) {
  setSaved(false);
  onSavedChange?.(false, post.id);
}
    } else {
      const { error } = await supabase.from("saved_posts").insert({
        post_id: post.id,
        user_id: currentUserId,
      });

if (!error) {
  setSaved(true);
  onSavedChange?.(true, post.id);
}
    }

    setWorking(false);
  }

  async function deletePost() {
    if (!isOwner || working) return;

    const ok = window.confirm("Delete this post?");
    if (!ok) return;

    setWorking(true);

    const mediaPath = parseStoragePath(post.media_url);

    const { error } = await supabase
      .from("posts")
      .delete()
      .eq("id", post.id)
      .eq("user_id", currentUserId);

    if (error) {
      alert(error.message);
      setWorking(false);
      return;
    }

    if (mediaPath) {
      await supabase.storage.from("post-media").remove([mediaPath]);
    }

    onDeleted?.(post.id);
    setWorking(false);
  }

  return (
    <>
      <article className="card overflow-hidden">
        <div className="flex items-center justify-between gap-3 p-4">
          <Link
            href={`/@${author?.username}`}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
              {author?.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt=""
                  className="h-full w-full pointer-events-none object-cover"
                />
              ) : (
                <span className="font-bold">
                  {(author?.display_name || author?.username || "?")
                    ?.charAt(0)
                    ?.toUpperCase()}
                </span>
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate font-bold">
                {author?.display_name || author?.username}
              </p>
              <p className="truncate text-sm text-white/40">
  @{author?.username} · <TimeAgo date={post.created_at} />
  {post.visibility === "followers" && " · Followers only"}
</p>
            </div>
          </Link>

          {isOwner && (
            <button
              onClick={deletePost}
              disabled={working}
              className="rounded-full p-2 text-red-300 transition hover:bg-red-500/10 disabled:opacity-40"
            >
              <Trash2 size={18} />
            </button>
          )}
        </div>

        {post.body && (
          <Link href={`/post/${post.id}`}>
            <p className="whitespace-pre-wrap break-words px-4 pb-4 leading-relaxed text-white/90">
              {post.body}
            </p>
          </Link>
        )}

        {post.media_url && post.media_type === "image" && (
          <Link href={`/post/${post.id}`}>
            <img
              src={post.media_url}
              alt=""
              className="max-h-[720px] pointer-events-none w-full object-cover"
            />
          </Link>
        )}

        {post.media_url && post.media_type === "video" && (
          <video
            src={post.media_url}
            controls
            className="max-h-[720px] w-full bg-black object-contain"
          />
        )}

        <div className="flex items-center justify-between border-t border-white/10 p-3">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLike}
              disabled={working || loadingActions}
              className={`btn min-h-10 px-4 ${
                liked ? "btn-primary" : "btn-secondary"
              }`}
            >
              <Heart size={17} fill={liked ? "currentColor" : "none"} />
              {likesCount}
            </button>

            <button
              onClick={() => setCommentsOpen(true)}
              className="btn btn-secondary min-h-10 px-4"
            >
              <MessageCircle size={17} />
              {commentsCount}
            </button>
          </div>

          <button
            onClick={toggleSave}
            disabled={working || loadingActions}
            className={`btn min-h-10 px-4 ${
              saved ? "btn-primary" : "btn-secondary"
            }`}
          >
            <Bookmark size={17} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </article>

      <CommentsModal
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={post.id}
        postOwnerId={post.user_id}
        currentUserId={currentUserId}
        onCommentAdded={() => {
          setCommentsCount((count) => count + 1);
          onChanged?.();
        }}
        onCommentDeleted={() => {
          setCommentsCount((count) => Math.max(0, count - 1));
          onChanged?.();
        }}
      />
    </>
  );
}