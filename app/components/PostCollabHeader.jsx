import Link from "next/link";
import VerifiedBadge from "@/app/components/VerifiedBadge";

export default function PostCollabHeader({ author, collaborators = [] }) {
  const acceptedCollaborators = collaborators.filter(
    (item) => item.status === "accepted" && item.profile
  );

  if (acceptedCollaborators.length === 0) {
    return (
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate">
          {author?.display_name || author?.username || "Unknown"}
        </span>

        {author?.is_verified && <VerifiedBadge size={15} />}
      </span>
    );
  }

  const firstCollaborator = acceptedCollaborators[0]?.profile;

  if (acceptedCollaborators.length === 1) {
    return (
      <span className="flex min-w-0 flex-wrap items-center gap-1">
        <Link
          href={author?.username ? `/@${author.username}` : "/"}
          className="inline-flex min-w-0 items-center gap-1 hover:underline"
        >
          <span className="truncate">
            {author?.display_name || author?.username || "Unknown"}
          </span>
          {author?.is_verified && <VerifiedBadge size={15} />}
        </Link>

        <span className="text-white/35">+</span>

        <Link
          href={firstCollaborator?.username ? `/@${firstCollaborator.username}` : "/"}
          className="inline-flex min-w-0 items-center gap-1 hover:underline"
        >
          <span className="truncate">
            {firstCollaborator?.display_name ||
              firstCollaborator?.username ||
              "Collaborator"}
          </span>
          {firstCollaborator?.is_verified && <VerifiedBadge size={15} />}
        </Link>
      </span>
    );
  }

  return (
    <span className="flex min-w-0 flex-wrap items-center gap-1">
      <Link
        href={author?.username ? `/@${author.username}` : "/"}
        className="inline-flex min-w-0 items-center gap-1 hover:underline"
      >
        <span className="truncate">
          {author?.display_name || author?.username || "Unknown"}
        </span>
        {author?.is_verified && <VerifiedBadge size={15} />}
      </Link>

      <span className="text-white/35">+</span>

      <span>{acceptedCollaborators.length} others</span>
    </span>
  );
}