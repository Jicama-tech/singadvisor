
import { useRef, useState } from "react";
import { ImageCropModal } from "@/components/admin/ImageCropModal";
import { Icon } from "@/components/ui/Icon";
import { withEventshUrl } from "@/lib/media-url";

/**
 * A file input that crops through ImageCropModal before the file is ever
 * submitted — the seam Phase 8a's ImageCropModal was built for. Reusable
 * across every new photo field this phase adds (workshop sessions here,
 * add-on items in 8e, ...); the existing banner/speaker-photo fields
 * (EventForm.tsx's own handleImageFileChange/handleSpeakerPhotoChange)
 * predate this and stay raw-file-input-with-no-crop, unchanged.
 *
 * The tricky part: a native `<input type="file">`'s FileList can't be set
 * with a plain assignment, only via the DataTransfer trick below — needed
 * so the *cropped* file (not the raw one the user originally picked) is
 * what actually submits under `name` when the surrounding <form> posts.
 */
export function CroppedImageField({
  name,
  existingPath,
  aspect,
  label,
}: {
  name: string;
  existingPath?: string;
  aspect?: number;
  label: string;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [cropSrc, setCropSrc] = useState<string | null>(null);
  const inputId = `${name}-file`;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setCropSrc(URL.createObjectURL(file));
  }

  function handleCropComplete(croppedFile: File) {
    setCropSrc(null);
    setPreview(URL.createObjectURL(croppedFile));
    if (fileInputRef.current) {
      const dt = new DataTransfer();
      dt.items.add(croppedFile);
      fileInputRef.current.files = dt.files;
    }
  }

  const displaySrc = preview || (existingPath ? withEventshUrl(existingPath) : "");

  return (
    <div>
      <label
        htmlFor={inputId}
        className="grid h-24 w-24 cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-[var(--border-strong)] bg-[var(--surface-sunken)] hover:border-[var(--accent)]"
      >
        {displaySrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- blob: preview URLs can't go through next/image
          <img src={displaySrc} alt="" className="h-full w-full object-cover" />
        ) : (
          <Icon name="plus" size={18} className="text-[var(--text-muted)]" />
        )}
      </label>
      <input
        ref={fileInputRef}
        id={inputId}
        name={name}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />
      <span className="mt-1 block text-xs text-[var(--text-muted)]">{label}</span>

      {cropSrc && (
        <ImageCropModal
          open
          image={cropSrc}
          defaultAspect={aspect}
          onClose={() => setCropSrc(null)}
          onCropComplete={handleCropComplete}
        />
      )}
    </div>
  );
}
