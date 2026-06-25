"use client";

import { Fragment, useMemo, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { createClient } from "@/app/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Image, LockKeyhole, Settings, Trash2, X } from "lucide-react";
import FollowButton from "@/app/components/FollowButton";
import FollowRequestActions from "@/app/components/FollowRequestActions";

const MAX_AVATAR_SIZE = 4 * 1024 * 1024;
const MAX_COVER_SIZE = 8 * 1024 * 1024;

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];
const usernameRegex = /^[a-z0-9_]{3,24}$/;

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

function getUsernameAvailableDate(usernameChangedAt) {
  if (!usernameChangedAt) return null;

  const last = new Date(usernameChangedAt);
  const next = new Date(last.getTime() + 30 * 24 * 60 * 60 * 1000);

  if (Date.now() >= next.getTime()) {
    return null;
  }

  return next;
}

export default function ProfilePageClient({
  profile: initialProfile,
  posts,
  currentUserId,
  counts,
  initiallyFollowing,
  initiallyRequested,
  incomingFollowRequest,
  canViewPosts,
}) {
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState(initialProfile);

  const [username, setUsername] = useState(initialProfile?.username || "");
  const [displayName, setDisplayName] = useState(
    initialProfile?.display_name || ""
  );
  const [bio, setBio] = useState(initialProfile?.bio || "");
  const [website, setWebsite] = useState(initialProfile?.website || "");
  const [coverUrl, setCoverUrl] = useState(initialProfile?.cover_url || "");
  const [isPrivate, setIsPrivate] = useState(initialProfile?.is_private || false);

  const [followersCount, setFollowersCount] = useState(counts?.followers || 0);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageSaving, setImageSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const cleanUsername = useMemo(() => {
    return username.toLowerCase().trim().replace(/^@/, "");
  }, [username]);

  if (!profile) {
    return (
      <main className="container-page">
        <div className="card p-8 text-center">
          <h1 className="text-3xl font-black">Profile not found</h1>
          <p className="mt-2 text-white/50">This user does not exist.</p>

          <Link href="/" className="btn btn-primary mt-6">
            Go home
          </Link>
        </div>
      </main>
    );
  }

  const isOwner = currentUserId === profile.id;

  const usernameChanged = cleanUsername !== profile.username;
  const usernameChangeCount = profile.username_change_count || 0;
  const usernameAvailableDate = getUsernameAvailableDate(
    profile.username_changed_at
  );

  const usernameLocked =
    usernameChanged &&
    (usernameChangeCount >= 3 || Boolean(usernameAvailableDate));

  async function saveProfile() {
    if (!isOwner) return;

    setSaving(true);
    setError("");
    setSuccess("");

    if (!usernameRegex.test(cleanUsername)) {
      setError(
        "Username must be 3-24 characters. Use letters, numbers, and underscores only."
      );
      setSaving(false);
      return;
    }

    if (usernameChanged && usernameChangeCount >= 3) {
      setError("You reached the username change limit.");
      setSaving(false);
      return;
    }

    if (usernameChanged && usernameAvailableDate) {
      setError(
        `You can change your username again on ${usernameAvailableDate.toLocaleDateString()}.`
      );
      setSaving(false);
      return;
    }

    const cleanWebsite = website.trim();

    if (cleanWebsite && !cleanWebsite.startsWith("https://")) {
      setError("Website must start with https://");
      setSaving(false);
      return;
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        username: cleanUsername,
        display_name: displayName.trim() || cleanUsername,
        bio: bio.trim() || null,
        website: cleanWebsite || null,
        is_private: isPrivate,
      })
      .eq("id", currentUserId)
      .select()
      .single();

    if (updateError) {
      if (
        updateError.message.includes("profiles_username_key") ||
        updateError.message.toLowerCase().includes("duplicate")
      ) {
        setError("Username is already taken.");
      } else {
        setError(updateError.message);
      }

      setSaving(false);
      return;
    }

    const oldUsername = profile.username;

    setProfile(data);
    setUsername(data.username);
    setDisplayName(data.display_name || "");
    setBio(data.bio || "");
    setWebsite(data.website || "");
    setCoverUrl(data.cover_url || "");
    setSuccess("Profile saved.");
    setSaving(false);

    if (data.username !== oldUsername) {
      router.replace(`/@${data.username}`);
    }

    router.refresh();
  }

  async function uploadAvatar(e) {
    const file = e.target.files?.[0];

    if (!file || !isOwner) return;

    setImageSaving(true);
    setError("");
    setSuccess("");

    if (!allowedImageTypes.includes(file.type)) {
      setError("Avatar must be JPG, PNG, or WEBP.");
      setImageSaving(false);
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setError("Avatar is too large. Max is 4MB.");
      setImageSaving(false);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${currentUserId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      setError(uploadError.message);
      setImageSaving(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: `${publicUrlData.publicUrl}?v=${Date.now()}`,
      })
      .eq("id", currentUserId)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setImageSaving(false);
      return;
    }

    setProfile(data);
    setSuccess("Avatar updated.");
    setImageSaving(false);
    router.refresh();
  }

  async function removeAvatar() {
    if (!isOwner || !profile.avatar_url) return;

    const ok = window.confirm("Remove your profile image?");
    if (!ok) return;

    setImageSaving(true);
    setError("");
    setSuccess("");

    const avatarPath = getStoragePathFromPublicUrl(profile.avatar_url, "avatars");

    if (avatarPath) {
      await supabase.storage.from("avatars").remove([avatarPath]);
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        avatar_url: null,
      })
      .eq("id", currentUserId)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setImageSaving(false);
      return;
    }

    setProfile(data);
    setSuccess("Avatar removed.");
    setImageSaving(false);
    router.refresh();
  }

  async function uploadCover(e) {
    const file = e.target.files?.[0];

    if (!file || !isOwner) return;

    setImageSaving(true);
    setError("");
    setSuccess("");

    if (!allowedImageTypes.includes(file.type)) {
      setError("Cover image must be JPG, PNG, or WEBP.");
      setImageSaving(false);
      return;
    }

    if (file.size > MAX_COVER_SIZE) {
      setError("Cover image is too large. Max is 8MB.");
      setImageSaving(false);
      return;
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const filePath = `${currentUserId}/cover.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
        cacheControl: "3600",
      });

    if (uploadError) {
      setError(uploadError.message);
      setImageSaving(false);
      return;
    }

    const { data: publicUrlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    const newCoverUrl = `${publicUrlData.publicUrl}?v=${Date.now()}`;

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        cover_url: newCoverUrl,
      })
      .eq("id", currentUserId)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setImageSaving(false);
      return;
    }

    setProfile(data);
    setCoverUrl(newCoverUrl);
    setSuccess("Cover image updated.");
    setImageSaving(false);
    router.refresh();
  }

  async function removeCover() {
    if (!isOwner || !coverUrl) return;

    const ok = window.confirm("Remove your cover image?");
    if (!ok) return;

    setImageSaving(true);
    setError("");
    setSuccess("");

    const coverPath = getStoragePathFromPublicUrl(coverUrl, "avatars");

    if (coverPath) {
      await supabase.storage.from("avatars").remove([coverPath]);
    }

    const { data, error: updateError } = await supabase
      .from("profiles")
      .update({
        cover_url: null,
      })
      .eq("id", currentUserId)
      .select()
      .single();

    if (updateError) {
      setError(updateError.message);
      setImageSaving(false);
      return;
    }

    setProfile(data);
    setCoverUrl("");
    setSuccess("Cover image removed.");
    setImageSaving(false);
    router.refresh();
  }

  return (
    <main className="container-page">
      <section className="card relative overflow-hidden p-5">
        {(profile.cover_url || profile.avatar_url) && (
          <img
            src={profile.cover_url || profile.avatar_url}
            alt=""
            className="absolute inset-0 pointer-events-none h-full w-full object-cover opacity-25 blur-xl"
          />
        )}

        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />

        <div className="relative z-10">
          {profile.cover_url && (
            <div className="mb-5 h-40 overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
              <img
                src={profile.cover_url}
                alt=""
                className="h-full w-full pointer-events-none object-cover"
              />
            </div>
          )}

          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[28px] border border-white/15 bg-white/10 text-3xl font-black">
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt=""
                    className="h-full w-full pointer-events-none object-cover"
                  />
                ) : (
                  (profile.display_name || profile.username)
                    ?.charAt(0)
                    ?.toUpperCase()
                )}
              </div>

              <div className="min-w-0">
                <h1 className="break-words text-2xl font-black leading-none flex items-center gap-1">
                                 {profile.is_private && (
  <span className="">
    <LockKeyhole size={17} />
    
  </span>
)} {profile.display_name || profile.username}
                </h1>

                <p className="mt-2 text-white/50">@{profile.username}</p>
 
              </div>
            </div>

            {isOwner ? (
              <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
                <Link href="/settings" className="hidden">
                  <Settings size={16} />
                  Settings
                </Link>


                <button
                  onClick={() => {
                    setError("");
                    setSuccess("");
                    setIsEditorOpen(true);
                  }}
                  className="btn btn-primary"
                >
                  Edit
                </button>
              </div>
            ) : (
<FollowButton
  currentUserId={currentUserId}
  targetUserId={profile.id}
  targetIsPrivate={profile.is_private}
  initiallyFollowing={initiallyFollowing}
  initiallyRequested={initiallyRequested}
  onFollowChange={(isFollowing) => {
    setFollowersCount((count) =>
      isFollowing ? count + 1 : Math.max(0, count - 1)
    );
  }}
/>
            )}
          </div>

          <p className="mt-5 whitespace-pre-wrap break-words text-md text-white/80">
            {profile.bio || "No bio yet."}
          </p>

          {profile.website && (
            <a
              href={profile.website}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block break-all text-sm text-cyan-200 underline"
            >
              {profile.website}
            </a>
          )}

          {incomingFollowRequest && (
  <div className="mt-5 rounded-[24px] border border-white/10 bg-white/[0.06] p-4">
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="font-black">
          @{profile.username} requested to follow you
        </p>

        <p className="mt-1 text-sm text-white/50">
          Accept to let them follow you and see your private posts.
        </p>
      </div>
    </div>

    <div className="mt-4">
      <FollowRequestActions
        requesterId={profile.id}
        onDone={() => {
          window.location.reload();
        }}
      />
    </div>
  </div>
)}

          <div className="mt-6 grid grid-cols-3 gap-2">
            <div className="card-soft p-3 text-center">
              <p className="text-xl font-black">{counts?.posts || 0}</p>
              <p className="text-xs uppercase text-white/40">Posts</p>
            </div>

            <Link
              href={`/@${profile.username}/followers`}
              className="card-soft p-3 text-center transition hover:border-white/25"
            >
              <p className="text-xl font-black">{followersCount}</p>
              <p className="text-xs uppercase text-white/40">Followers</p>
            </Link>

            <Link
              href={`/@${profile.username}/following`}
              className="card-soft p-3 text-center transition hover:border-white/25"
            >
              <p className="text-xl font-black">{counts?.following || 0}</p>
              <p className="text-xs uppercase text-white/40">Following</p>
            </Link>
          </div>
        </div>
      </section>

      <section className="mt-5 grid grid-cols-3 gap-2">
  {!canViewPosts ? (
    <div className="card col-span-3 p-8 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/10">
        <LockKeyhole size={26} />
      </div>

      <h2 className="mt-4 text-2xl font-black">This account is private</h2>

      <p className="mt-2 text-white/50">
        Follow this account to see their posts.
      </p>
    </div>
  ) : posts.length === 0 ? (
    <div className="card col-span-3 p-8 text-center text-white/50">
      No posts yet.
    </div>
  ) : (
    posts.map((post) => (
<Link
  key={post.id}
  href={`/post/${post.id}`}
  title={new Date(post.created_at).toLocaleString()}
  className="aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/5"
>
        {post.media_url && post.media_type === "image" ? (
          <img
            src={post.media_url}
            alt=""
            className="h-full w-full pointer-events-none object-cover"
          />
        ) : post.media_url && post.media_type === "video" ? (
          <video
            src={post.media_url}
            className="h-full w-full object-cover"
            muted
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center p-3 text-center text-xs text-white/50">
            {post.body}
          </div>
        )}
      </Link>
    ))
  )}
</section>

      <Transition appear show={isEditorOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setIsEditorOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-200"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/70 backdrop-blur-xl" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto p-4">
            <div className="flex min-h-full items-center justify-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-200"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-150"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="card w-full max-w-xl p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <Dialog.Title className="text-2xl font-black">
                        Edit profile
                      </Dialog.Title>

                      <p className="mt-1 text-sm text-white/45">
                        Change how your profile appears to everyone.
                      </p>
                    </div>

                    <button
                      onClick={() => setIsEditorOpen(false)}
                      className="rounded-full p-2 text-white/60 hover:bg-white/10"
                    >
                      <X size={20} />
                    </button>
                  </div>

                  <div className="mt-6 space-y-5">
                    <div>
                      <p className="mb-2 text-sm uppercase text-white/45">
                        Cover image
                      </p>

                      <div className="relative h-40 overflow-hidden rounded-[24px] border border-white/10 bg-white/5">
                        {coverUrl ? (
                          <img
                            src={coverUrl}
                            alt=""
                            className="h-full w-full pointer-events-none object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/35">
                            No cover image
                          </div>
                        )}

                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />

                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                          <label className="btn btn-primary min-h-10 px-4">
                            <Image size={16} />
                            {imageSaving ? "..." : "Upload"}
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={uploadCover}
                              className="hidden"
                            />
                          </label>

                          {coverUrl && (
                            <button
                              onClick={removeCover}
                              disabled={imageSaving}
                              className="btn btn-danger min-h-10 px-4"
                            >
                              <Trash2 size={16} />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-white/35">
                        JPG, PNG, WEBP · max 8MB
                      </p>
                    </div>

                    <div>
                      <p className="mb-2 text-sm uppercase text-white/45">
                        Avatar
                      </p>

                      <div className="flex items-center gap-4">
                        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-[28px] border border-white/15 bg-white/10 text-3xl font-black">
                          {profile.avatar_url ? (
                            <img
                              src={profile.avatar_url}
                              alt=""
                              className="h-full w-full pointer-events-none object-cover"
                            />
                          ) : (
                            (profile.display_name || profile.username)
                              ?.charAt(0)
                              ?.toUpperCase()
                          )}
                        </div>

                        <div className="space-y-2">
                          <label className="btn btn-secondary">
                            <Image size={16} />
                            Change image
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              onChange={uploadAvatar}
                              className="hidden"
                            />
                          </label>

                          {profile.avatar_url && (
                            <button
                              onClick={removeAvatar}
                              disabled={imageSaving}
                              className="btn btn-danger"
                            >
                              <Trash2 size={16} />
                              Remove
                            </button>
                          )}
                        </div>
                      </div>

                      <p className="mt-2 text-xs text-white/35">
                        JPG, PNG, WEBP · max 4MB
                      </p>
                    </div>

                    <label className="block">
                      <p className="mb-2 text-sm uppercase text-white/45">
                        Username
                      </p>

                      <input
                        className="field"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        maxLength={24}
                      />

                      <div className="mt-2 space-y-1 text-xs text-white/35">
                        <p>Your link: /@{cleanUsername || "username"}</p>
                        <p>
                          Username changes used: {usernameChangeCount}/3
                        </p>

                        {usernameAvailableDate && (
                          <p>
                            Next username change available on{" "}
                            {usernameAvailableDate.toLocaleDateString()}.
                          </p>
                        )}

                        {usernameChangeCount >= 3 && (
                          <p className="text-red-300">
                            You reached the username change limit.
                          </p>
                        )}
                      </div>
                    </label>

                    <label className="block">
                      <p className="mb-2 text-sm uppercase text-white/45">
                        Display name
                      </p>

                      <input
                        className="field"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        maxLength={40}
                      />
                    </label>

                    <button
  type="button"
  onClick={() => setIsPrivate((value) => !value)}
  className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-left"
>
  <span>
    <span className="block font-bold">Private account</span>
    <span className="text-sm text-white/45">
      When enabled, only approved followers can see your posts.
    </span>
  </span>

  <span
    className={`shrink-0 rounded-full px-3 py-1 text-xs font-black uppercase ${
      isPrivate ? "bg-white text-black" : "bg-white/10 text-white/50"
    }`}
  >
    {isPrivate ? "On" : "Off"}
  </span>
</button>

                    <label className="block">
                      <div className="mb-2 flex items-center justify-between">
                        <p className="text-sm uppercase text-white/45">Bio</p>
                        <p className="text-xs text-white/35">
                          {bio.length}/150
                        </p>
                      </div>

                      <textarea
                        className="field min-h-32 resize-y"
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        maxLength={150}
                        placeholder="Write something about yourself..."
                      />
                    </label>

                    <label className="block">
                      <p className="mb-2 text-sm uppercase text-white/45">
                        Website / link
                      </p>

                      <input
                        className="field"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder="https://example.com"
                        maxLength={120}
                      />

                      <p className="mt-2 text-xs text-white/35">
                        For safety, links must start with https://
                      </p>
                    </label>

                    {error && (
                      <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
                        {error}
                      </p>
                    )}

                    {success && (
                      <p className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-3 text-sm text-emerald-200">
                        {success}
                      </p>
                    )}

                    <button
                      onClick={saveProfile}
                      disabled={saving || imageSaving || usernameLocked}
                      className="btn btn-primary w-full"
                    >
                      {saving ? "Saving..." : "Save profile"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </main>
  );
}