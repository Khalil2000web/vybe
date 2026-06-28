import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import HomeClient from "./HomeClient";

function mapFeedRowToPost(row) {
  return {
    id: row.id,
    user_id: row.user_id,
    body: row.body,
    media_url: row.media_url,
    media_type: row.media_type,
    visibility: row.visibility,
    comments_status: row.comments_status || "open",
    created_at: row.created_at,
    updated_at: row.updated_at,

    likes_count: Number(row.likes_count || 0),
    comments_count: Number(row.comments_count || 0),
    saves_count: Number(row.saves_count || 0),
    is_liked_by_me: Boolean(row.is_liked_by_me),
    is_saved_by_me: Boolean(row.is_saved_by_me),

    feed_score: row.feed_score,
    post_media: Array.isArray(row.post_media) ? row.post_media : [],

    profiles: {
      id: row.author_id,
      username: row.author_username,
      display_name: row.author_display_name,
      avatar_url: row.author_avatar_url,
      is_verified: Boolean(row.author_is_verified),
    },
  };
}

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    redirect("/auth/signup");
  }

  const { data: feedRows, error: feedError } = await supabase.rpc(
    "get_home_feed",
    {
      p_limit: 30,
    }
  );

  let posts = [];

  if (!feedError && feedRows) {
    posts = feedRows.map(mapFeedRowToPost);
  } else {
    const { data: fallbackPosts } = await supabase
      .from("posts")
      .select(
        `
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
      `
      )
      .order("created_at", { ascending: false })
      .limit(30);

    posts = fallbackPosts || [];
  }

  return (
    <AppShell profile={profile}>
      <HomeClient profile={profile} initialPosts={posts} />
    </AppShell>
  );
}