"use client";

import { useEffect, useState } from "react";
import { Search, UserPlus, X } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";
import VerifiedBadge from "@/app/components/VerifiedBadge";

export default function CollaboratorPicker({
  currentUserId,
  selected,
  onSelect,
}) {
  const supabase = createClient();

  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function searchUsers() {
      const cleanQuery = query.trim().replace(/^@/, "").toLowerCase();

      if (!cleanQuery) {
        setResults([]);
        return;
      }

      setLoading(true);

      let request = supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, is_verified")
        .ilike("username", `${cleanQuery}%`)
        .order("username", { ascending: true })
        .limit(8);

      if (currentUserId) {
        request = request.neq("id", currentUserId);
      }

      const { data } = await request;

      if (!ignore) {
        setResults(data || []);
        setLoading(false);
      }
    }

    const timer = setTimeout(searchUsers, 180);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [query, currentUserId, supabase]);

  if (selected) {
    return (
      <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
        <p className="mb-3 text-sm uppercase text-white/45">Collaborator</p>

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
              {selected.avatar_url ? (
                <img
                  src={selected.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                (selected.display_name || selected.username || "?")
                  .charAt(0)
                  .toUpperCase()
              )}
            </div>

            <div className="min-w-0">
              <p className="flex items-center gap-1 font-black">
                <span className="truncate">
                  {selected.display_name || selected.username}
                </span>

                {selected.is_verified && <VerifiedBadge size={14} />}
              </p>

              <p className="text-sm text-white/45">@{selected.username}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              onSelect(null);
              setQuery("");
              setResults([]);
            }}
            className="rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <p className="mt-3 text-xs leading-5 text-white/35">
          They’ll receive a collaboration request. The post appears on their
          profile only after they accept.
        </p>
      </div>
    );
  }

  return (
    <div className="relative z-[120] overflow-visible rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <p className="mb-2 text-sm uppercase text-white/45">
        Add collaborator
      </p>

      <div className="relative">
        <Search
          size={17}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/35"
        />

        <input
          className="field pl-11"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search username..."
        />
      </div>

      <p className="mt-2 text-xs leading-5 text-white/35">
        Optional. The collaborator must accept before the post appears on their
        profile.
      </p>

      {(loading || results.length > 0) && (
        <div className="absolute left-4 right-4 top-[calc(100%+8px)] z-[9999] overflow-hidden rounded-[22px] border border-white/10 bg-black/95 shadow-2xl backdrop-blur-2xl">
          {loading ? (
            <div className="p-4 text-sm text-white/45">Searching...</div>
          ) : (
            results.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => {
                  onSelect(user);
                  setQuery("");
                  setResults([]);
                }}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-white/10"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
                  {user.avatar_url ? (
                    <img
                      src={user.avatar_url}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    (user.display_name || user.username || "?")
                      .charAt(0)
                      .toUpperCase()
                  )}
                </div>

                <div className="min-w-0">
                  <p className="flex items-center gap-1 font-bold">
                    <span className="truncate">
                      {user.display_name || user.username}
                    </span>

                    {user.is_verified && <VerifiedBadge size={14} />}
                  </p>

                  <p className="text-sm text-white/45">@{user.username}</p>
                </div>

                <UserPlus size={17} className="ml-auto text-white/35" />
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}