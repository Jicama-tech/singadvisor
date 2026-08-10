import { PageHeading } from "@/components/admin/AdminUI";
import { TrainingForm } from "@/components/admin/TrainingForm";
import { db } from "@/lib/db";

export const metadata = { title: "New training" };

export default async function NewTrainingPage() {
  const trainers = await db.trainer.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <>
      <PageHeading
        title="New training"
        description="Create a programme. It goes live as soon as you save it with Published ticked."
      />
      <TrainingForm trainers={trainers} />
    </>
  );
}
