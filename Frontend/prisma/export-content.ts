/**
 * One-off export of every Prisma-backed content domain (trainings, trainers,
 * consultancy services + enquiries, job postings + applications, blog posts,
 * registrations, contact messages, subscribers — plus minimal legacy event
 * rows for title resolution) to a JSON file, for
 * `Backend/scripts/import-content.ts` to pick up. Part of the Vite-SPA
 * migration (Phase 10a): these domains are moving out of this app's Prisma
 * DB and into the Backend's MongoDB, because a browser-side SPA cannot query
 * Prisma directly.
 *
 * Read-only — does not touch the Prisma database.
 *
 *   npx tsx prisma/export-content.ts [output-path]
 */
import { writeFileSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

async function main() {
  const db = new PrismaClient();

  const [
    trainers,
    trainings,
    consultancyServices,
    consultancyEnquiries,
    jobPostings,
    jobApplications,
    blogPosts,
    registrations,
    contactMessages,
    subscribers,
    legacyEvents,
  ] = await Promise.all([
    db.trainer.findMany({ orderBy: { name: "asc" } }),
    db.training.findMany({ orderBy: { createdAt: "asc" } }),
    db.consultancyService.findMany({ orderBy: { createdAt: "asc" } }),
    db.consultancyEnquiry.findMany({ orderBy: { createdAt: "asc" } }),
    db.jobPosting.findMany({ orderBy: { createdAt: "asc" } }),
    db.jobApplication.findMany({ orderBy: { createdAt: "asc" } }),
    db.blogPost.findMany({ orderBy: { createdAt: "asc" } }),
    db.registration.findMany({ orderBy: { createdAt: "asc" } }),
    db.contactMessage.findMany({ orderBy: { createdAt: "asc" } }),
    db.subscriber.findMany({ orderBy: { createdAt: "asc" } }),
    // Title resolution only — event RSVPs themselves are NOT migrated (they
    // were superseded by eventsh's ticket flow; see import-content.ts).
    db.event.findMany({ select: { id: true, title: true } }),
  ]);
  await db.$disconnect();

  const outPath = resolve(process.argv[2] || "../content-export.json");
  writeFileSync(
    outPath,
    JSON.stringify(
      {
        trainers,
        trainings,
        consultancyServices,
        consultancyEnquiries,
        jobPostings,
        jobApplications,
        blogPosts,
        registrations,
        contactMessages,
        subscribers,
        legacyEvents,
      },
      null,
      2,
    ),
  );
  console.log(
    `Exported ${trainings.length} trainings, ${trainers.length} trainers, ` +
      `${consultancyServices.length} services, ${consultancyEnquiries.length} enquiries, ` +
      `${jobPostings.length} jobs, ${jobApplications.length} applications, ` +
      `${blogPosts.length} posts, ${registrations.length} registrations, ` +
      `${contactMessages.length} messages, ${subscribers.length} subscribers ` +
      `to ${outPath}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
