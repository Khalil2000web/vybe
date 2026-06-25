"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, UserRound, FileText } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import FollowButton from "@/app/components/FollowButton";
import PostCard from "@/app/components/PostCard";

function cleanSearchQuery(value) {
  return value
    .trim()
    .replace(/[%,]/g, "")
    .slice(0, 40);
}

export default function SearchClient({ currentProfile }) {
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [activeTab, setActiveTab] = useState("users");

  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [followingIds, setFollowingIds] = useState([]);

  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runSearch(e) {
    e?.preventDefault();

    const cleanQuery = cleanSearchQuery(query);

    setError("");
    setSearched(true);
    setUsers([]);
    setPosts([]);
    setFollowingIds([]);

    if (cleanQuery.length < 2) {
      setError("Search must be at least 2 characters.");
      return;
    }

    setLoading(true);

    const [usersResult, postsResult] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
        .limit(30),

      supabase
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
        .ilike("body", `%${cleanQuery}%`)
        .order("created_at", { ascending: false })
        .limit(30),
    ]);

    if (usersResult.error || postsResult.error) {
      setError(usersResult.error?.message || postsResult.error?.message);
      setLoading(false);
      return;
    }

    const visibleUsers = (usersResult.data || []).filter(
      (profile) => profile.id !== currentProfile?.id
    );

    setUsers(visibleUsers);
    setPosts(postsResult.data || []);

    if (currentProfile && visibleUsers.length > 0) {
      const { data: followingRows } = await supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", currentProfile.id)
        .in(
          "following_id",
          visibleUsers.map((profile) => profile.id)
        );

      setFollowingIds((followingRows || []).map((row) => row.following_id));
    }

    setLoading(false);
  }

  return (
    <main className="container-page">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.22em] text-white/40">
          Discover
        </p>

        <h1 className="mt-1 text-4xl font-black">Search</h1>

        <p className="mt-2 text-white/50">
          Find people and posts across the platform.
        </p>
      </div>

      <form onSubmit={runSearch} className="card p-3">
        <div className="flex gap-2">
          <input
            className="field min-h-12 flex-1"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users or posts..."
          />

          <button className="btn btn-primary aspect-square min-h-12 px-0">
            <Search size={18} />
          </button>
        </div>
      </form>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          onClick={() => setActiveTab("users")}
          className={`btn ${
            activeTab === "users" ? "btn-primary" : "btn-secondary"
          }`}
        >
          <UserRound size={16} />
          Users
        </button>

        <button
          onClick={() => setActiveTab("posts")}
          className={`btn ${
            activeTab === "posts" ? "btn-primary" : "btn-secondary"
          }`}
        >
          <FileText size={16} />
          Posts
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}

      {loading && (
        <div className="card mt-4 p-8 text-center text-white/50">
          Searching...
        </div>
      )}

      {!loading && searched && activeTab === "users" && (
        <section className="mt-4 space-y-3">
          {users.length === 0 ? (
            <div className="card p-8 text-center text-white/50">
              No users found.
            </div>
          ) : (
            users.map((profile) => (
              <div
                key={profile.id}
                className="card flex items-center justify-between gap-3 p-4"
              >
                <Link
                  href={`/@${profile.username}`}
                  className="flex min-w-0 items-center gap-3"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
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
                    <p className="truncate font-bold">
                      {profile.display_name || profile.username}
                    </p>
                    <p className="truncate text-sm text-white/45">
                      @{profile.username}
                    </p>
                  </div>
                </Link>

                <FollowButton
                  currentUserId={currentProfile?.id || null}
                  targetUserId={profile.id}
                  initiallyFollowing={followingIds.includes(profile.id)}
                  size="small"
                />
              </div>
            ))
          )}
        </section>
      )}

      {!loading && searched && activeTab === "posts" && (
        <section className="mt-4 space-y-4">
          {posts.length === 0 ? (
            <div className="card p-8 text-center text-white/50">
              No posts found.
            </div>
          ) : (
            posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                currentUserId={currentProfile?.id || null}
              />
            ))
          )}
        </section>
      )}

      {!searched && (
        <div className="card mt-4 p-8 text-center">
          <h2 className="text-2xl font-black">Start searching</h2>
          <p className="mt-2 text-white/50">
            Search by username, display name, or post text.
          </p>
        </div>
      )}
    </main>
  );
}