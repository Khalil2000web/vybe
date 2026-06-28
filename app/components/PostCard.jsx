"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Dialog, Transition } from "@headlessui/react";
import { useRouter } from "next/navigation";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import PostComposerTextarea from "@/app/components/PostComposerTextarea";
import {
  Bookmark,
  Edit3,
  Heart,
  MessageCircle,
  MessageCircleOff,
  MoreHorizontal,
  Share2,
  Trash2,
  X,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import CommentsModal from "@/app/components/CommentsModal";
import TimeAgo from "@/app/components/TimeAgo";
import PostMediaCarousel from "@/app/components/PostMediaCarousel";
import PostText from "@/app/components/PostText";
import VerifiedBadge from "@/app/components/VerifiedBadge";

function getMediaItems(post) {
  const mediaFromTable = Array.isArray(post?.post_media)
    ? [...post.post_media]
        .filter((item) => item.media_url && item.media_type)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : [];

  if (mediaFromTable.length > 0) return mediaFromTable;

  if (post?.media_url && post?.media_type) {
    return [
      {
        id: `${post.id}-single-media`,
        media_url: post.media_url,
        media_type: post.media_type,
        sort_order: 0,
        synthetic: true,
      },
    ];
  }

  return [];
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
  const menuRef = useRef(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const [localPost, setLocalPost] = useState(post);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const author = localPost.profiles;
  const mediaItems = useMemo(() => getMediaItems(localPost), [localPost]);

  const [likesCount, setLikesCount] = useState(Number(post.likes_count || 0));
  const [commentsCount, setCommentsCount] = useState(
    Number(post.comments_count || 0)
  );
  const [liked, setLiked] = useState(Boolean(post.is_liked_by_me));
  const [saved, setSaved] = useState(Boolean(post.is_saved_by_me));

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  const [editBody, setEditBody] = useState(localPost.body || "");
  const [mediaToRemove, setMediaToRemove] = useState([]);

  const isOwner = currentUserId && localPost.user_id === currentUserId;
  const commentsClosed = localPost.comments_status === "closed";

  useEffect(() => {
    setLocalPost(post);
    setEditBody(post.body || "");
    setMediaToRemove([]);

    setLikesCount(Number(post.likes_count || 0));
    setCommentsCount(Number(post.comments_count || 0));
    setLiked(Boolean(post.is_liked_by_me));
    setSaved(Boolean(post.is_saved_by_me));
  }, [post]);

  useEffect(() => {
  if (!menuOpen) return;

  function handleClickOutside(event) {
    if (!menuRef.current) return;

    if (!menuRef.current.contains(event.target)) {
      setMenuOpen(false);
    }
  }

  function handleEscape(event) {
    if (event.key === "Escape") {
      setMenuOpen(false);
    }
  }

  document.addEventListener("mousedown", handleClickOutside);
  document.addEventListener("touchstart", handleClickOutside);
  document.addEventListener("keydown", handleEscape);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("touchstart", handleClickOutside);
    document.removeEventListener("keydown", handleEscape);
  };
}, [menuOpen]);

  async function toggleLike() {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    if (working) return;

    setWorking(true);

    if (liked) {
      const { error } = await supabase
        .from("post_likes")
        .delete()
        .eq("post_id", localPost.id)
        .eq("user_id", currentUserId);

      if (!error) {
        setLiked(false);
        setLikesCount((count) => Math.max(0, count - 1));
        onChanged?.();
      }

      setWorking(false);
      return;
    }

    const { error } = await supabase.from("post_likes").insert({
      post_id: localPost.id,
      user_id: currentUserId,
    });

    if (!error) {
      setLiked(true);
      setLikesCount((count) => count + 1);
      onChanged?.();
    }

    setWorking(false);
  }

  async function toggleSave() {
    if (!currentUserId) {
      router.push("/auth/login");
      return;
    }

    if (working) return;

    setWorking(true);

    if (saved) {
      const { error } = await supabase
        .from("saved_posts")
        .delete()
        .eq("post_id", localPost.id)
        .eq("user_id", currentUserId);

      if (!error) {
        setSaved(false);
        onSavedChange?.(false, localPost.id);
      }

      setWorking(false);
      return;
    }

    const { error } = await supabase.from("saved_posts").insert({
      post_id: localPost.id,
      user_id: currentUserId,
    });

    if (!error) {
      setSaved(true);
      onSavedChange?.(true, localPost.id);
    }

    setWorking(false);
  }

  async function deletePost() {
  if (!isOwner || working) return;

  setWorking(true);
  setError("");

  const response = await fetch(`/api/posts/${localPost.id}`, {
    method: "DELETE",
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    setError(result.error || "Failed to delete post.");
    setWorking(false);
    setDeleteConfirmOpen(false);
    return;
  }

  setDeleteConfirmOpen(false);
  onDeleted?.(localPost.id);
  router.refresh();
}

  async function toggleCommentsStatus() {
    if (!isOwner || working) return;

    setWorking(true);
    setError("");

    const nextStatus = commentsClosed ? "open" : "closed";

    const response = await fetch(`/api/posts/${localPost.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: localPost.body || "",
        comments_status: nextStatus,
        remove_media_ids: [],
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "Failed to update post.");
      setWorking(false);
      return;
    }

    setLocalPost(result.post);
    setMenuOpen(false);
    setWorking(false);
    router.refresh();
  }

  async function savePostEdit() {
    if (!isOwner || working) return;

    setWorking(true);
    setError("");

    const response = await fetch(`/api/posts/${localPost.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: editBody,
        comments_status: localPost.comments_status || "open",
        remove_media_ids: mediaToRemove,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "Failed to update post.");
      setWorking(false);
      return;
    }

    setLocalPost(result.post);
    setEditOpen(false);
    setMenuOpen(false);
    setMediaToRemove([]);
    setWorking(false);
    onChanged?.();
    router.refresh();
  }

  async function sharePost() {
    const url = `${window.location.origin}/post/${localPost.id}`;
    const title = `Post by @${author?.username || "user"}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        setError("Post link copied.");
      }
    } catch {}

    setMenuOpen(false);
  }

  function toggleRemoveMedia(mediaId) {
    setMediaToRemove((current) =>
      current.includes(mediaId)
        ? current.filter((id) => id !== mediaId)
        : [...current, mediaId]
    );
  }

  return (
    <>
      <article
  className={`card relative overflow-visible p-4 ${
    menuOpen ? "z-[100]" : "z-0"
  }`}
>
        <div className="flex items-start justify-between gap-3">
          <Link
            href={author?.username ? `/@${author.username}` : "/"}
            className="flex min-w-0 items-center gap-3"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
              {author?.avatar_url ? (
                <img
                  src={author.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                (author?.display_name || author?.username || "?")
                  ?.charAt(0)
                  ?.toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <p className="flex min-w-0 items-center gap-1 font-bold">
                <span className="truncate">
                  {author?.display_name || author?.username || "Unknown"}
                </span>

                {author?.is_verified && <VerifiedBadge size={15} />}
              </p>

              <p className="truncate text-sm text-white/40">
                @{author?.username || "unknown"} ·{" "}
                <TimeAgo date={localPost.created_at} />
                {localPost.visibility === "followers" && " · Followers only"}
                {commentsClosed && " · Comments closed"}
              </p>
            </div>
          </Link>

          <div ref={menuRef} className="relative z-[120]">
            <button
              onClick={() => setMenuOpen((value) => !value)}
              className="rounded-full p-2 text-white/55 transition hover:bg-white/10 hover:text-white"
            >
              <MoreHorizontal size={20} />
            </button>

            {menuOpen && (
<div className="absolute right-0 top-11 z-[9999] w-56 overflow-hidden rounded-[22px] border border-white/10 bg-black/95 p-2 shadow-2xl backdrop-blur-2xl">                <button
                  onClick={sharePost}
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-white/10"
                >
                  <Share2 size={16} />
                  Share
                </button>

                {isOwner && (
                  <>
                    <button
                      onClick={() => {
                        setEditOpen(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-white/10"
                    >
                      <Edit3 size={16} />
                      Edit
                    </button>

                    <button
                      onClick={toggleCommentsStatus}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm hover:bg-white/10"
                    >
                      <MessageCircleOff size={16} />
                      {commentsClosed ? "Open comments" : "Close comments"}
                    </button>

                    <button
                      onClick={() => {
  setMenuOpen(false);
  setDeleteConfirmOpen(true);
}}
                      className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm text-red-200 hover:bg-red-500/10"
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        <PostText text={localPost.body} />

        <PostMediaCarousel post={localPost} />

        {error && (
          <p className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm text-white/65">
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={toggleLike}
            disabled={working}
            className={`btn ${
              liked ? "btn-primary" : "btn-secondary"
            } min-h-10 px-4`}
          >
            <Heart size={16} fill={liked ? "currentColor" : "none"} />
            {likesCount}
          </button>

          <button
            onClick={() => setCommentsOpen(true)}
            className="btn btn-secondary min-h-10 px-4"
          >
            {commentsClosed ? (
              <MessageCircleOff size={16} />
            ) : (
              <MessageCircle size={16} />
            )}
            {commentsCount}
          </button>

          <button
            onClick={sharePost}
            className="btn btn-secondary min-h-10 px-4"
          >
            <Share2 size={16} />
            Share
          </button>

          <button
            onClick={toggleSave}
            disabled={working}
            className={`btn ${
              saved ? "btn-primary" : "btn-secondary"
            } ml-auto min-h-10 px-4`}
          >
            <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          </button>
        </div>
      </article>

      <CommentsModal
        isOpen={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        postId={localPost.id}
        postOwnerId={localPost.user_id}
        currentUserId={currentUserId}
        commentsStatus={localPost.comments_status || "open"}
        onCommentAdded={() => {
          setCommentsCount((count) => count + 1);
          onChanged?.();
        }}
        onCommentDeleted={() => {
          setCommentsCount((count) => Math.max(0, count - 1));
          onChanged?.();
        }}
      />

      <Transition appear show={editOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setEditOpen(false)}
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
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xl" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="card relative z-[200] w-full max-w-xl overflow-visible p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="text-2xl font-black">
                        Edit post
                      </Dialog.Title>

                      <p className="mt-1 text-sm text-white/45">
                        You can edit text or delete images only.
                      </p>
                    </div>

                    <button
                      onClick={() => setEditOpen(false)}
                      className="rounded-full p-2 text-white/60 hover:bg-white/10"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="relative z-[210] mt-5 space-y-4 overflow-visible">
<PostComposerTextarea
  className="field min-h-32 resize-none"
  value={editBody}
  onChange={setEditBody}
  maxLength={500}
  placeholder="Edit your post..."
/>

                    <p className="text-right text-xs text-white/35">
                      {editBody.length}/500
                    </p>

                    {mediaItems.length > 0 && (
                      <div>
                        <p className="mb-2 text-sm uppercase text-white/45">
                          Images
                        </p>

                        <div className="grid grid-cols-3 gap-2">
                          {mediaItems.map((item) => {
                            const marked = mediaToRemove.includes(item.id);

                            return (
                              <button
                                key={item.id}
                                type="button"
                                disabled={item.synthetic}
                                onClick={() => toggleRemoveMedia(item.id)}
                                className={`relative aspect-square overflow-hidden rounded-2xl border ${
                                  marked
                                    ? "border-red-300 opacity-45"
                                    : "border-white/10"
                                } bg-white/5`}
                              >
                                {item.media_type === "video" ? (
                                  <video
                                    src={item.media_url}
                                    className="h-full w-full object-cover"
                                    muted
                                  />
                                ) : (
                                  <img
                                    src={item.media_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                )}

                                <span className="absolute inset-x-2 bottom-2 rounded-full bg-black/70 px-2 py-1 text-xs font-bold">
                                  {marked ? "Will delete" : "Tap to delete"}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {error && (
                      <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                        {error}
                      </p>
                    )}

                    <button
                      onClick={savePostEdit}
                      disabled={working}
                      className="btn btn-primary w-full"
                    >
                      {working ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

<ConfirmDialog
  open={deleteConfirmOpen}
  onClose={() => {
    if (!working) setDeleteConfirmOpen(false);
  }}
  onConfirm={deletePost}
  loading={working}
  title="Delete post?"
  description="This post, its images, likes, comments, saves, hashtags, and mentions will be removed. This cannot be undone."
  confirmText="Delete post"
  cancelText="Keep post"
  danger
/>
    </>
  );
}