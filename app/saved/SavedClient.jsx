"use client";

import { useState } from "react";
import Link from "next/link";
import { Bookmark } from "lucide-react";
import PostCard from "@/app/components/PostCard";

export default function SavedClient({ initialPosts, currentUserId }) {
  const [posts, setPosts] = useState(initialPosts);

  return (
    <main className="container-page">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.22em] text-white/40">
          Your collection
        </p>

        <h1 className="mt-1 text-4xl font-black">Saved posts</h1>

        <p className="mt-2 text-white/50">
          Posts you save will appear here.
        </p>
      </div>

      {posts.length === 0 ? (
        <div className="card p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
            <Bookmark size={26} />
          </div>

          <h2 className="mt-4 text-2xl font-black">No saved posts yet</h2>

          <p className="mt-2 text-white/50">
            Save posts from your feed and come back to them later.
          </p>

          <Link href="/" className="btn btn-primary mt-6">
            Go to feed
          </Link>
        </div>
      ) : (
        <section className="space-y-4">
          {posts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={currentUserId}
              onDeleted={(postId) => {
                setPosts((current) =>
                  current.filter((item) => item.id !== postId)
                );
              }}
              onSavedChange={(isSaved, postId) => {
                if (!isSaved) {
                  setPosts((current) =>
                    current.filter((item) => item.id !== postId)
                  );
                }
              }}
            />
          ))}
        </section>
      )}
    </main>
  );
}