import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

export const runtime = "nodejs";

function getStoragePathFromPublicUrl(url, bucketName) {
  if (!url) return null;

  try {
    const cleanUrl = url.split("?")[0];
    const marker = `/storage/v1/object/public/${bucketName}/`;
    const index = cleanUrl.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(cleanUrl.slice(index + marker.length));
  } catch {
    return null;
  }
}

async function getLoggedInUser() {
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) return null;

  return user;
}

async function fetchOwnedPost(admin, postId, userId) {
  const { data: post, error } = await admin
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();

  if (error || !post) return null;
  if (post.user_id !== userId) return null;

  return post;
}

async function fetchFullPost(admin, postId) {
  const { data: post, error } = await admin
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
    .eq("id", postId)
    .single();

  if (error) throw new Error(error.message);

  return post;
}

export async function PATCH(request, context) {
  try {
    const { id: postId } = await context.params;

    const user = await getLoggedInUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const post = await fetchOwnedPost(admin, postId, user.id);

    if (!post) {
      return NextResponse.json(
        { error: "Post not found or you do not own it." },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));

    const nextBody =
      typeof body.body === "string" ? body.body.trim().slice(0, 500) : "";

    const nextCommentsStatus =
      body.comments_status === "closed" ? "closed" : "open";

    const removeMediaIds = Array.isArray(body.remove_media_ids)
      ? body.remove_media_ids.filter((id) => typeof id === "string")
      : [];

    const { data: existingMedia } = await admin
      .from("post_media")
      .select("id, media_url, media_type, sort_order")
      .eq("post_id", postId)
      .eq("user_id", user.id)
      .order("sort_order", { ascending: true });

    const removeSet = new Set(removeMediaIds);

    const remainingBeforeDelete = (existingMedia || []).filter(
      (item) => !removeSet.has(item.id)
    );

    if (!nextBody && remainingBeforeDelete.length === 0) {
      return NextResponse.json(
        { error: "Post cannot be empty." },
        { status: 400 }
      );
    }

    if (removeMediaIds.length > 0) {
      const mediaToRemove = (existingMedia || []).filter((item) =>
        removeSet.has(item.id)
      );

      const paths = mediaToRemove
        .map((item) => getStoragePathFromPublicUrl(item.media_url, "post-media"))
        .filter(Boolean);

      if (paths.length > 0) {
        await admin.storage.from("post-media").remove(paths);
      }

      await admin.from("post_media").delete().in("id", removeMediaIds);
    }

    const { data: remainingMedia } = await admin
      .from("post_media")
      .select("id, media_url, media_type, sort_order")
      .eq("post_id", postId)
      .order("sort_order", { ascending: true });

    const firstMedia = remainingMedia?.[0] || null;

    const { error: updateError } = await admin
      .from("posts")
      .update({
        body: nextBody || null,
        comments_status: nextCommentsStatus,
        media_url: firstMedia?.media_url || null,
        media_type: firstMedia?.media_type || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", postId)
      .eq("user_id", user.id);

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    const updatedPost = await fetchFullPost(admin, postId);

    return NextResponse.json({ post: updatedPost });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to update post." },
      { status: 500 }
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { id: postId } = await context.params;

    const user = await getLoggedInUser();

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();
    const post = await fetchOwnedPost(admin, postId, user.id);

    if (!post) {
      return NextResponse.json(
        { error: "Post not found or you do not own it." },
        { status: 404 }
      );
    }

    const { data: mediaRows } = await admin
      .from("post_media")
      .select("media_url")
      .eq("post_id", postId);

    const paths = [];

    for (const item of mediaRows || []) {
      const path = getStoragePathFromPublicUrl(item.media_url, "post-media");
      if (path) paths.push(path);
    }

    if (post.media_url) {
      const path = getStoragePathFromPublicUrl(post.media_url, "post-media");
      if (path) paths.push(path);
    }

    const uniquePaths = [...new Set(paths)];

    if (uniquePaths.length > 0) {
      await admin.storage.from("post-media").remove(uniquePaths);
    }

    const { error: deleteError } = await admin
      .from("posts")
      .delete()
      .eq("id", postId)
      .eq("user_id", user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete post." },
      { status: 500 }
    );
  }
}