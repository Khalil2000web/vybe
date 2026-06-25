import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import UserListClient from "@/app/components/UserListClient";

export default async function FollowersPage({ params }) {
  const { username } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("username", username.toLowerCase())
    .maybeSingle();

  if (!profile) {
    notFound();
  }

  const { data: rows } = await supabase
    .from("follows")
    .select(
      `
      follower:profiles!follows_follower_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        bio
      )
    `
    )
    .eq("following_id", profile.id)
    .order("created_at", { ascending: false });

  const users = (rows || [])
  .map((row) =>
    row.follower
      ? {
          ...row.follower,
          followed_at: row.created_at,
        }
      : null
  )
  .filter(Boolean);

  let followingIds = [];

  if (currentProfile && users.length > 0) {
    const { data: followingRows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentProfile.id)
      .in(
        "following_id",
        users.map((item) => item.id)
      );

    followingIds = (followingRows || []).map((row) => row.following_id);
  }

  return (
    <AppShell profile={currentProfile}>
      <UserListClient
        title={`@${profile.username}'s followers`}
        emptyText="No followers yet."
        users={users}
        currentUserId={currentProfile?.id || null}
        followingIds={followingIds}
      />
    </AppShell>
  );
}