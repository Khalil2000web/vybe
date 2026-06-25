"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";
import { Check, X } from "lucide-react";

export default function FollowRequestActions({
  requesterId,
  onDone,
  compact = false,
}) {
  const router = useRouter();
  const supabase = createClient();

  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function acceptRequest() {
    if (!requesterId || working) return;

    setWorking(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("accept_follow_request", {
      p_requester_id: requesterId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setWorking(false);
      return;
    }

    onDone?.("accepted", requesterId);
    setWorking(false);
    router.refresh();
  }

  async function declineRequest() {
    if (!requesterId || working) return;

    setWorking(true);
    setError("");

    const { error: rpcError } = await supabase.rpc("decline_follow_request", {
      p_requester_id: requesterId,
    });

    if (rpcError) {
      setError(rpcError.message);
      setWorking(false);
      return;
    }

    onDone?.("declined", requesterId);
    setWorking(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <button
          onClick={acceptRequest}
          disabled={working}
          className={`btn btn-primary ${compact ? "min-h-10 px-4" : "flex-1"}`}
        >
          <Check size={16} />
          {compact ? "" : working ? "..." : "Accept"}
        </button>

        <button
          onClick={declineRequest}
          disabled={working}
          className={`btn btn-danger ${compact ? "min-h-10 px-4" : "flex-1"}`}
        >
          <X size={16} />
          {compact ? "" : working ? "..." : "Decline"}
        </button>
      </div>

      {error && (
        <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}