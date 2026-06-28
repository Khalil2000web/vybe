import { notFound, redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import TagPageClient from "./TagPageClient";

export default async function TagPage({ params }) {
  const { name } = await params;
  const tagName = String(name || "").toLowerCase();

  if (!tagName.match(/^[a-z0-9_]{1,50}$/)) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!currentProfile) {
    redirect("/auth/signup");
  }

  const { data: existingTag } = await supabase
    .from("tags")
    .select("*")
    .eq("name", tagName)
    .maybeSingle();

  let posts = [];

  if (existingTag) {
    const { data: tagRows } = await supabase
      .from("post_tags")
      .select(
        `
        posts:post_id (
          *,
          profiles:user_id (
            id,
            username,
            display_name,
            avatar_url,
            is_verified
          ),
          post_media (
            id,
            media_url,
            media_type,
            sort_order
          )
        )
      `
      )
      .eq("tag_id", existingTag.id)
      .limit(100);

    posts = (tagRows || [])
      .map((row) => row.posts)
      .filter(Boolean)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  }

  return (
    <AppShell profile={currentProfile}>
      <TagPageClient
        tag={existingTag || { name: tagName, posts_count: 0 }}
        posts={posts}
        currentUserId={currentProfile.id}
      />
    </AppShell>
  );
}