import { NextResponse } from "next/server";
import { createClient } from "@/app/lib/supabase/server";
import { createAdminClient } from "@/app/lib/supabase/admin";

async function deleteUserStorageFolder(admin, bucketName, userId) {
  const filesToRemove = [];

  async function walk(folderPath) {
    const { data, error } = await admin.storage.from(bucketName).list(folderPath, {
      limit: 1000,
      sortBy: {
        column: "name",
        order: "asc",
      },
    });

    if (error) {
      return;
    }

    for (const item of data || []) {
      const itemPath = `${folderPath}/${item.name}`;

      // Supabase folders usually have null metadata.
      if (item.metadata === null) {
        await walk(itemPath);
      } else {
        filesToRemove.push(itemPath);
      }
    }
  }

  await walk(userId);

  if (filesToRemove.length === 0) return;

  for (let i = 0; i < filesToRemove.length; i += 100) {
    const chunk = filesToRemove.slice(i, i + 100);
    await admin.storage.from(bucketName).remove(chunk);
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    if (body.confirm !== "DELETE_ACCOUNT") {
      return NextResponse.json(
        { error: "Invalid confirmation." },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        { error: "You must be logged in." },
        { status: 401 }
      );
    }

    const admin = createAdminClient();

    await deleteUserStorageFolder(admin, "avatars", user.id);
    await deleteUserStorageFolder(admin, "post-media", user.id);

    const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to delete account." },
      { status: 500 }
    );
  }
}