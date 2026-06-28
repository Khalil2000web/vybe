"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import NextImage from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";

function getMediaItems(post) {
  const mediaFromTable = Array.isArray(post?.post_media)
    ? [...post.post_media]
        .filter((item) => item.media_url && item.media_type)
        .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
    : [];

  if (mediaFromTable.length > 0) {
    return mediaFromTable;
  }

  if (post?.media_url && post?.media_type) {
    return [
      {
        id: `${post.id}-single-media`,
        media_url: post.media_url,
        media_type: post.media_type,
        sort_order: 0,
      },
    ];
  }

  return [];
}

function getWrappedIndex(index, length) {
  if (length <= 0) return 0;
  if (index < 0) return length - 1;
  if (index >= length) return 0;
  return index;
}

export default function PostMediaCarousel({ post }) {
  const mediaItems = useMemo(() => getMediaItems(post), [post]);

  const [activeIndex, setActiveIndex] = useState(0);
  const pointerStartRef = useRef(null);

  const hasMultiple = mediaItems.length > 1;

  useEffect(() => {
    setActiveIndex(0);
  }, [post?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (mediaItems.length === 0) return;

    const indexesToPreload = [
      activeIndex,
      getWrappedIndex(activeIndex - 1, mediaItems.length),
      getWrappedIndex(activeIndex + 1, mediaItems.length),
    ];

    for (const index of indexesToPreload) {
      const item = mediaItems[index];

      if (!item || item.media_type !== "image") continue;

      const image = new window.Image();
      image.decoding = "async";
      image.src = item.media_url;
    }
  }, [activeIndex, mediaItems]);

  if (mediaItems.length === 0) return null;

  function previous() {
    setActiveIndex((index) => getWrappedIndex(index - 1, mediaItems.length));
  }

  function next() {
    setActiveIndex((index) => getWrappedIndex(index + 1, mediaItems.length));
  }

  function goTo(index) {
    setActiveIndex(getWrappedIndex(index, mediaItems.length));
  }

  function onPointerDown(e) {
    if (!hasMultiple) return;

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
    };
  }

  function onPointerUp(e) {
    if (!hasMultiple || !pointerStartRef.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;

    pointerStartRef.current = null;

    if (Math.abs(dx) < 45) return;
    if (Math.abs(dy) > Math.abs(dx)) return;

    if (dx < 0) {
      next();
    } else {
      previous();
    }
  }

  return (
    <div className="relative mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-black">
      <div
        className="relative aspect-square w-full touch-pan-y overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          pointerStartRef.current = null;
        }}
      >
        <div
          className="flex h-full transition-transform duration-200 ease-out will-change-transform"
          style={{
            transform: `translate3d(-${activeIndex * 100}%, 0, 0)`,
          }}
        >
          {mediaItems.map((item, index) => (
            <div
              key={item.id || `${item.media_url}-${index}`}
              className="relative h-full w-full shrink-0"
            >
              {item.media_type === "video" ? (
                <video
                  src={item.media_url}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                />
              ) : (
                <NextImage
                  src={item.media_url}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 100vw, 768px"
                  loading={
                    Math.abs(index - activeIndex) <= 1 ? "eager" : "lazy"
                  }
                  quality={78}
                  unoptimized
                  className="pointer-events-none select-none object-contain"
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={previous}
            className="absolute left-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-xl transition hover:bg-black/75"
            aria-label="Previous image"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-xl transition hover:bg-black/75"
            aria-label="Next image"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute right-3 top-3 z-10 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-xl">
            {activeIndex + 1}/{mediaItems.length}
          </div>

          <div className="absolute bottom-3 left-0 right-0 z-10 flex justify-center gap-1.5">
            {mediaItems.map((item, index) => (
              <button
                key={item.id || `${item.media_url}-${index}-dot`}
                type="button"
                onClick={() => goTo(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"
                }`}
                aria-label={`Go to image ${index + 1}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}