import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import Link from "next/link";
import FollowButton from "@/app/components/FollowButton";

export default async function ExplorePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio")
    .order("created_at", { ascending: false })
    .limit(50);

  const visibleProfiles = (profiles || []).filter(
    (profile) => profile.id !== currentProfile?.id
  );

  let followingIds = [];

  if (currentProfile && visibleProfiles.length > 0) {
    const { data: followingRows } = await supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", currentProfile.id)
      .in(
        "following_id",
        visibleProfiles.map((profile) => profile.id)
      );

    followingIds = (followingRows || []).map((row) => row.following_id);
  }

  return (
    <AppShell profile={currentProfile}>
      <main className="container-page">
        <h1 className="text-4xl font-black">Explore</h1>
        <p className="mt-2 text-white/50">Find people on the platform.</p>

        <section className="mt-5 space-y-3">
          {visibleProfiles.length === 0 ? (
            <div className="card p-8 text-center text-white/50">
              No users to explore yet.
            </div>
          ) : (
            visibleProfiles.map((profile) => (
              <div
                key={profile.id}
                className="card flex items-center justify-between gap-3 p-4"
              >
                <Link
                  href={`/@${profile.username}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-full w-full pointer-events-none object-cover"
                      />
                    ) : (
                      (profile.display_name || profile.username)
                        ?.charAt(0)
                        ?.toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-bold">
                      {profile.display_name || profile.username}
                    </p>
                    <p className="truncate text-sm text-white/45">
                      @{profile.username}
                    </p>
                  </div>
                </Link>

                <FollowButton
                  currentUserId={currentProfile?.id || null}
                  targetUserId={profile.id}
                  initiallyFollowing={followingIds.includes(profile.id)}
                  size="small"
                />
              </div>
            ))
          )}
        </section>
      </main>
    </AppShell>
  );
}