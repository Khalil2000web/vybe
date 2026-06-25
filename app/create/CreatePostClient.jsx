"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/app/lib/supabase/client";
import {
  ImagePlus,
  LockKeyhole,
  Move,
  SendHorizonal,
  Trash2,
  Unlock,
} from "lucide-react";

const MAX_IMAGES = 10;
const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
const OUTPUT_SIZE = 1080;
const PREVIEW_SIZE = 320;

const allowedImageTypes = ["image/jpeg", "image/png", "image/webp"];

function createId() {
  return crypto.randomUUID();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = src;
  });
}

async function createCroppedBlob(item) {
  const image = await loadImage(item.preview);

  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const ctx = canvas.getContext("2d");

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);

  const baseScale = Math.max(
    OUTPUT_SIZE / image.naturalWidth,
    OUTPUT_SIZE / image.naturalHeight
  );

  const totalScale = baseScale * item.zoom;

  const drawWidth = image.naturalWidth * totalScale;
  const drawHeight = image.naturalHeight * totalScale;

  const offsetScale = OUTPUT_SIZE / PREVIEW_SIZE;

  const dx = (OUTPUT_SIZE - drawWidth) / 2 + item.offsetX * offsetScale;
  const dy = (OUTPUT_SIZE - drawHeight) / 2 + item.offsetY * offsetScale;

  ctx.drawImage(image, dx, dy, drawWidth, drawHeight);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Could not crop image."));
          return;
        }

        resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}

export default function CreatePostClient({ profile }) {
  const router = useRouter();
  const supabase = createClient();
  const dragRef = useRef(null);

  const [body, setBody] = useState("");
  const [visibility, setVisibility] = useState("public");
  const [items, setItems] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);

  const [posting, setPosting] = useState(false);
  const [error, setError] = useState("");

  const activeItem = items[activeIndex] || null;
  const canPost = body.trim().length > 0 || items.length > 0;

  function updateItem(itemId, changes) {
    setItems((current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, ...changes } : item
      )
    );
  }

  function chooseImages(e) {
    const files = Array.from(e.target.files || []);

    setError("");

    if (files.length === 0) return;

    if (items.length + files.length > MAX_IMAGES) {
      setError(`You can upload up to ${MAX_IMAGES} images.`);
      e.target.value = "";
      return;
    }

    const newItems = [];

    for (const file of files) {
      if (file.type.startsWith("video/")) {
        setError("Video uploads are disabled for now.");
        e.target.value = "";
        return;
      }

      if (!allowedImageTypes.includes(file.type)) {
        setError("Only JPG, PNG, and WEBP images are allowed.");
        e.target.value = "";
        return;
      }

      if (file.size > MAX_IMAGE_SIZE) {
        setError("One image is too large. Max is 6MB.");
        e.target.value = "";
        return;
      }

      newItems.push({
        id: createId(),
        file,
        preview: URL.createObjectURL(file),
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
      });
    }

    setItems((current) => [...current, ...newItems]);

    if (items.length === 0) {
      setActiveIndex(0);
    }

    e.target.value = "";
  }

  function removeItem(indexToRemove) {
    setItems((current) => {
      const removed = current[indexToRemove];

      if (removed?.preview) {
        URL.revokeObjectURL(removed.preview);
      }

      const next = current.filter((_, index) => index !== indexToRemove);

      setActiveIndex((currentIndex) => {
        if (next.length === 0) return 0;
        if (currentIndex >= next.length) return next.length - 1;
        return currentIndex;
      });

      return next;
    });
  }

  function startDrag(e) {
    if (!activeItem) return;

    e.currentTarget.setPointerCapture(e.pointerId);

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originalOffsetX: activeItem.offsetX,
      originalOffsetY: activeItem.offsetY,
      itemId: activeItem.id,
    };
  }

  function moveDrag(e) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== e.pointerId) return;

    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;

    updateItem(drag.itemId, {
      offsetX: drag.originalOffsetX + dx,
      offsetY: drag.originalOffsetY + dy,
    });
  }

  function endDrag(e) {
    const drag = dragRef.current;

    if (!drag || drag.pointerId !== e.pointerId) return;

    dragRef.current = null;
  }

  async function uploadImages() {
    const uploaded = [];

    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const blob = await createCroppedBlob(item);

      const fileName = `${crypto.randomUUID()}.jpg`;
      const path = `${profile.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("post-media")
        .upload(path, blob, {
          cacheControl: "3600",
          upsert: false,
          contentType: "image/jpeg",
        });

      if (uploadError) {
        throw new Error(uploadError.message);
      }

      const { data } = supabase.storage.from("post-media").getPublicUrl(path);

      uploaded.push({
        media_url: data.publicUrl,
        media_type: "image",
      });
    }

    return uploaded;
  }

  async function createPost(e) {
    e.preventDefault();

    if (!canPost || posting) return;

    setPosting(true);
    setError("");

    try {
      const uploadedMedia = await uploadImages();

      const response = await fetch("/api/posts/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          body: body.trim() || null,
          media: uploadedMedia,
          visibility,
        }),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Failed to create post.");
      }

      for (const item of items) {
        if (item.preview) URL.revokeObjectURL(item.preview);
      }

      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message || "Failed to create post.");
      setPosting(false);
    }
  }

  return (
    <main className="container-page">
      <div className="mb-5">
        <p className="text-sm uppercase tracking-[0.22em] text-white/40">
          Create
        </p>

        <h1 className="mt-1 text-4xl font-black">New post</h1>

        <p className="mt-2 text-white/50">
          Add up to 10 images. Crop, zoom, and drag each image before posting.
        </p>
      </div>

      <form onSubmit={createPost} className="space-y-5">
        <section className="card p-4">
          <div className="flex gap-3">
            <Link
              href={`/@${profile.username}`}
              className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/10"
            >
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="font-bold">
                  {(profile.display_name || profile.username)
                    ?.charAt(0)
                    ?.toUpperCase()}
                </span>
              )}
            </Link>

            <div className="min-w-0 flex-1">
              <textarea
                className="field min-h-32 resize-none"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={500}
                placeholder="Write something..."
              />

              <p className="mt-2 text-right text-xs text-white/35">
                {body.length}/500
              </p>
            </div>
          </div>
        </section>

        <section className="card p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-black">Images</h2>
              <p className="text-sm text-white/45">
                {items.length}/{MAX_IMAGES} selected
              </p>
            </div>

            <label className="btn btn-secondary">
              <ImagePlus size={16} />
              Add images
              <input
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={chooseImages}
                className="hidden"
              />
            </label>
          </div>

          {items.length === 0 ? (
            <div className="flex aspect-square items-center justify-center rounded-[28px] border border-dashed border-white/15 bg-white/[0.03] text-center text-white/40">
              Choose images to start editing.
            </div>
          ) : (
            <>
              <div
                className="relative mx-auto aspect-square w-full max-w-[320px] touch-none overflow-hidden rounded-[28px] border border-white/10 bg-black"
                onPointerDown={startDrag}
                onPointerMove={moveDrag}
                onPointerUp={endDrag}
                onPointerCancel={endDrag}
              >
                <img
                  src={activeItem.preview}
                  alt=""
                  className="pointer-events-none h-full w-full object-cover select-none"
                  style={{
                    transform: `translate(${activeItem.offsetX}px, ${activeItem.offsetY}px) scale(${activeItem.zoom})`,
                    transformOrigin: "center",
                  }}
                />

                <div className="pointer-events-none absolute left-3 top-3 rounded-full bg-black/70 px-3 py-1 text-xs font-bold text-white">
                  {activeIndex + 1}/{items.length}
                </div>

                <div className="pointer-events-none absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
                  <Move size={13} />
                  Drag image
                </div>
              </div>

              <label className="mt-4 block">
                <div className="mb-2 flex items-center justify-between text-sm text-white/45">
                  <span>Zoom</span>
                  <span>{activeItem.zoom.toFixed(1)}x</span>
                </div>

                <input
                  type="range"
                  min="1"
                  max="3"
                  step="0.05"
                  value={activeItem.zoom}
                  onChange={(e) =>
                    updateItem(activeItem.id, {
                      zoom: Number(e.target.value),
                    })
                  }
                  className="w-full"
                />
              </label>


<div className="mt-4 grid grid-cols-5 gap-2">
  {items.map((item, index) => (
    <div
      key={item.id}
      role="button"
      tabIndex={0}
      onClick={() => setActiveIndex(index)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setActiveIndex(index);
        }
      }}
      className={`relative aspect-square cursor-pointer overflow-hidden rounded-2xl border ${
        index === activeIndex ? "border-white" : "border-white/10"
      } bg-white/5`}
    >
      <img
        src={item.preview}
        alt=""
        className="pointer-events-none h-full w-full object-cover"
      />

      <span className="pointer-events-none absolute left-1 top-1 rounded-full bg-black/70 px-1.5 py-0.5 text-[10px] font-bold">
        {index + 1}
      </span>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          removeItem(index);
        }}
        className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white"
      >
        <Trash2 size={12} />
      </button>
    </div>
  ))}
</div>


            </>
          )}
        </section>

        <section className="card p-4">
          <h2 className="text-2xl font-black">Visibility</h2>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setVisibility("public")}
              className={`btn ${
                visibility === "public" ? "btn-primary" : "btn-secondary"
              }`}
            >
              <Unlock size={16} />
              Public
            </button>

            <button
              type="button"
              onClick={() => setVisibility("followers")}
              className={`btn ${
                visibility === "followers" ? "btn-primary" : "btn-secondary"
              }`}
            >
              <LockKeyhole size={16} />
              Followers
            </button>
          </div>
        </section>

        {error && (
          <p className="rounded-2xl border border-red-400/20 bg-red-500/10 p-3 text-sm text-red-200">
            {error}
          </p>
        )}

        <button
          disabled={!canPost || posting}
          className="btn btn-primary w-full"
        >
          <SendHorizonal size={16} />
          {posting ? "Cropping & posting..." : "Post"}
        </button>
      </form>
    </main>
  );
}