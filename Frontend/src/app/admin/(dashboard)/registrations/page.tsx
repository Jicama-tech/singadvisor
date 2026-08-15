import { updateRegistrationStatus } from "@/app/admin/actions";
import {
  AdminEmpty,
  PageHeading,
  Panel,
  TableWrap,
  Td,
  Th,
} from "@/components/admin/AdminUI";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge } from "@/components/ui/Badge";
import { REGISTRATION_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Registrations" };

export default async function AdminRegistrationsPage() {
  const registrations = await db.registration.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      training: { select: { title: true } },
      event: { select: { title: true } },
    },
  });

  const pending = registrations.filter((r) => r.status === "pending").length;

  return (
    <>
      <PageHeading
        title="Registrations"
        description={`${registrations.length} total · ${pending} awaiting confirmation`}
      />

      <Panel>
        {registrations.length === 0 ? (
          <AdminEmpty message="No registrations yet." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Contact</Th>
                <Th>For</Th>
                <Th>Seats</Th>
                <Th>Received</Th>
                <Th>Status</Th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r) => (
                <tr key={r.id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <span className="font-medium text-[var(--text-primary)]">
                      {r.name}
                    </span>
                    {r.company && (
                      <span className="block text-xs text-[var(--text-muted)]">
                        {r.company}
                      </span>
                    )}
                    {r.message && (
                      <span className="mt-1 block max-w-sm text-xs italic text-[var(--text-secondary)]">
                        “{r.message}”
                      </span>
                    )}
                  </Td>
                  <Td>
                    <a
                      href={`mailto:${r.email}`}
                      className="block text-[var(--accent)] hover:underline"
                    >
                      {r.email}
                    </a>
                    <a
                      href={`tel:${r.phone}`}
                      className="block text-xs text-[var(--text-muted)] hover:underline"
                    >
                      {r.phone}
                    </a>
                  </Td>
                  <Td>
                    <Badge tone={r.trainingId ? "accent" : "info"}>
                      {r.trainingId ? "Training" : "Event"}
                    </Badge>
                    <span className="mt-1 block max-w-xs text-xs text-[var(--text-secondary)]">
                      {r.training?.title ?? r.event?.title ?? "—"}
                    </span>
                  </Td>
                  <Td className="text-[var(--text-secondary)]">{r.seats}</Td>
                  <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                    {formatDate(r.createdAt)}
                  </Td>
                  <Td>
                    <StatusSelect
                      id={r.id}
                      value={r.status}
                      options={REGISTRATION_STATUSES}
                      action={updateRegistrationStatus}
                      label={`Status for ${r.name}`}
                    />
                  </Td>
                </tr>
              ))}
            </tbody>
          </TableWrap>
        )}
      </Panel>
    </>
  );
}
