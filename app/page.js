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
    created_at: row.created_at,
    updated_at: row.updated_at,
    feed_score: row.feed_score,

    profiles: {
      id: row.author_id,
      username: row.author_username,
      display_name: row.author_display_name,
      avatar_url: row.author_avatar_url,
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
      p_limit: 50,
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
          avatar_url
        )
      `
      )
      .order("created_at", { ascending: false })
      .limit(40);

    posts = fallbackPosts || [];
  }

  return (
    <AppShell profile={profile}>
      <HomeClient profile={profile} initialPosts={posts} />
    </AppShell>
  );
}