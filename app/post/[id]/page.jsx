import { notFound } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import PostPageClient from "./PostPageClient";

export default async function PostPage({ params }) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  const { data: post } = await supabase
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
    .eq("id", id)
    .maybeSingle();

  if (!post) {
    notFound();
  }

  return (
    <AppShell profile={currentProfile}>
      <PostPageClient
        post={post}
        currentUserId={currentProfile?.id || null}
      />
    </AppShell>
  );
}