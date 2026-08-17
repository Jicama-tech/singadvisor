import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge } from "@/components/ui/Badge";
import { REGISTRATION_STATUSES } from "@/lib/constants";
import { updateRegistrationStatus } from "@/adminActions";
import { formatDate } from "@/lib/utils";
import type { RegistrationDoc } from "@/lib/contentClient";

export default function RegistrationsList() {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<RegistrationDoc[] | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/registrations`);
    if (res.ok) setRegistrations((await res.json()) as RegistrationDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  const pending = (registrations ?? []).filter((r) => r.status === "pending").length;

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={{ registrations: 0, enquiries: 0, applications: 0, messages: 0 }}
    >
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Registrations"
          description={`${registrations?.length ?? "…"} total · ${pending} awaiting confirmation`}
        />

        <Panel>
          {registrations && registrations.length === 0 ? (
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
                {(registrations ?? []).map((r) => (
                  <tr key={r._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <span className="font-medium text-[var(--text-primary)]">{r.name}</span>
                      {r.company && (
                        <span className="block text-xs text-[var(--text-muted)]">{r.company}</span>
                      )}
                      {r.message && (
                        <span className="mt-1 block max-w-sm text-xs italic text-[var(--text-secondary)]">
                          “{r.message}”
                        </span>
                      )}
                    </Td>
                    <Td>
                      <a href={`mailto:${r.email}`} className="block text-[var(--accent)] hover:underline">
                        {r.email}
                      </a>
                      <a href={`tel:${r.phone}`} className="block text-xs text-[var(--text-muted)] hover:underline">
                        {r.phone}
                      </a>
                    </Td>
                    <Td>
                      <Badge tone="accent">Training</Badge>
                      <span className="mt-1 block max-w-xs text-xs text-[var(--text-secondary)]">
                        {r.trainingTitle}
                      </span>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{r.seats}</Td>
                    <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                      {formatDate(r.createdAt)}
                    </Td>
                    <Td>
                      <StatusSelect
                        id={r._id}
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
      </div>
    </AdminShell>
  );
}
