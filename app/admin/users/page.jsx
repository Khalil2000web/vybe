import { redirect } from "next/navigation";
import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import AdminUsersClient from "./AdminUsersClient";

function isTeam(role) {
  return ["admin", "owner", "staff"].includes(role);
}

export default async function AdminUsersPage() {
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

  if (!isTeam(profile.role)) {
    redirect("/");
  }

  return (
    <AppShell profile={profile}>
      <AdminUsersClient currentProfile={profile} />
    </AppShell>
  );
}