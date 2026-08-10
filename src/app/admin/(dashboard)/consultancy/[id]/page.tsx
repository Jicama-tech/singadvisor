import { notFound } from "next/navigation";
import { PageHeading } from "@/components/admin/AdminUI";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { db } from "@/lib/db";

export const metadata = { title: "Edit service" };

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const service = await db.consultancyService.findUnique({ where: { id } });
  if (!service) notFound();

  return (
    <>
      <PageHeading title={service.title} description={`/consultancy/${service.slug}`} />
      <ServiceForm service={service} />
    </>
  );
}
