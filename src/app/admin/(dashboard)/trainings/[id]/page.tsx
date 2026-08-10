import { notFound } from "next/navigation";
import { PageHeading } from "@/components/admin/AdminUI";
import { TrainingForm } from "@/components/admin/TrainingForm";
import { db } from "@/lib/db";

export const metadata = { title: "Edit training" };

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [training, trainers] = await Promise.all([
    db.training.findUnique({ where: { id } }),
    db.trainer.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  if (!training) notFound();

  return (
    <>
      <PageHeading title={training.title} description={`/trainings/${training.slug}`} />
      <TrainingForm training={training} trainers={trainers} />
    </>
  );
}
