"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/app/lib/supabase/client";
import VerifiedBadge from "@/app/components/VerifiedBadge";

function getActiveToken(value, cursorPosition) {
  const beforeCursor = value.slice(0, cursorPosition);

  const match = beforeCursor.match(/(^|[\s\n])([@#])([a-zA-Z0-9_]{0,50})$/);

  if (!match) return null;

  const symbol = match[2];
  const query = match[3].toLowerCase();
  const start = cursorPosition - symbol.length - query.length;

  return {
    symbol,
    query,
    start,
    end: cursorPosition,
  };
}

export default function PostComposerTextarea({
  value,
  onChange,
  className = "",
  placeholder = "",
  maxLength = 500,
}) {
  const supabase = createClient();
  const textareaRef = useRef(null);

  const [cursorPosition, setCursorPosition] = useState(0);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const activeToken = useMemo(() => {
    return getActiveToken(value || "", cursorPosition);
  }, [value, cursorPosition]);

  function updateCursor() {
    const textarea = textareaRef.current;
    if (!textarea) return;

    setCursorPosition(textarea.selectionStart || 0);
  }

  useEffect(() => {
    let ignore = false;

    async function loadSuggestions() {
      if (!activeToken) {
        setSuggestions([]);
        return;
      }

      const query = activeToken.query;

      if (activeToken.symbol === "@" && query.length === 0) {
        setSuggestions([]);
        return;
      }

      setLoading(true);

      if (activeToken.symbol === "@") {
        const { data } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url, is_verified")
          .ilike("username", `${query}%`)
          .order("username", { ascending: true })
          .limit(8);

        if (!ignore) {
          setSuggestions(data || []);
          setLoading(false);
        }

        return;
      }

      if (activeToken.symbol === "#") {
        let request = supabase
          .from("tags")
          .select("id, name, posts_count")
          .order("posts_count", { ascending: false })
          .limit(8);

        if (query.length > 0) {
          request = request.ilike("name", `${query}%`);
        }

        const { data } = await request;

        const cleanQuery = query.toLowerCase().replace(/[^a-z0-9_]/g, "");

        const existing = (data || []).some((tag) => tag.name === cleanQuery);

        const finalSuggestions =
          cleanQuery && !existing
            ? [{ id: `new-${cleanQuery}`, name: cleanQuery, posts_count: 0, isNew: true }, ...(data || [])]
            : data || [];

        if (!ignore) {
          setSuggestions(finalSuggestions);
          setLoading(false);
        }
      }
    }

    const timer = setTimeout(loadSuggestions, 160);

    return () => {
      ignore = true;
      clearTimeout(timer);
    };
  }, [activeToken, supabase]);

  function chooseSuggestion(item) {
    if (!activeToken) return;

    const before = value.slice(0, activeToken.start);
    const after = value.slice(activeToken.end);

    const insertedText =
      activeToken.symbol === "@"
        ? `@${item.username} `
        : `#${item.name} `;

    const nextValue = `${before}${insertedText}${after}`;
    const nextCursor = before.length + insertedText.length;

    onChange(nextValue);
    setSuggestions([]);

    requestAnimationFrame(() => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      textarea.focus();
      textarea.setSelectionRange(nextCursor, nextCursor);
      setCursorPosition(nextCursor);
    });
  }

  const showSuggestions =
    activeToken && (suggestions.length > 0 || loading);

return (
  <div className="relative z-[200] overflow-visible">
      <textarea
        ref={textareaRef}
        className={className}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCursorPosition(e.target.selectionStart || 0);
        }}
        onClick={updateCursor}
        onKeyUp={updateCursor}
        onSelect={updateCursor}
        maxLength={maxLength}
        placeholder={placeholder}
      />

      {showSuggestions && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[9999] overflow-hidden rounded-[22px] border border-white/10 bg-black/95 shadow-2xl backdrop-blur-2xl">
          {loading ? (
            <div className="p-4 text-sm text-white/45">Searching...</div>
          ) : activeToken.symbol === "@" ? (
            suggestions.map((user) => (
              <button
                key={user.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseSuggestion(user)}
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
              </button>
            ))
          ) : (
            suggestions.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => chooseSuggestion(tag)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/10"
              >
                <div>
                  <p className="font-bold">#{tag.name}</p>
                  <p className="text-sm text-white/45">
                    {tag.isNew
                      ? "Create new tag"
                      : `${tag.posts_count || 0} posts`}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}