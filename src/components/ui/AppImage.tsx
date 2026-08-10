import NextImage, { type ImageProps } from "next/image";
import { withBasePath } from "@/lib/base-path";

/**
 * `next/image` with basePath handling.
 *
 * Next.js prefixes `next/link` hrefs with `basePath` but passes an <Image>
 * `src` straight through into the optimizer query string. The optimizer then
 * resolves that path against the served URL space — which includes the
 * basePath — so an unprefixed "/Images/x.png" comes back 400 "The requested
 * resource isn't a valid image", breaking every image on the site.
 *
 * Prefixing here rather than at ~20 call sites also covers the paths that come
 * out of the database, where a caller could not reasonably know to do it.
 * `withBasePath` is idempotent and ignores remote URLs, so static imports and
 * absolute URLs pass through untouched.
 */
export function AppImage({ src, ...props }: ImageProps) {
  return (
    <NextImage
      src={typeof src === "string" ? withBasePath(src) : src}
      {...props}
    />
  );
}
