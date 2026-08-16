"use client";

import { useRef, useState } from "react";
import ReactCrop, {
  centerCrop,
  makeAspectCrop,
  type Crop,
  type PixelCrop,
} from "react-image-crop";
import "react-image-crop/dist/ReactCrop.css";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

/**
 * Ported from eventsh-v1's frontend/src/components/ui/imageCropModal.tsx —
 * same crop-then-return-a-File contract, rebuilt on this app's own Dialog/
 * Button instead of shadcn. Nothing else in this app crops images today
 * (EventForm.tsx's existing photo fields are a raw file input -> blob
 * preview, no crop step) — this is the shared seam every new photo field
 * from Phase 8 onward plugs into.
 */
interface ImageCropModalProps {
  open: boolean;
  image: string;
  onClose: () => void;
  onCropComplete: (file: File) => void;
  /** Optional initial locked ratio (e.g. 16/9). Omit for free cropping. */
  defaultAspect?: number;
}

const ASPECT_RATIOS: { label: string; value: number | undefined }[] = [
  { label: "Free", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
];

function makeCenteredCrop(width: number, height: number, aspect?: number): Crop {
  if (aspect) {
    return centerCrop(makeAspectCrop({ unit: "%", width: 90 }, aspect, width, height), width, height);
  }
  return { unit: "%", x: 5, y: 5, width: 90, height: 90 };
}

export function ImageCropModal({
  open,
  image,
  onClose,
  onCropComplete,
  defaultAspect,
}: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(defaultAspect);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    setCrop(makeCenteredCrop(width, height, aspect));
  };

  const changeAspect = (a?: number) => {
    setAspect(a);
    if (imgRef.current) {
      const { width, height } = imgRef.current;
      setCrop(makeCenteredCrop(width, height, a));
    }
  };

  const handleSave = async () => {
    if (saving) return;
    const img = imgRef.current;
    if (!img) return;
    setSaving(true);
    setError(null);
    try {
      let c: PixelCrop;
      if (completedCrop && completedCrop.width && completedCrop.height) {
        c = completedCrop;
      } else if (crop && crop.width && crop.height) {
        const pct = crop.unit === "%";
        c = {
          unit: "px",
          x: pct ? (crop.x / 100) * img.width : crop.x,
          y: pct ? (crop.y / 100) * img.height : crop.y,
          width: pct ? (crop.width / 100) * img.width : crop.width,
          height: pct ? (crop.height / 100) * img.height : crop.height,
        };
      } else {
        c = { unit: "px", x: 0, y: 0, width: img.width, height: img.height };
      }

      const scaleX = img.naturalWidth / img.width;
      const scaleY = img.naturalHeight / img.height;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(c.width * scaleX));
      canvas.height = Math.max(1, Math.round(c.height * scaleY));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(
        img,
        c.x * scaleX,
        c.y * scaleY,
        c.width * scaleX,
        c.height * scaleY,
        0,
        0,
        canvas.width,
        canvas.height,
      );

      const blob: Blob = await new Promise((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("Could not create image"))), "image/jpeg", 0.92),
      );
      const file = new File([blob], `cropped-${Date.now()}.jpg`, { type: blob.type || "image/jpeg" });
      onCropComplete(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} title="Crop image">
      <div className="flex justify-center overflow-hidden rounded-xl bg-black/90">
        <ReactCrop
          crop={crop}
          onChange={(_, percentCrop) => setCrop(percentCrop)}
          onComplete={(c) => setCompletedCrop(c)}
          aspect={aspect}
          ruleOfThirds
          keepSelection
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- source is
              a blob: URL from the just-selected file; next/image can't
              optimize that. */}
          <img
            ref={imgRef}
            src={image}
            alt="Crop preview"
            crossOrigin="anonymous"
            onLoad={onImageLoad}
            style={{ maxHeight: "60vh", objectFit: "contain" }}
          />
        </ReactCrop>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-[var(--text-muted)]">Lock ratio:</span>
        {ASPECT_RATIOS.map((item) => (
          <Button
            key={item.label}
            type="button"
            size="sm"
            variant={aspect === item.value ? "primary" : "secondary"}
            onClick={() => changeAspect(item.value)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}

      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Crop & save"}
        </Button>
      </div>
    </Dialog>
  );
}
