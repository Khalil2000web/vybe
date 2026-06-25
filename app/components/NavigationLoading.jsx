"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export default function NavigationLoading() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    setLoading(false);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    function startLoading() {
      setLoading(true);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        setLoading(false);
      }, 8000);
    }

    function handleClick(event) {
      if (
        event.defaultPrevented ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey ||
        event.button !== 0
      ) {
        return;
      }

      const anchor = event.target.closest("a");

      if (!anchor) return;

      const href = anchor.getAttribute("href");

      if (!href) return;
      if (href.startsWith("#")) return;
      if (href.startsWith("mailto:")) return;
      if (href.startsWith("tel:")) return;
      if (anchor.target === "_blank") return;
      if (anchor.hasAttribute("download")) return;

      let url;

      try {
        url = new URL(anchor.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;

      const currentPath = window.location.pathname;
      const currentSearch = window.location.search;

      if (url.pathname === currentPath && url.search === currentSearch) {
        return;
      }

      startLoading();
    }

    function handlePageShow() {
      setLoading(false);
    }

    document.addEventListener("click", handleClick, true);
    window.addEventListener("pageshow", handlePageShow);

    return () => {
      document.removeEventListener("click", handleClick, true);
      window.removeEventListener("pageshow", handlePageShow);

      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  if (!loading) return null;

  return (
    <>
      <div className="fixed left-0 top-0 z-[9999] h-1 w-full overflow-hidden bg-white/10">
        <div className="route-loader-bar h-full w-1/2 rounded-full bg-white" />
      </div>

      <div className="pointer-events-none fixed left-1/2 top-4 z-[9999] -translate-x-1/2 rounded-full border border-white/10 bg-black/70 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/70 backdrop-blur-xl">
        Loading
      </div>
    </>
  );
}