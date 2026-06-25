"use client";

import { useRouter } from "next/navigation";
import PostCard from "@/app/components/PostCard";
import Link from "next/link";

export default function PostPageClient({ post, currentUserId }) {
  const router = useRouter();

  return (
    <main className="container-page">
      <div className="mb-4">
        <Link href="/" className="text-sm text-white/50 hover:text-white">
          ← Back to feed
        </Link>
      </div>

      <PostCard
        post={post}
        currentUserId={currentUserId}
        onDeleted={() => {
          router.push("/");
          router.refresh();
        }}
      />
    </main>
  );
}