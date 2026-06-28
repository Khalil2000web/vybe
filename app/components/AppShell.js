import Link from "next/link";
import {
  Bell,
  Bookmark,
  Home,
  PlusSquare,
  Search,
  Settings,
  UserRound,
} from "lucide-react";
import NotificationBell from "@/app/components/NotificationBell";

export default function AppShell({ children, profile }) {
  return (
    <div className="app-shell">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-black/45 backdrop-blur-2xl">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-xl font-black tracking-tight">
            {process.env.NEXT_PUBLIC_APP_NAME || "VYBE"}
          </Link>

          <div className="flex items-center gap-2">
            {profile && <NotificationBell currentUserId={profile.id} />}

            <Link href="/search" className="btn btn-secondary min-h-10 px-4">
              Search
            </Link>

            {profile && (
              <Link
                href="/settings"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-white/15 bg-white/10 transition hover:bg-white/15"
              >
                <Settings size={18} />
              </Link>
            )}

            {profile && (
              <Link
                href={`/@${profile.username}`}
                className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/10"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.username}
                    className="h-full w-full pointer-events-none object-cover"
                  />
                ) : (
                  <span className="text-sm font-bold">
                    {(profile.display_name || profile.username)
                      ?.charAt(0)
                      ?.toUpperCase()}
                  </span>
                )}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main>{children}</main>

      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/10 bg-black/70 backdrop-blur-2xl flex items-center justify-center">
        <div className="w-[90%] mx-auto flex items-center justify-around max-w-3xl px-2 pb-3 pt-2">
          <Link
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-white/70"
            href="/"
          >
            <Home size={20} />
            Home
          </Link>

          <Link
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-white/70"
            href="/search"
          >
            <Search size={20} />
            Search
          </Link>

          <Link
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-white/70"
            href="/create"
          >
            <PlusSquare size={20} />
            Create
          </Link>

          <Link
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-white/70"
            href="/saved"
          >
            <Bookmark size={20} />
            Saved
          </Link>


          <Link
            className="flex flex-col items-center gap-1 py-2 text-[11px] text-white/70"
            href={profile ? `/@${profile.username}` : "/auth/login"}
          >
            <UserRound size={20} />
            Profile
          </Link>
        </div>
      </nav>
    </div>
  );
}