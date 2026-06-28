"use client";

import { Fragment } from "react";
import { Dialog, Transition } from "@headlessui/react";
import { AlertTriangle, X } from "lucide-react";

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title = "Are you sure?",
  description = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = true,
  loading = false,
}) {
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
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xl" />
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
              <Dialog.Panel className="card w-full max-w-md overflow-hidden p-0">
                <div className="flex items-start justify-between gap-4 border-b border-white/10 p-5">
                  <div className="flex items-start gap-3">
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full ${
                        danger
                          ? "bg-red-500/15 text-red-200"
                          : "bg-white/10 text-white"
                      }`}
                    >
                      <AlertTriangle size={21} />
                    </div>

                    <div>
                      <Dialog.Title className="text-2xl font-black">
                        {title}
                      </Dialog.Title>

                      <p className="mt-2 text-sm leading-6 text-white/55">
                        {description}
                      </p>
                    </div>
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

                <div className="grid grid-cols-2 gap-2 p-5">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={loading}
                    className="btn btn-secondary w-full"
                  >
                    {cancelText}
                  </button>

                  <button
                    type="button"
                    onClick={onConfirm}
                    disabled={loading}
                    className={`btn w-full ${
                      danger ? "btn-danger" : "btn-primary"
                    }`}
                  >
                    {loading ? "Working..." : confirmText}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}