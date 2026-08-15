import { PageHeading } from "@/components/admin/AdminUI";
import { ServiceForm } from "@/components/admin/ServiceForm";

export const metadata = { title: "New service" };

export default function NewServicePage() {
  return (
    <>
      <PageHeading title="New consultancy service" />
      <ServiceForm />
    </>
  );
}
