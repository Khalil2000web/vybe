"use client";

import { useState } from "react";
import Link from "next/link";
import { ImagePlus, PlusSquare } from "lucide-react";
import PostCard from "@/app/components/PostCard";

export default function HomeClient({ profile, initialPosts }) {
  const [posts, setPosts] = useState(initialPosts);

  return (
    <div className="container-page">
      <section className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.22em] text-white/40">
            Welcome
          </p>

          <h1 className="text-2xl uppercase font-black leading-tight">
            @{profile.username}
          </h1>
        </div>

        <Link href="/create" className="btn btn-primary">
          <PlusSquare size={16} />
          Create
        </Link>
      </section>

      <Link href="/create" className="card mb-5 block p-4 transition hover:border-white/25">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10">
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
          </div>

          <div className="min-w-0 flex-1">
            <p className="text-white/45">What do you want to share?</p>
          </div>

          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-black">
            <ImagePlus size={18} />
          </div>
        </div>
      </Link>

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
              onChanged={() => {}}
            />
          ))
        )}
      </section>
    </div>
  );
}