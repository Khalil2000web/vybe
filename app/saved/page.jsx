import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import SavedClient from "./SavedClient";

export default async function SavedPage() {
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

  const { data: savedRows } = await supabase
    .from("saved_posts")
    .select(
      `
      created_at,
      post:posts (
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        )
      )
    `
    )
    .eq("user_id", currentProfile.id)
    .order("created_at", { ascending: false });

  const posts = (savedRows || [])
    .map((row) => row.post)
    .filter(Boolean);

  return (
    <AppShell profile={currentProfile}>
      <SavedClient
        initialPosts={posts}
        currentUserId={currentProfile.id}
      />
    </AppShell>
  );
}