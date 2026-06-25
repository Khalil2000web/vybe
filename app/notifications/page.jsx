import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import NotificationsClient from "./NotificationsClient";

export default async function NotificationsPage() {
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

  const { data: notifications } = await supabase
    .from("notifications")
    .select(
      `
      *,
      actor:profiles!notifications_actor_id_fkey (
        id,
        username,
        display_name,
        avatar_url
      ),
      post:posts!notifications_post_id_fkey (
        id,
        body,
        media_url,
        media_type
      )
    `
    )
    .eq("user_id", currentProfile.id)
    .order("created_at", { ascending: false })
    .limit(80);

  let followRequests = [];

  if (currentProfile.is_private) {
    const { data: requests } = await supabase
      .from("follow_requests")
      .select(
        `
        created_at,
        requester:profiles!follow_requests_requester_id_fkey (
          id,
          username,
          display_name,
          avatar_url,
          bio
        )
      `
      )
      .eq("target_id", currentProfile.id)
      .order("created_at", { ascending: false });

    followRequests = requests || [];
  }

  return (
    <AppShell profile={currentProfile}>
      <NotificationsClient
        initialNotifications={notifications || []}
        initialFollowRequests={followRequests}
        currentProfile={currentProfile}
      />
    </AppShell>
  );
}