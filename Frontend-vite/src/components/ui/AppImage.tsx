import type { ImgHTMLAttributes } from "react";
import { withBasePath } from "@/lib/base-path";

/**
 * Plain <img> with basePath handling — the Vite SPA replacement for the old
 * next/image wrapper. Next's optimizer never made sense for SPA code anyway:
 * a raw img renders remote (eventsh/Backend /uploads) and blob: preview
 * URLs directly, which the optimizer rejected. Same call-site API as before
 * so no component had to change: fill/props pass through to the img tag
 * (fill is ignored — callers use explicit sizes here).
 */
export function AppImage({
  src,
  ...props
}: Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & { src: string }) {
  return <img src={withBasePath(src)} alt={props.alt ?? ""} loading="lazy" {...props} />;
}
