"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/app/lib/supabase/client";

export default function NotificationBell({ currentUserId }) {
  const supabase = createClient();
  const [count, setCount] = useState(0);

  async function loadUnreadCount() {
    if (!currentUserId) return;

    const { count: unreadCount } = await supabase
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("user_id", currentUserId)
      .eq("is_read", false);

    setCount(unreadCount || 0);
  }

  useEffect(() => {
    loadUnreadCount();
  }, [currentUserId]);

  return (
    <Link
      href="/notifications"
      className="relative flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/15"
    >
      <Bell size={18} />

      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-[10px] font-black text-black">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}