"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCcw } from "lucide-react";

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <main className="min-h-dvh overflow-hidden bg-black text-white">
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute left-1/2 top-0 h-[420px] w-[420px] -translate-x-1/2 rounded-full bg-red-500/10 blur-[120px]" />
        <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-white/10 blur-[130px]" />
      </div>

      <section className="relative z-10 flex min-h-dvh items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-red-300/15 bg-red-500/10 text-red-100 shadow-2xl backdrop-blur-2xl">
            <AlertTriangle size={34} />
          </div>

          <p className="text-sm font-black uppercase tracking-[0.35em] text-red-100/50">
            Something broke
          </p>

          <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-7xl">
            VYBE hit a glitch.
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
            Something went wrong while opening this page. You can try again or
            go back home.
          </p>

          {error?.digest && (
            <p className="mx-auto mt-4 max-w-md rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-xs text-white/35">
              Error ID: {error.digest}
            </p>
          )}

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <button type="button" onClick={reset} className="btn btn-primary">
              <RefreshCcw size={17} />
              Try again
            </button>

            <Link href="/" className="btn btn-secondary">
              <Home size={17} />
              Go home
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}