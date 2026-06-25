import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function proxy(request) {
  const pathname = request.nextUrl.pathname;

  // Pretty profile URLs:
  // /@khaliil -> /profile/khaliil
  // /@khaliil/followers -> /profile/khaliil/followers
  if (pathname.startsWith("/@")) {
    const withoutAt = pathname.slice(2);
    const parts = withoutAt.split("/").filter(Boolean);

    const username = parts[0];
    const rest = parts.slice(1).join("/");

    if (username) {
      const internalPath = `/profile/${username}${rest ? `/${rest}` : ""}`;
      return NextResponse.rewrite(new URL(internalPath, request.url));
    }
  }

  let response = NextResponse.next({
    request,
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return response;
  }

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });

        response = NextResponse.next({
          request,
        });

        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (pathname === "/auth/login" || pathname === "/auth/signup") {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    } catch {
      return response;
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4|webm|mov)$).*)",
  ],
};