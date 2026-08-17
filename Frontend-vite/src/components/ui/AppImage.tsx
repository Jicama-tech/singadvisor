import type { ImgHTMLAttributes } from "react";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  /** Emulates next/image's fill mode: absolutely positioned to cover the
   * nearest relative parent (which must provide the aspect box — every
   * caller that passed fill already does, since they were written for
   * next/image). */
  fill?: boolean;
};

/**
 * Plain <img> with basePath handling — the Vite SPA replacement for the old
 * next/image wrapper. Next's optimizer never made sense for SPA code anyway:
 * a raw img renders remote (eventsh/Backend /uploads) and blob: preview
 * URLs directly, which the optimizer rejected. Same call-site API as before,
 * including `fill`.
 */
export function AppImage({ src, fill, className, alt, ...props }: Props) {
  return (
    <img
      src={withBasePath(src)}
      alt={alt ?? ""}
      loading="lazy"
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      {...props}
    />
  );
}
