import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { resolveUploadPath } from "@/lib/uploads";

/**
 * Streams a candidate résumé to a signed-in admin.
 *
 * Résumés are personal data stored outside public/, so this is the only way to
 * read one. The middleware already gates /admin/*, but this checks the session
 * itself — a route handler is directly reachable and must not depend on the
 * middleware having run.
 */

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx":
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const session = await getSession();
  if (!session) {
    return new NextResponse("Not authorised", { status: 401 });
  }

  const { file } = await params;

  // Rejects anything that is not a filename we generated, so a crafted
  // "../../.env" never reaches the filesystem.
  const absolute = resolveUploadPath(file);
  if (!absolute) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Only serve files an application actually references — a stale or guessed
  // filename should not be readable just because it is on disk.
  const application = await db.jobApplication.findFirst({
    where: { resumePath: path.basename(file) },
    select: { resumeName: true },
  });
  if (!application) {
    return new NextResponse("Not found", { status: 404 });
  }

  try {
    await stat(absolute);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const data = await readFile(absolute);
  const ext = path.extname(absolute).toLowerCase();

  // `inline` so a PDF opens in the browser rather than forcing a download,
  // with the candidate's original filename restored for readability.
  const downloadName = (application.resumeName ?? path.basename(absolute))
    .replace(/["\\\r\n]/g, "")
    .slice(0, 200);

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
      "Content-Disposition": `inline; filename="${downloadName}"`,
      "Content-Length": String(data.byteLength),
      // Personal data: never cached by a proxy or indexed.
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex, nofollow",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
