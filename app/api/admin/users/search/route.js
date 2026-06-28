import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

function isTeam(role) {
  return ["admin", "owner", "staff"].includes(role);
}

export async function GET(request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  const { data: currentProfile } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user.id)
    .maybeSingle();

  if (!currentProfile || !isTeam(currentProfile.role)) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const q = String(searchParams.get("q") || "").trim().toLowerCase();

  if (!q) {
    return NextResponse.json({ users: [] });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("profiles")
    .select(
      `
      id,
      username,
      display_name,
      avatar_url,
      role,
      is_verified,
      verified_at,
      verification_note
    `
    )
    .or(`username.ilike.%${q}%,display_name.ilike.%${q}%`)
    .order("username", { ascending: true })
    .limit(12);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ users: data || [] });
}