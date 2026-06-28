import Link from "next/link";
import { Compass, Home, Search, Sparkles } from "lucide-react";

export const metadata = {
  title: "Page not found · VYBE",
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <main className="font-[var(--mono)] min-h-dvh overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-white/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-sky-400/10 blur-[130px]" />
        <div className="absolute left-0 top-1/2 h-[300px] w-[300px] rounded-full bg-fuchsia-400/10 blur-[130px]" />
      </div>

      <section className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-2xl">
            <Compass size={34} />
          </div>

          <p className="text-sm uppercase tracking-[0.35em] text-white/40">
            404 · Lost VYBE
          </p>

          <h1 className="mt-5 text-5xl tracking-tight sm:text-7xl">
            This page disappeared.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
            The link may be broken, the post may have been deleted, or this page
            simply does not exist on VYBE.
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/" className="btn btn-primary">
              <Home size={17} />
              Go home
            </Link>

            <Link href="/explore" className="btn btn-secondary">
              <Search size={17} />
              Explore
            </Link>
          </div>

          <div className="mx-auto mt-8 max-w-md rounded-[28px] border border-white/10 bg-white/[0.04] p-4 text-left backdrop-blur-xl">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Sparkles size={17} />
              </div>

              <div>
                <p className="font-[var(--mono)]">Try searching again</p>
                <p className="mt-1 text-sm leading-6 text-white/45">
                  Usernames, posts, and tags can change. Go back home and try
                  opening the profile or tag again.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}