"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import PostCard from "@/app/components/PostCard";

export default function PostPageClient({
  initialPostId,
  posts: initialPosts = [],
  author,
  currentUserId,
}) {
  const router = useRouter();

  const [posts, setPosts] = useState(initialPosts);
  const [activePostId, setActivePostId] = useState(initialPostId);

  const postRefs = useRef({});
  const didInitialScrollRef = useRef(false);

  useEffect(() => {
    if (didInitialScrollRef.current) return;

    const target = postRefs.current[initialPostId];

    if (!target) return;

    didInitialScrollRef.current = true;

    setTimeout(() => {
      target.scrollIntoView({
        behavior: "instant",
        block: "start",
      });
    }, 60);
  }, [initialPostId, posts.length]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visibleEntry) return;

        const nextPostId = visibleEntry.target.getAttribute("data-post-id");

        if (!nextPostId || nextPostId === activePostId) return;

        setActivePostId(nextPostId);

        window.history.replaceState(null, "", `/post/${nextPostId}`);
      },
      {
        threshold: [0.55, 0.7, 0.85],
        rootMargin: "-90px 0px -35% 0px",
      }
    );

    Object.values(postRefs.current).forEach((element) => {
      if (element) observer.observe(element);
    });

    return () => observer.disconnect();
  }, [posts, activePostId]);

  function handleDeleted(deletedPostId) {
    setPosts((current) => {
      const deletedIndex = current.findIndex((post) => post.id === deletedPostId);
      const nextPosts = current.filter((post) => post.id !== deletedPostId);

      if (nextPosts.length === 0) {
        router.push(author?.username ? `/@${author.username}` : "/");
        router.refresh();
        return nextPosts;
      }

      const nextActivePost =
        nextPosts[Math.min(Math.max(deletedIndex, 0), nextPosts.length - 1)];

      if (nextActivePost) {
        setActivePostId(nextActivePost.id);
        window.history.replaceState(null, "", `/post/${nextActivePost.id}`);

        setTimeout(() => {
          postRefs.current[nextActivePost.id]?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        }, 50);
      }

      router.refresh();
      return nextPosts;
    });
  }

  return (
    <main className="container-page">
      <div className="sticky top-[65px] z-30 mb-4 rounded-full border border-white/10 bg-black/65 px-4 py-3 backdrop-blur-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            href={author?.username ? `/@${author.username}` : "/"}
            className="min-w-0 text-sm text-white/60 hover:text-white"
          >
            ← Back to @{author?.username || "profile"}
          </Link>

          <p className="shrink-0 text-xs uppercase tracking-[0.18em] text-white/35">
            User posts
          </p>
        </div>
      </div>

      <section className="space-y-5">
        {posts.map((post) => (
          <div
            key={post.id}
            ref={(element) => {
              if (element) {
                postRefs.current[post.id] = element;
              } else {
                delete postRefs.current[post.id];
              }
            }}
            data-post-id={post.id}
            className="scroll-mt-24"
          >
            <PostCard
              post={post}
              currentUserId={currentUserId}
              onDeleted={handleDeleted}
              onChanged={() => {}}
            />
          </div>
        ))}
      </section>
    </main>
  );
}