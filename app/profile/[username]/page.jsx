import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import ProfilePageClient from "./ProfilePageClient";

function normalizePostForGrid(post) {
  if (!post) return null;

  const mediaItems = Array.isArray(post.post_media)
    ? [...post.post_media]
        .filter((item) => item.media_url && item.media_type)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : [];

  const firstMedia = mediaItems[0] || null;

  return {
    ...post,
    post_media: mediaItems,
    media_url: post.media_url || firstMedia?.media_url || null,
    media_type: post.media_type || firstMedia?.media_type || null,
  };
}

function mergeAndSortPosts(posts) {
  const map = new Map();

  for (const post of posts) {
    if (!post?.id) continue;
    map.set(post.id, post);
  }

  return Array.from(map.values())
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 60);
}

async function filterVisiblePosts(supabase, posts, viewerId) {
  if (!posts.length) return [];

  const checkedPosts = await Promise.all(
    posts.map(async (post) => {
      const { data: canView, error } = await supabase.rpc("can_view_post", {
        p_post_id: post.id,
        p_viewer_id: viewerId || null,
      });

      if (error || !canView) return null;

      return post;
    })
  );

  return checkedPosts.filter(Boolean);
}

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
      originalPostsCountResult,
      collabPostsCountResult,
      followersCountResult,
      followingCountResult,
    ] = await Promise.all([
      supabase
        .from("posts")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id),

      supabase
        .from("post_collaborators")
        .select("*", { count: "exact", head: true })
        .eq("user_id", profile.id)
        .eq("status", "accepted"),

      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("following_id", profile.id),

      supabase
        .from("follows")
        .select("*", { count: "exact", head: true })
        .eq("follower_id", profile.id),
    ]);

    postsCount =
      (originalPostsCountResult.count || 0) +
      (collabPostsCountResult.count || 0);

    followersCount = followersCountResult.count || 0;
    followingCount = followingCountResult.count || 0;

    if (canViewPosts) {
      let originalPostsQuery = supabase
        .from("posts")
        .select(
          `
          *,
          post_media (
            id,
            media_url,
            media_type,
            sort_order
          )
        `
        )
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(60);

      if (!isOwner && !initiallyFollowing) {
        originalPostsQuery = originalPostsQuery.eq("visibility", "public");
      }

      const [originalPostsResult, collabRowsResult] = await Promise.all([
        originalPostsQuery,

        supabase
          .from("post_collaborators")
          .select(
            `
            id,
            post_id,
            status,
            post:posts!post_collaborators_post_id_fkey (
              *,
              post_media (
                id,
                media_url,
                media_type,
                sort_order
              )
            )
          `
          )
          .eq("user_id", profile.id)
          .eq("status", "accepted")
          .limit(60),
      ]);

      const originalPosts = (originalPostsResult.data || [])
        .map(normalizePostForGrid)
        .filter(Boolean);

      const rawCollabPosts = (collabRowsResult.data || [])
        .map((row) => row.post)
        .filter(Boolean)
        .map(normalizePostForGrid)
        .filter(Boolean);

      const visibleCollabPosts = await filterVisiblePosts(
        supabase,
        rawCollabPosts,
        currentProfile?.id || null
      );

      posts = mergeAndSortPosts([...originalPosts, ...visibleCollabPosts]);
    }
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