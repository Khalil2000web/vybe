"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import Link from "next/link";
import {
  ImagePlus,
  LockKeyhole,
  LogOut,
  SendHorizonal,
  Trash2,
  Unlock,
} from "lucide-react";
import PostCard from "@/app/components/PostCard";

const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

export default function HomeClient({ profile, initialPosts }) {
  const router = useRouter();
  const supabase = createClient();

  const [posts, setPosts] = useState(initialPosts);
  const [body, setBody] = useState("");
  const [media, setMedia] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [error, setError] = useState("");
  const [posting, setPosting] = useState(false);

  const canPost = useMemo(() => {
    return body.trim().length > 0 || media;
  }, [body, media]);

  function chooseMedia(e) {
    const file = e.target.files?.[0];

    setError("");
    setMedia(null);
    setMediaPreview("");

    if (!file) return;

    if (!allowedTypes.includes(file.type)) {
      setError("This file type is not supported.");
      return;
    }

    const isVideo = file.type.startsWith("video/");
    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (file.size > maxSize) {
      setError(
        isVideo
          ? "Video is too large. Max is 50MB."
          : "Image is too large. Max is 6MB."
      );
      return;
    }

    setMedia(file);
    setMediaPreview(URL.createObjectURL(file));
  }

  async function createPost(e) {
    e.preventDefault();

    if (!canPost || posting) return;

    setPosting(true);
    setError("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setError("You are not logged in. Please log in again.");
      setPosting(false);
      return;
    }

    let media_url = null;
    let media_type = null;

    if (media) {
      const ext = media.name.split(".").pop()?.toLowerCase() || "file";
      const safeName = `${crypto.randomUUID()}.${ext}`;
      const path = `${profile.id}/${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, media, {
          cacheControl: "3600",
          upsert: false,
          contentType: media.type,
        });

      if (uploadError) {
        setError(uploadError.message);
        setPosting(false);
        return;
      }

      const { data } = supabase.storage.from("post-media").getPublicUrl(path);

      media_url = data.publicUrl;
      media_type = media.type.startsWith("video/") ? "video" : "image";
    }

    const response = await fetch("/api/posts/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        body: body.trim() || null,
        media_url,
        media_type,
        visibility,
      }),
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      setError(result.error || "Failed to create post.");
      setPosting(false);
      return;
    }

    setPosts((current) => [result.post, ...current]);
    setBody("");
    setMedia(null);
    setMediaPreview("");
    setVisibility("public");
    setPosting(false);

    router.refresh();
  }

  async function logout() {
    await supabase.auth.signOut();
    router.push("/auth/login");
    router.refresh();
  }

  return (
    <div className="container-page">
      <section className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">
            Welcome back
          </p>

          <h1 className="text-3xl font-black leading-tight">
            @{profile.username}
          </h1>
        </div>

        <button onClick={logout} className="btn btn-secondary">
          <LogOut size={16} />
          Logout
        </button>
      </section>

      <form id="create" onSubmit={createPost} className="card mb-5 p-4">
        <div className="flex gap-3">
          <Link
            href={`/@${profile.username}`}
            className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10"
          >
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="font-bold">
                {(profile.display_name || profile.username)
                  ?.charAt(0)
                  ?.toUpperCase()}
              </span>
            )}
          </Link>

          <div className="min-w-0 flex-1">
            <textarea
              className="field min-h-28 resize-none"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={500}
              placeholder="Share something..."
            />

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setVisibility("public")}
                className={`btn ${
                  visibility === "public" ? "btn-primary" : "btn-secondary"
                }`}
              >
                <Unlock size={16} />
                Public
              </button>

              <button
                type="button"
                onClick={() => setVisibility("followers")}
                className={`btn ${
                  visibility === "followers" ? "btn-primary" : "btn-secondary"
                }`}
              >
                <LockKeyhole size={16} />
                Followers
              </button>
            </div>

            {mediaPreview && (
              <div className="relative mt-3 overflow-hidden rounded-2xl border border-white/10">
                {media?.type.startsWith("video/") ? (
                  <video
                    src={mediaPreview}
                    controls
                    className="max-h-[420px] w-full object-cover"
                  />
                ) : (
                  <img
                    src={mediaPreview}
                    alt=""
                    className="max-h-[420px] w-full object-cover"
                  />
                )}

                <button
                  type="button"
                  onClick={() => {
                    setMedia(null);
                    setMediaPreview("");
                  }}
                  className="absolute right-3 top-3 rounded-full bg-black/70 p-2 text-white"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )}

            <div className="mt-3 flex items-center justify-between gap-3">
              <label className="btn btn-secondary">
                <ImagePlus size={16} />
                Media
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                  onChange={chooseMedia}
                  className="hidden"
                />
              </label>

              <button disabled={!canPost || posting} className="btn btn-primary">
                <SendHorizonal size={16} />
                {posting ? "Posting..." : "Post"}
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-white/35">
              <span>{body.length}/500</span>
              <span>Images 6MB · videos 50MB</span>
            </div>

            {error && (
              <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                {error}
              </p>
            )}
          </div>
        </div>
      </form>

      <section className="space-y-4">
        {posts.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="text-2xl font-black">No posts yet</h2>
            <p className="mt-2 text-white/55">Be the first one to post.</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={profile.id}
              onDeleted={(postId) => {
                setPosts((current) =>
                  current.filter((item) => item.id !== postId)
                );
              }}
            />
          ))
        )}
      </section>
    </div>
  );
}