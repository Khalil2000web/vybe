"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { ImageIcon, X } from "lucide-react";

const OUTPUT_WIDTH = 1600;
const OUTPUT_HEIGHT = 600;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function CoverCropDialog({
  open,
  file,
  onClose,
  onCropped,
  loading = false,
}) {
  const frameRef = useRef(null);
  const imageRef = useRef(null);
  const dragRef = useRef(null);

  const [imageUrl, setImageUrl] = useState("");
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [frameSize, setFrameSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!open || !file) {
      setImageUrl("");
      return;
    }

    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
    setNaturalSize({ width: 0, height: 0 });

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [open, file]);

  useEffect(() => {
    if (!frameRef.current) return;

    function updateSize() {
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect) return;

      setFrameSize({
        width: rect.width,
        height: rect.height,
      });
    }

    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(frameRef.current);

    return () => observer.disconnect();
  }, [open]);

  function getDisplaySize(nextZoom = zoom) {
    if (!naturalSize.width || !naturalSize.height || !frameSize.width) {
      return {
        width: 0,
        height: 0,
      };
    }

    const baseScale = Math.max(
      frameSize.width / naturalSize.width,
      frameSize.height / naturalSize.height
    );

    return {
      width: naturalSize.width * baseScale * nextZoom,
      height: naturalSize.height * baseScale * nextZoom,
    };
  }

  function clampPosition(nextPosition, nextZoom = zoom) {
    const display = getDisplaySize(nextZoom);

    const maxX = Math.max(0, (display.width - frameSize.width) / 2);
    const maxY = Math.max(0, (display.height - frameSize.height) / 2);

    return {
      x: clamp(nextPosition.x, -maxX, maxX),
      y: clamp(nextPosition.y, -maxY, maxY),
    };
  }

  function handleZoomChange(e) {
    const nextZoom = Number(e.target.value);

    setZoom(nextZoom);
    setPosition((current) => clampPosition(current, nextZoom));
  }

  function startDrag(e) {
    if (loading) return;

    e.currentTarget.setPointerCapture?.(e.pointerId);

    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startPosition: position,
    };
  }

  function moveDrag(e) {
    if (!dragRef.current || loading) return;

    const deltaX = e.clientX - dragRef.current.startX;
    const deltaY = e.clientY - dragRef.current.startY;

    const nextPosition = {
      x: dragRef.current.startPosition.x + deltaX,
      y: dragRef.current.startPosition.y + deltaY,
    };

    setPosition(clampPosition(nextPosition));
  }

  function stopDrag() {
    dragRef.current = null;
  }

  async function cropImage() {
    const img = imageRef.current;
    if (!img || !naturalSize.width || !frameSize.width) return;

    const display = getDisplaySize();

    const left = (frameSize.width - display.width) / 2 + position.x;
    const top = (frameSize.height - display.height) / 2 + position.y;

    const sourceX = ((0 - left) / display.width) * naturalSize.width;
    const sourceY = ((0 - top) / display.height) * naturalSize.height;
    const sourceWidth = (frameSize.width / display.width) * naturalSize.width;
    const sourceHeight =
      (frameSize.height / display.height) * naturalSize.height;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;

    const ctx = canvas.getContext("2d");

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT
    );

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onCropped(blob);
      },
      "image/jpeg",
      0.92
    );
  }

  const display = getDisplaySize();

  const imageStyle =
    display.width && display.height
      ? {
          width: `${display.width}px`,
          height: `${display.height}px`,
          left: `${(frameSize.width - display.width) / 2 + position.x}px`,
          top: `${(frameSize.height - display.height) / 2 + position.y}px`,
        }
      : {};

  return (
    <Transition appear show={open} as={Fragment}>
      <Dialog as="div" className="relative z-[99999]" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-200"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-150"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80 backdrop-blur-xl" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto p-4">
          <div className="flex min-h-full items-center justify-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-200"
              enterFrom="opacity-0 scale-95 translate-y-4"
              enterTo="opacity-100 scale-100 translate-y-0"
              leave="ease-in duration-150"
              leaveFrom="opacity-100 scale-100 translate-y-0"
              leaveTo="opacity-0 scale-95 translate-y-4"
            >
              <Dialog.Panel className="card w-full max-w-3xl overflow-hidden p-0">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
                  <div>
                    <Dialog.Title className="text-2xl font-black">
                      Adjust cover image
                    </Dialog.Title>

                    <p className="mt-1 text-sm text-white/45">
                      Drag and zoom to choose what appears on your profile.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="rounded-full p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
                  >
                    <X size={19} />
                  </button>
                </div>

                <div className="space-y-5 p-5">
                  <div
                    ref={frameRef}
                    onPointerDown={startDrag}
                    onPointerMove={moveDrag}
                    onPointerUp={stopDrag}
                    onPointerCancel={stopDrag}
                    className="relative aspect-[8/3] cursor-grab overflow-hidden rounded-[28px] border border-white/15 bg-white/5 active:cursor-grabbing"
                  >
                    {imageUrl ? (
                      <img
                        ref={imageRef}
                        src={imageUrl}
                        alt=""
                        draggable={false}
                        onLoad={(e) => {
                          setNaturalSize({
                            width: e.currentTarget.naturalWidth,
                            height: e.currentTarget.naturalHeight,
                          });
                        }}
                        className="pointer-events-none absolute select-none object-cover"
                        style={imageStyle}
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-white/35">
                        <ImageIcon size={34} />
                      </div>
                    )}

                    <div className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/15" />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs uppercase text-white/40">
                      <span>Zoom</span>
                      <span>{Math.round(zoom * 100)}%</span>
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.01"
                      value={zoom}
                      onChange={handleZoomChange}
                      disabled={loading}
                      className="w-full accent-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={onClose}
                      disabled={loading}
                      className="btn btn-secondary w-full"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={cropImage}
                      disabled={loading || !imageUrl}
                      className="btn btn-primary w-full"
                    >
                      {loading ? "Saving..." : "Save cover"}
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}