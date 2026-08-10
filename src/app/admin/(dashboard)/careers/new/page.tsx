import { PageHeading } from "@/components/admin/AdminUI";
import { JobForm } from "@/components/admin/JobForm";

export const metadata = { title: "New posting" };

export default function NewJobPage() {
  return (
    <>
      <PageHeading
        title="New job posting"
        description="Published postings appear on /careers and are picked up by Google for Jobs."
      />
      <JobForm />
    </>
  );
}
