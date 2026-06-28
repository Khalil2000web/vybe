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

  const { data: notificationsData } = await supabase
    .from("notifications")
    .select(
      `
      *,
      actor:profiles!notifications_actor_id_fkey (
        id,
        username,
        display_name,
        avatar_url,
        is_verified
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

  let notifications = notificationsData || [];

  const collabPostIds = notifications
    .filter(
      (notification) =>
        notification.type === "collab_request" && notification.post_id
    )
    .map((notification) => notification.post_id);

  if (collabPostIds.length > 0) {
    const { data: collaborations } = await supabase
      .from("post_collaborators")
      .select("post_id, status")
      .eq("user_id", currentProfile.id)
      .in("post_id", collabPostIds);

    const collaborationStatusByPostId = new Map(
      (collaborations || []).map((row) => [row.post_id, row.status])
    );

    notifications = notifications.map((notification) => {
      if (notification.type !== "collab_request") {
        return notification;
      }

      const status = collaborationStatusByPostId.get(notification.post_id);

      return {
        ...notification,
        collab_status: status || "pending",
        collab_response:
          status && status !== "pending" ? status : null,
      };
    });
  }

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
          bio,
          is_verified
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
        initialNotifications={notifications}
        initialFollowRequests={followRequests}
        currentProfile={currentProfile}
      />
    </AppShell>
  );
}