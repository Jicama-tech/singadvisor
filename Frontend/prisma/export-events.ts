/**
 * One-off export of the legacy Prisma `Event`/`Registration` rows to a JSON
 * file, for `Backend/scripts/import-events.ts` to pick up. Part of the
 * event-ops port (see the plan's "Data migration" section) — run this once,
 * then the import script on the Backend side, then verify /events still
 * renders correctly before retiring the Prisma-backed admin/public pages.
 *
 * Read-only — does not touch the Prisma database.
 *
 *   npx tsx prisma/export-events.ts [output-path]
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();
  const events = await db.event.findMany({
    include: { registrations: true },
    orderBy: { startsAt: "asc" },
  });
  await db.$disconnect();

  const outPath = resolve(process.argv[2] || "../events-export.json");
  writeFileSync(outPath, JSON.stringify(events, null, 2));
  console.log(`Exported ${events.length} events (with registrations) to ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
