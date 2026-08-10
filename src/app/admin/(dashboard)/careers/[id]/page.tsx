import { notFound } from "next/navigation";
import { PageHeading } from "@/components/admin/AdminUI";
import { JobForm } from "@/components/admin/JobForm";
import { db } from "@/lib/db";

export const metadata = { title: "Edit posting" };

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await db.jobPosting.findUnique({ where: { id } });
  if (!job) notFound();

  return (
    <>
      <PageHeading title={job.title} description={`/careers/${job.slug}`} />
      <JobForm job={job} />
    </>
  );
}
