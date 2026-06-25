import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import ProfilePageClient from "./ProfilePageClient";

export default async function ProfilePage({ params }) {
  const { username } = await params;
  const cleanUsername = username.toLowerCase();

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
    .eq("username", cleanUsername)
    .maybeSingle();

  let posts = [];
  let postsCount = 0;
  let followersCount = 0;
  let followingCount = 0;
  let initiallyFollowing = false;
  let initiallyRequested = false;
  let incomingFollowRequest = false;
  let canViewPosts = false;

  if (profile) {
    const isOwner = currentProfile?.id === profile.id;

    if (currentProfile && !isOwner) {
      const { data: followData } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", currentProfile.id)
        .eq("following_id", profile.id)
        .maybeSingle();

      initiallyFollowing = Boolean(followData);

      const { data: requestData } = await supabase
        .from("follow_requests")
        .select("requester_id")
        .eq("requester_id", currentProfile.id)
        .eq("target_id", profile.id)
        .maybeSingle();

      initiallyRequested = Boolean(requestData);

      // This means: the profile I am viewing has requested to follow ME.
      const { data: incomingRequestData } = await supabase
        .from("follow_requests")
        .select("requester_id")
        .eq("requester_id", profile.id)
        .eq("target_id", currentProfile.id)
        .maybeSingle();

      incomingFollowRequest = Boolean(incomingRequestData);
    }

    canViewPosts = !profile.is_private || isOwner || initiallyFollowing;

    const [
      postsResult,
      postsCountResult,
      followersCountResult,
      followingCountResult,
    ] = await Promise.all([
      supabase
        .from("posts")
        .select("*")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(60),

      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id),

      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),

      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);

    posts = postsResult.data || [];
    postsCount = postsCountResult.count || 0;
    followersCount = followersCountResult.count || 0;
    followingCount = followingCountResult.count || 0;
  }

  return (
    <AppShell profile={currentProfile}>
      <ProfilePageClient
        profile={profile}
        posts={posts}
        currentUserId={currentProfile?.id || null}
        counts={{
          posts: postsCount,
          followers: followersCount,
          following: followingCount,
        }}
        initiallyFollowing={initiallyFollowing}
        initiallyRequested={initiallyRequested}
        incomingFollowRequest={incomingFollowRequest}
        canViewPosts={canViewPosts}
      />
    </AppShell>
  );
}