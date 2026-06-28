"use client";

import { useState } from "react";
import { UserPlus, X } from "lucide-react";
import CollaboratorPicker from "@/app/components/CollaboratorPicker";
import VerifiedBadge from "@/app/components/VerifiedBadge";

export default function PostCollabManager({
  postId,
  currentUserId,
  collaborators,
  onChanged,
}) {
  const [selectedCollaborator, setSelectedCollaborator] = useState(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  async function addCollaborator() {
    if (!selectedCollaborator?.username || working) return;

    setWorking(true);
    setError("");

    const { error: rpcError } = await window.supabaseClient.rpc(
      "request_post_collaboration",
      {
        p_post_id: postId,
        p_collaborator_username: selectedCollaborator.username,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setWorking(false);
      return;
    }

    setSelectedCollaborator(null);
    setWorking(false);
    onChanged?.();
  }

  async function removeCollaborator(collaboratorId) {
    if (!collaboratorId || working) return;

    setWorking(true);
    setError("");

    const { error: rpcError } = await window.supabaseClient.rpc(
      "remove_post_collaborator",
      {
        p_post_id: postId,
        p_collaborator_id: collaboratorId,
      }
    );

    if (rpcError) {
      setError(rpcError.message);
      setWorking(false);
      return;
    }

    setWorking(false);
    onChanged?.();
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="font-black">Collaborators</p>
          <p className="mt-1 text-sm text-white/45">
            Add people to share this post on both profiles.
          </p>
        </div>

        <UserPlus size={18} className="text-white/40" />
      </div>

      {collaborators.length > 0 ? (
        <div className="mb-4 space-y-2">
          {collaborators.map((collab) => {
            const profile = collab.profile;
            if (!profile) return null;

            return (
              <div
                key={collab.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 p-3"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10 font-bold">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      (profile.display_name || profile.username || "?")
                        .charAt(0)
                        .toUpperCase()
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="flex items-center gap-1 font-bold">
                      <span className="truncate">
                        {profile.display_name || profile.username}
                      </span>

                      {profile.is_verified && <VerifiedBadge size={14} />}
                    </p>

                    <p className="text-xs text-white/40">
                      @{profile.username} · {collab.status}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => removeCollaborator(profile.id)}
                  disabled={working}
                  className="rounded-full p-2 text-white/45 hover:bg-red-500/10 hover:text-red-200"
                >
                  <X size={17} />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mb-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-sm text-white/45">
          No collaborators yet.
        </p>
      )}

      <CollaboratorPicker
        currentUserId={currentUserId}
        selected={selectedCollaborator}
        onSelect={setSelectedCollaborator}
      />

      {selectedCollaborator && (
        <button
          type="button"
          onClick={addCollaborator}
          disabled={working}
          className="btn btn-primary mt-3 w-full"
        >
          {working ? "Sending..." : "Send collaboration request"}
        </button>
      )}

      {error && (
        <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
    </div>
  );
}