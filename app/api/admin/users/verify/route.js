import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

function isTeam(role) {
  return ["admin", "owner", "staff"].includes(role);
}

export async function PATCH(request) {
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

  const body = await request.json().catch(() => null);

  const targetUserId = body?.user_id;
  const isVerified = Boolean(body?.is_verified);
  const note = String(body?.note || "").trim() || null;

  if (!targetUserId) {
    return NextResponse.json({ error: "Missing user id." }, { status: 400 });
  }

  const admin = createAdminClient();

  const updatePayload = isVerified
    ? {
        is_verified: true,
        verified_at: new Date().toISOString(),
        verified_by: currentProfile.id,
        verification_note: note,
      }
    : {
        is_verified: false,
        verified_at: null,
        verified_by: null,
        verification_note: null,
      };

  const { data, error } = await admin
    .from("profiles")
    .update(updatePayload)
    .eq("id", targetUserId)
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
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ user: data });
}