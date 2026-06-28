"use client";

import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import Link from "next/link";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { LockKeyhole, SendHorizonal, Trash2, X } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import TimeAgo from "@/app/components/TimeAgo";

export default function CommentsModal({
  isOpen,
  onClose,
  postId,
  postOwnerId,
  currentUserId,
  commentsStatus = "open",
  onCommentAdded,
  onCommentDeleted,
}) {
  const supabase = createClient();

  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");
  const [commentToDelete, setCommentToDelete] = useState(null);

  const commentsClosed = commentsStatus === "closed";

  useEffect(() => {
    if (!isOpen || !postId) return;

    async function loadComments() {
      setLoading(true);
      setError("");

      const { data, error: commentsError } = await supabase
        .from("comments")
        .select(
          `
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url
          )
        `
        )
        .eq("post_id", postId)
        .order("created_at", { ascending: true });

      if (commentsError) {
        setError(commentsError.message);
        setLoading(false);
        return;
      }

      setComments(data || []);
      setLoading(false);
    }

    loadComments();
  }, [isOpen, postId, supabase]);

  async function addComment(e) {
    e.preventDefault();

    if (!currentUserId || !body.trim() || working || commentsClosed) return;

    setWorking(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        body: body.trim().slice(0, 300),
      })
      .select(
        `
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      `
      )
      .single();

    if (insertError) {
      setError(insertError.message);
      setWorking(false);
      return;
    }

    setComments((current) => [...current, data]);
    setBody("");
    setWorking(false);
    onCommentAdded?.();
  }

  async function deleteComment(commentId) {
  if (!currentUserId || working) return;

  setWorking(true);
  setError("");

  const { error: deleteError } = await supabase
    .from("comments")
    .delete()
    .eq("id", commentId)
    .eq("user_id", currentUserId);

  if (deleteError) {
    setError(deleteError.message);
    setWorking(false);
    setCommentToDelete(null);
    return;
  }

  setComments((current) =>
    current.filter((comment) => comment.id !== commentId)
  );

  setWorking(false);
  setCommentToDelete(null);
  onCommentDeleted?.();
}

  return (
    <>
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
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
          <div className="flex min-h-full items-end justify-center sm:items-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 translate-y-8 sm:scale-95"
              enterTo="opacity-100 translate-y-0 sm:scale-100"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 translate-y-0 sm:scale-100"
              leaveTo="opacity-0 translate-y-8 sm:scale-95"
            >
              <Dialog.Panel className="card max-h-[85vh] w-full max-w-lg overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                  <div>
                    <Dialog.Title className="text-2xl font-black">
                      Comments
                    </Dialog.Title>

                    {commentsClosed && (
                      <p className="mt-1 flex items-center gap-2 text-sm text-white/45">
                        <LockKeyhole size={14} />
                        Comments are closed
                      </p>
                    )}
                  </div>

                  <button
                    onClick={onClose}
                    className="rounded-full p-2 text-white/60 hover:bg-white/10"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="max-h-[55vh] space-y-3 overflow-y-auto p-4">
                  {loading ? (
                    <p className="text-center text-white/45">Loading...</p>
                  ) : comments.length === 0 ? (
                    <p className="text-center text-white/45">
                      No comments yet.
                    </p>
                  ) : (
                    comments.map((comment) => {
                      const author = comment.profiles;
                      const isOwnComment = comment.user_id === currentUserId;

                      return (
                        <div
                          key={comment.id}
                          className="rounded-[22px] border border-white/10 bg-white/[0.04] p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <Link
                              href={
                                author?.username ? `/@${author.username}` : "/"
                              }
                              className="flex min-w-0 items-center gap-3"
                            >
                              <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 text-sm font-bold">
                                {author?.avatar_url ? (
                                  <img
                                    src={author.avatar_url}
                                    alt=""
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  (author?.display_name ||
                                    author?.username ||
                                    "?")
                                    ?.charAt(0)
                                    ?.toUpperCase()
                                )}
                              </div>

                              <div className="min-w-0">
                                <p className="truncate text-sm font-bold">
                                  {author?.display_name ||
                                    author?.username ||
                                    "Unknown"}
                                </p>

                                <p className="truncate text-xs text-white/40">
                                  @{author?.username || "unknown"} ·{" "}
                                  <TimeAgo date={comment.created_at} />
                                </p>
                              </div>
                            </Link>

                            {isOwnComment && (
                              <button
                                onClick={() => setCommentToDelete(comment)}
                                disabled={working}
                                className="rounded-full p-2 text-white/40 hover:bg-red-500/10 hover:text-red-200"
                              >
                                <Trash2 size={15} />
                              </button>
                            )}
                          </div>

                          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-white/80">
                            {comment.body}
                          </p>
                        </div>
                      );
                    })
                  )}

                  {error && (
                    <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                      {error}
                    </p>
                  )}
                </div>

                <div className="border-t border-white/10 p-4">
                  {commentsClosed ? (
                    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-center text-sm text-white/50">
                      New comments are not allowed on this post.
                    </div>
                  ) : (
                    <form onSubmit={addComment} className="flex gap-2">
                      <input
                        className="field min-h-11 flex-1"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        maxLength={300}
                        placeholder="Write a comment..."
                      />

                      <button
                        disabled={!body.trim() || working}
                        className="btn btn-primary min-h-11 px-4"
                      >
                        <SendHorizonal size={16} />
                      </button>
                    </form>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>


<ConfirmDialog
  open={Boolean(commentToDelete)}
  onClose={() => {
    if (!working) setCommentToDelete(null);
  }}
  onConfirm={() => deleteComment(commentToDelete?.id)}
  loading={working}
  title="Delete comment?"
  description="This comment will be removed from the post. This cannot be undone."
  confirmText="Delete comment"
  cancelText="Keep comment"
  danger
/>
</>
  );
}