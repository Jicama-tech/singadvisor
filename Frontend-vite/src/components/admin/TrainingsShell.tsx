import type { ReactNode } from "react";
import { TrainingsNestedNav } from "@/components/admin/TrainingsNestedNav";

/**
 * The trainings equivalent of EventsShell/LandingShell: pages under
 * /admin/trainings render inside AdminShell PLUS the "Trainings" secondary
 * sidebar (Courses, Facilitators, Content). Unlike the Events section, every
 * page under /admin/trainings wears this — including the new/edit forms — so
 * the nested nav never flickers out mid-section. The primary sidebar
 * collapses to icons on these routes (see AdminShell's
 * isTrainingsDashboardRoute check).
 */
export default function TrainingsShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:items-start">
      <TrainingsNestedNav />
      <div className="min-w-0 flex-1 p-4 lg:p-6">{children}</div>
    </div>
  );
}
