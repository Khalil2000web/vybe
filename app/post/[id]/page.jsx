import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import PostPageClient from "./PostPageClient";

export default async function PostPage({ params }) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: clickedPost } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles:user_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      post_media (
        id,
        media_url,
        media_type,
        sort_order
      )
    `
    )
    .eq("id", id)
    .maybeSingle();

  if (!clickedPost) {
    notFound();
  }

  const { data: userPosts } = await supabase
    .from("posts")
    .select(
      `
      *,
      profiles:user_id (
        id,
        username,
        display_name,
        avatar_url
      ),
      post_media (
        id,
        media_url,
        media_type,
        sort_order
      )
    `
    )
    .eq("user_id", clickedPost.user_id)
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <AppShell profile={currentProfile}>
      <PostPageClient
        initialPostId={clickedPost.id}
        posts={userPosts || []}
        author={clickedPost.profiles}
        currentUserId={currentProfile?.id || null}
      />
    </AppShell>
  );
}