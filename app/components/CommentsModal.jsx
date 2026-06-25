"use client";

import { Fragment, useEffect, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";
import TimeAgo from "@/app/components/TimeAgo";
import { SendHorizonal, Trash2, X } from "lucide-react";

export default function CommentsModal({
  open,
  onClose,
  postId,
  postOwnerId,
  currentUserId,
  onCommentAdded,
  onCommentDeleted,
}) {
  const supabase = createClient();

  const [comments, setComments] = useState([]);
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function loadComments() {
    if (!postId) return;

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
    } else {
      setComments(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    if (open) {
      loadComments();
    }
  }, [open, postId]);

  async function createCommentNotification() {
    if (!currentUserId || !postOwnerId || currentUserId === postOwnerId) return;

    await supabase.from("notifications").insert({
      user_id: postOwnerId,
      actor_id: currentUserId,
      post_id: postId,
      type: "comment",
    });
  }

  async function addComment(e) {
    e.preventDefault();

    const cleanBody = body.trim();

    if (!cleanBody || !currentUserId || sending) return;

    setSending(true);
    setError("");

    const { data, error: insertError } = await supabase
      .from("comments")
      .insert({
        post_id: postId,
        user_id: currentUserId,
        body: cleanBody,
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
      setSending(false);
      return;
    }

    setComments((current) => [...current, data]);
    setBody("");
    await createCommentNotification();
    onCommentAdded?.();
    setSending(false);
  }

  async function deleteComment(commentId) {
    const ok = window.confirm("Delete this comment?");
    if (!ok) return;

    const { error: deleteError } = await supabase
      .from("comments")
      .delete()
      .eq("id", commentId)
      .eq("user_id", currentUserId);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    setComments((current) => current.filter((comment) => comment.id !== commentId));
    onCommentDeleted?.();
  }

  return (
    <Transition appear show={open} as={Fragment}>
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
              <Dialog.Panel className="card flex h-[82vh] w-full max-w-xl flex-col overflow-hidden p-0">
                <div className="flex items-center justify-between border-b border-white/10 p-4">
                  <Dialog.Title className="text-xl font-black">
                    Comments
                  </Dialog.Title>

                  <button
                    onClick={onClose}
                    className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  {loading ? (
                    <p className="text-center text-white/45">Loading comments...</p>
                  ) : comments.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-center">
                      <div>
                        <h3 className="text-2xl font-black">No comments yet</h3>
                        <p className="mt-2 text-white/45">
                          Be the first one to comment.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {comments.map((comment) => {
                        const author = comment.profiles;
                        const isOwner = currentUserId === comment.user_id;

                        return (
                          <div key={comment.id} className="flex gap-3">
                            <Link
                              href={`/@${author?.username}`}
                              onClick={onClose}
                              className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10"
                            >
                              {author?.avatar_url ? (
                                <img
                                  src={author.avatar_url}
                                  alt=""
                                  className="h-full w-full pointer-events-none object-cover"
                                />
                              ) : (
                                <span className="text-sm font-bold">
                                  {(author?.display_name || author?.username || "?")
                                    ?.charAt(0)
                                    ?.toUpperCase()}
                                </span>
                              )}
                            </Link>

                            <div className="min-w-0 flex-1 rounded-2xl bg-white/[0.045] p-3">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <Link
                                    href={`/@${author?.username}`}
                                    onClick={onClose}
                                    className="font-bold hover:underline"
                                  >
                                    {author?.display_name || author?.username}
                                  </Link>

                                  <p className="text-xs text-white/40">
  @{author?.username} · <TimeAgo date={comment.created_at} />
</p>
                                </div>

                                {isOwner && (
                                  <button
                                    onClick={() => deleteComment(comment.id)}
                                    className="shrink-0 rounded-full p-2 text-red-300 hover:bg-red-500/10"
                                  >
                                    <Trash2 size={15} />
                                  </button>
                                )}
                              </div>

                              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed text-white/85">
                                {comment.body}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {error && (
                    <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                      {error}
                    </p>
                  )}
                </div>

                <form onSubmit={addComment} className="border-t border-white/10 p-3">
                  {!currentUserId ? (
                    <Link href="/auth/login" className="btn btn-primary w-full">
                      Log in to comment
                    </Link>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        className="field min-h-12 flex-1"
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder="Write a comment..."
                        maxLength={300}
                      />

                      <button
                        disabled={!body.trim() || sending}
                        className="btn btn-primary aspect-square min-h-12 px-0"
                      >
                        <SendHorizonal size={18} />
                      </button>
                    </div>
                  )}
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}