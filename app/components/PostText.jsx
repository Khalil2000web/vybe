import Link from "next/link";

const tokenRegex = /([#@][a-zA-Z0-9_]{1,50})/g;

export default function PostText({ text }) {
  if (!text) return null;

  const parts = text.split(tokenRegex);

  return (
    <p className="mt-4 whitespace-pre-wrap break-words text-white/85">
      {parts.map((part, index) => {
        if (!part) return null;

        if (part.startsWith("#") && part.length > 1) {
          const tag = part.slice(1).toLowerCase();

          return (
            <Link
              key={`${part}-${index}`}
              href={`/tag/${tag}`}
              className="font-bold text-white underline decoration-white/45 underline-offset-4 transition hover:decoration-white"
            >
              {part}
            </Link>
          );
        }

        if (part.startsWith("@") && part.length > 1) {
          const username = part.slice(1).toLowerCase();

          return (
            <Link
              key={`${part}-${index}`}
              href={`/@${username}`}
              className="font-bold text-white underline decoration-white/45 underline-offset-4 transition hover:decoration-white"
            >
              {part}
            </Link>
          );
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </p>
  );
}