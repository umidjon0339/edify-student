"use client";

import { useRef, useState } from "react";
import { Camera, ImagePlus, Trash2 } from "lucide-react";
import { Button, cn } from "@/components/ui";
import CameraCapture from "./CameraCapture";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export interface ImagePickerLabels {
  add: string;
  camera: string;
  change: string;
  remove: string;
  hint: string;
}

interface Props {
  /** Object URL of a freshly picked file, or the stored download URL. */
  previewUrl: string | null;
  onPick: (file: File) => void;
  onClear: () => void;
  onError: (key: "notImage" | "imageTooBig") => void;
  labels: ImagePickerLabels;
  /** Thumbnail-sized variant used next to an answer option. */
  compact?: boolean;
}

/**
 * Picks + previews one image, from a FILE or straight from the CAMERA.
 * Uploading is the caller's job (it happens on save).
 *
 * ⚠️ The camera has two implementations and both are needed. In a secure context
 * `getUserMedia` gives a live view inside the app (`CameraCapture`), which is the
 * one that works on a laptop and lets the teacher retake without leaving the
 * form. Where that API is missing — plain http, an old in-app webview — the
 * button falls back to `<input capture>`, which hands off to the OS camera app.
 */
export default function ImagePicker({ previewUrl, onPick, onClear, onError, labels, compact = false }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const accept = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) return onError("notImage");
    if (file.size > MAX_IMAGE_BYTES) return onError("imageTooBig");
    onPick(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be re-picked after a remove
    accept(file);
  };

  const openCamera = () => {
    if (typeof navigator.mediaDevices?.getUserMedia === "function") setCameraOpen(true);
    else captureRef.current?.click();
  };

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleChange} className="hidden" />
      {/* The fallback path only: `capture` asks the OS for the camera app. */}
      <input ref={captureRef} type="file" accept="image/*" capture="environment" onChange={handleChange} className="hidden" />

      <CameraCapture open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={accept} />

      {previewUrl ? (
        <div className={cn("relative rounded-m3-lg border border-outline-variant bg-surface-container-lowest overflow-hidden", compact && "w-full")}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt=""
            className={cn("w-full object-contain bg-surface-container", compact ? "max-h-[110px]" : "max-h-[320px]")}
          />
          <div className="flex items-center justify-between gap-1 p-1.5 border-t border-outline-variant">
            <div className="flex items-center gap-0.5">
              <Button variant="text" size="sm" icon={<ImagePlus />} onClick={() => inputRef.current?.click()}>
                {compact ? "" : labels.change}
              </Button>
              <Button variant="text" size="sm" icon={<Camera />} onClick={openCamera}>
                {compact ? "" : labels.camera}
              </Button>
            </div>
            <Button variant="text" size="sm" icon={<Trash2 />} onClick={onClear}>
              {compact ? "" : labels.remove}
            </Button>
          </div>
        </div>
      ) : compact ? (
        <div className="flex items-center gap-1.5">
          <PickButton icon={<ImagePlus size={15} />} label={labels.add} onClick={() => inputRef.current?.click()} compact />
          <PickButton icon={<Camera size={15} />} label={labels.camera} onClick={openCamera} compact />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2.5 rounded-m3-lg border border-dashed border-outline py-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <PickButton icon={<ImagePlus size={17} />} label={labels.add} onClick={() => inputRef.current?.click()} />
            <PickButton icon={<Camera size={17} />} label={labels.camera} onClick={openCamera} />
          </div>
          {labels.hint && <span className="text-[11px] font-medium text-outline">{labels.hint}</span>}
        </div>
      )}
    </>
  );
}

function PickButton({
  icon, label, onClick, compact = false,
}: { icon: React.ReactNode; label: string; onClick: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "m3-interactive flex items-center justify-center gap-1.5 rounded-m3-md border border-outline-variant bg-surface-container-lowest font-bold text-on-surface-variant transition-colors hover:border-primary hover:bg-state-hover hover:text-primary",
        compact ? "flex-1 py-2 text-[11px]" : "px-4 py-2.5 text-[13px]",
      )}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
