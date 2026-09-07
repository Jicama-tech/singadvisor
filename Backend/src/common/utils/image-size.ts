import { closeSync, openSync, readSync } from 'fs';

export type ImageSize = { width: number; height: number };

/**
 * Reads the pixel dimensions of a local image by parsing its header only —
 * no decoding, no image library, at most the first 64 KB of the file.
 *
 * Used by ShareService to emit `og:image:width` / `og:image:height`. Those
 * tags are optional, but WhatsApp and LinkedIn lay the preview card out
 * before they finish downloading the image: without them a link often
 * renders as a small square thumbnail (or nothing at all on a slow fetch)
 * instead of the wide cover card. Anything unparseable returns null and the
 * tags are simply omitted, so a new format can never break a share preview.
 */
export function readImageSize(absPath: string): ImageSize | null {
  let fd: number;
  try {
    fd = openSync(absPath, 'r');
  } catch {
    return null;
  }
  try {
    const buf = Buffer.alloc(64 * 1024);
    const read = readSync(fd, buf, 0, buf.length, 0);
    const head = buf.subarray(0, read);
    return png(head) ?? gif(head) ?? webp(head) ?? jpeg(head);
  } catch {
    return null;
  } finally {
    closeSync(fd);
  }
}

function png(b: Buffer): ImageSize | null {
  // \x89PNG\r\n\x1a\n, then an IHDR chunk whose width/height are the first
  // two big-endian uint32s of its payload.
  if (b.length < 24 || b.readUInt32BE(0) !== 0x89504e47) return null;
  if (b.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
}

function gif(b: Buffer): ImageSize | null {
  if (b.length < 10 || b.subarray(0, 4).toString('latin1') !== 'GIF8') return null;
  return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
}

function webp(b: Buffer): ImageSize | null {
  if (b.length < 30) return null;
  if (b.subarray(0, 4).toString('latin1') !== 'RIFF') return null;
  if (b.subarray(8, 12).toString('latin1') !== 'WEBP') return null;

  const chunk = b.subarray(12, 16).toString('latin1');
  // Simple lossy: dimensions are 14-bit fields after the 3-byte start code.
  if (chunk === 'VP8 ') {
    return {
      width: b.readUInt16LE(26) & 0x3fff,
      height: b.readUInt16LE(28) & 0x3fff,
    };
  }
  // Lossless: 14 bits each, packed across a 32-bit little-endian word.
  if (chunk === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return {
      width: (bits & 0x3fff) + 1,
      height: ((bits >> 14) & 0x3fff) + 1,
    };
  }
  // Extended (animated/alpha): canvas size as two 24-bit little-endian
  // values, each stored one less than the real dimension.
  if (chunk === 'VP8X') {
    const at24 = b.readUIntLE(24, 3);
    const at27 = b.readUIntLE(27, 3);
    return { width: at24 + 1, height: at27 + 1 };
  }
  return null;
}

function jpeg(b: Buffer): ImageSize | null {
  if (b.length < 4 || b.readUInt16BE(0) !== 0xffd8) return null;

  let offset = 2;
  while (offset + 9 < b.length) {
    // Segments are 0xFF-prefixed; fill bytes (0xFF padding) are skipped.
    if (b[offset] !== 0xff) {
      offset += 1;
      continue;
    }
    const marker = b[offset + 1];
    // Standalone markers carry no length field.
    if (marker === 0xd8 || marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) {
      offset += 2;
      continue;
    }
    const length = b.readUInt16BE(offset + 2);
    // SOF0..SOF15, minus DHT (0xC4), JPG (0xC8) and DAC (0xCC), which share
    // the range but are not frame headers.
    const isFrameHeader =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isFrameHeader) {
      return { height: b.readUInt16BE(offset + 5), width: b.readUInt16BE(offset + 7) };
    }
    if (length < 2) return null;
    offset += 2 + length;
  }
  return null;
}
