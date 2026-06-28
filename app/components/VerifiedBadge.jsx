import { BadgeCheck } from "lucide-react";

export default function VerifiedBadge({ size = 16 }) {
  return (
    <span
      title="Verified"
      className="inline-flex shrink-0 items-center justify-center text-sky-300"
    >
      <BadgeCheck size={size} fill="#fff" className="text-black" />
    </span>
  );
}