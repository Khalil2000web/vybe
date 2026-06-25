"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
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

export default function PostMediaCarousel({ post }) {
  const mediaItems = useMemo(() => getMediaItems(post), [post]);
  const [activeIndex, setActiveIndex] = useState(0);

  if (mediaItems.length === 0) return null;

  const activeItem = mediaItems[activeIndex];
  const hasMultiple = mediaItems.length > 1;

  function previous() {
    setActiveIndex((index) =>
      index === 0 ? mediaItems.length - 1 : index - 1
    );
  }

  function next() {
    setActiveIndex((index) =>
      index === mediaItems.length - 1 ? 0 : index + 1
    );
  }

  return (
    <div className="relative mt-4 overflow-hidden rounded-[24px] border border-white/10 bg-black">
      <div className="relative aspect-square w-full">
        {activeItem.media_type === "video" ? (
          <video
            src={activeItem.media_url}
            controls
            playsInline
            className="h-full w-full object-contain"
          />
        ) : (
          <Image
            src={activeItem.media_url}
            alt=""
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="pointer-events-none object-contain"
          />
        )}
      </div>

      {hasMultiple && (
        <>
          <button
            type="button"
            onClick={previous}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-xl"
          >
            <ChevronLeft size={20} />
          </button>

          <button
            type="button"
            onClick={next}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-black/55 text-white backdrop-blur-xl"
          >
            <ChevronRight size={20} />
          </button>

          <div className="absolute right-3 top-3 rounded-full border border-white/10 bg-black/60 px-3 py-1 text-xs font-bold text-white backdrop-blur-xl">
            {activeIndex + 1}/{mediaItems.length}
          </div>

          <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5">
            {mediaItems.map((item, index) => (
              <button
                key={item.id || `${item.media_url}-${index}`}
                type="button"
                onClick={() => setActiveIndex(index)}
                className={`h-1.5 rounded-full transition-all ${
                  index === activeIndex ? "w-5 bg-white" : "w-1.5 bg-white/40"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}