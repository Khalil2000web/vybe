"use client";

import { useState } from "react";
import Link from "next/link";
import PostCard from "@/app/components/PostCard";

export default function TagPageClient({
  tag,
  posts: initialPosts,
  currentUserId,
}) {
  const [posts, setPosts] = useState(initialPosts || []);

  return (
    <main className="container-page">
      <div className="mb-5">
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          ← Back to feed
        </Link>

        <h1 className="mt-4 text-4xl font-black">#{tag.name}</h1>

        <p className="mt-2 text-white/45">
          {posts.length} {posts.length === 1 ? "post" : "posts"}
        </p>
      </div>

      <section className="space-y-4">
        {posts.length === 0 ? (
          <div className="card p-8 text-center">
            <h2 className="text-2xl font-black">No posts yet</h2>
            <p className="mt-2 text-white/55">This tag has no visible posts.</p>
          </div>
        ) : (
          posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
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
    </main>
  );
}