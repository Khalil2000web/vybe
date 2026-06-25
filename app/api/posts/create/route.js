import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

const allowedVisibility = ["public", "followers"];
const MAX_MEDIA_ITEMS = 10;

function cleanMediaItems(rawMedia, userId) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

  if (!Array.isArray(rawMedia)) return [];

  const storagePrefix = `${supabaseUrl}/storage/v1/object/public/post-media/${userId}/`;

  return rawMedia
    .slice(0, MAX_MEDIA_ITEMS)
    .map((item) => {
      const mediaUrl =
        typeof item?.media_url === "string" ? item.media_url.trim() : "";

      const mediaType =
        typeof item?.media_type === "string" ? item.media_type.trim() : "";

      return {
        media_url: mediaUrl,
        media_type: mediaType,
      };
    })
    .filter((item) => {
      if (!item.media_url) return false;
      if (item.media_type !== "image") return false;

      return item.media_url.startsWith(storagePrefix);
    });
}

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

    const mediaItems = cleanMediaItems(body.media, user.id);

    const visibility = allowedVisibility.includes(body.visibility)
      ? body.visibility
      : "public";

    if (!postBody && mediaItems.length === 0) {
      return NextResponse.json(
        { error: "Post cannot be empty." },
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

    const firstMedia = mediaItems[0] || null;

    const { data: createdPost, error: insertError } = await admin
      .from("posts")
      .insert({
        user_id: user.id,
        body: postBody || null,
        media_url: firstMedia?.media_url || null,
        media_type: firstMedia?.media_type || null,
        visibility,
        comments_status: "open",
      })
      .select("*")
      .single();

    if (insertError) {
      return NextResponse.json(
        { error: insertError.message },
        { status: 500 }
      );
    }

    if (mediaItems.length > 0) {
      const rows = mediaItems.map((item, index) => ({
        post_id: createdPost.id,
        user_id: user.id,
        media_url: item.media_url,
        media_type: "image",
        sort_order: index,
      }));

      const { error: mediaInsertError } = await admin
        .from("post_media")
        .insert(rows);

      if (mediaInsertError) {
        await admin.from("posts").delete().eq("id", createdPost.id);

        return NextResponse.json(
          { error: mediaInsertError.message },
          { status: 500 }
        );
      }
    }

    const { data: post, error: fetchError } = await admin
      .from("posts")
      .select(
        `
        *,
        profiles:user_id (
          id,
          username,
          display_name,
          avatar_url
        ),
        post_media (
          id,
          media_url,
          media_type,
          sort_order
        )
      `
      )
      .eq("id", createdPost.id)
      .single();

    if (fetchError) {
      return NextResponse.json(
        { error: fetchError.message },
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