import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

const allowedVisibility = ["public", "followers"];
const allowedMediaTypes = ["image", "video"];

export async function POST(request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in to post." },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const postBody =
      typeof body.body === "string" ? body.body.trim().slice(0, 500) : "";

    const mediaUrl =
      typeof body.media_url === "string" && body.media_url.trim()
        ? body.media_url.trim()
        : null;

    const mediaType =
      typeof body.media_type === "string" && body.media_type.trim()
        ? body.media_type.trim()
        : null;

    const visibility = allowedVisibility.includes(body.visibility)
      ? body.visibility
      : "public";

    if (!postBody && !mediaUrl) {
      return NextResponse.json(
        { error: "Post cannot be empty." },
        { status: 400 }
      );
    }

    if (mediaType && !allowedMediaTypes.includes(mediaType)) {
      return NextResponse.json(
        { error: "Invalid media type." },
        { status: 400 }
      );
    }

    if (mediaUrl && !mediaType) {
      return NextResponse.json(
        { error: "Media type is required when media exists." },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("id, username, display_name, avatar_url")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "Profile was not found." },
        { status: 404 }
      );
    }

    const { data: post, error: insertError } = await admin
      .from("posts")
      .insert({
        user_id: user.id,
        body: postBody || null,
        media_url: mediaUrl,
        media_type: mediaType,
        visibility,
      })
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
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ post });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create post." },
      { status: 500 }
    );
  }
}