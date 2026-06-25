import { createClient } from "@/app/lib/supabase/server";
import AppShell from "@/app/components/AppShell";
import SearchClient from "./SearchClient";

export default async function SearchPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: currentProfile } = user
    ? await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle()
    : { data: null };

  return (
    <AppShell profile={currentProfile}>
      <SearchClient currentProfile={currentProfile} />
    </AppShell>
  );
}
