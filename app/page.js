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
    feed_score: row.feed_score,
    post_media: [],

    profiles: {
      id: row.author_id,
      username: row.author_username,
      display_name: row.author_display_name,
      avatar_url: row.author_avatar_url,
    },
  };
}

async function attachPostData(supabase, posts) {
  const postIds = posts.map((post) => post.id);

  if (postIds.length === 0) return posts;

  const { data: rows } = await supabase
    .from("posts")
    .select(
      `
      id,
      comments_status,
      post_media (
        id,
        media_url,
        media_type,
        sort_order
      )
    `
    )
    .in("id", postIds);

  const dataByPostId = new Map();

  for (const row of rows || []) {
    dataByPostId.set(row.id, row);
  }

  return posts.map((post) => {
    const extra = dataByPostId.get(post.id);

    return {
      ...post,
      comments_status: extra?.comments_status || "open",
      post_media: extra?.post_media || [],
    };
  });
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
    posts = await attachPostData(supabase, posts);
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
      .limit(40);

    posts = fallbackPosts || [];
  }

  return (
    <AppShell profile={profile}>
      <HomeClient profile={profile} initialPosts={posts} />
    </AppShell>
  );
}