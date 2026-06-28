import "./globals.css";
import Link from "next/link";
import { Compass, Home } from "lucide-react";

export default function GlobalNotFound() {
  return (
    <html lang="en">
      <body>
        <main className="min-h-dvh overflow-hidden bg-black text-white">
          <section className="flex min-h-dvh items-center justify-center px-4 py-10">
            <div className="w-full max-w-2xl text-center">
              <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-[28px] border border-white/10 bg-white/[0.06] shadow-2xl backdrop-blur-2xl">
                <Compass size={34} />
              </div>

              <p className="text-sm font-black uppercase tracking-[0.35em] text-white/40">
                404
              </p>

              <h1 className="mt-5 text-5xl font-black tracking-tight sm:text-7xl">
                Nothing here.
              </h1>

              <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-white/55 sm:text-lg">
                This route does not exist on VYBE.
              </p>

              <div className="mt-8">
                <Link href="/" className="btn btn-primary">
                  <Home size={17} />
                  Go home
                </Link>
              </div>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}