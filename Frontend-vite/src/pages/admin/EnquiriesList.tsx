import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge } from "@/components/ui/Badge";
import { ENQUIRY_STATUSES } from "@/lib/constants";
import { updateEnquiryStatus } from "@/adminActions";
import { formatDate } from "@/lib/utils";
import type { EnquiryDoc } from "@/lib/contentClient";

export default function EnquiriesList() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<EnquiryDoc[] | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/consultancy-enquiries`);
    if (res.ok) setEnquiries((await res.json()) as EnquiryDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!user) return null;

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={{ registrations: 0, enquiries: 0, applications: 0, messages: 0 }}
    >
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Enquiries"
          description={`${enquiries?.length ?? "…"} enquiry${enquiries?.length === 1 ? "" : "ies"}`}
        />

        <Panel>
          {enquiries && enquiries.length === 0 ? (
            <AdminEmpty message="No enquiries yet." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>Name</Th>
                  <Th>Contact</Th>
                  <Th>Company</Th>
                  <Th>About</Th>
                  <Th>Received</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {(enquiries ?? []).map((e) => (
                  <tr key={e._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <span className="font-medium text-[var(--text-primary)]">{e.name}</span>
                      {e.companySize && (
                        <span className="block text-xs text-[var(--text-muted)]">
                          {e.companySize} employees
                        </span>
                      )}
                    </Td>
                    <Td>
                      <a href={`mailto:${e.email}`} className="block text-[var(--accent)] hover:underline">
                        {e.email}
                      </a>
                      <a href={`tel:${e.phone}`} className="block text-xs text-[var(--text-muted)] hover:underline">
                        {e.phone}
                      </a>
                    </Td>
                    <Td className="text-[var(--text-secondary)]">{e.company}</Td>
                    <Td>
                      {e.serviceTitle ? (
                        <Badge tone="accent">{e.serviceTitle}</Badge>
                      ) : (
                        <Badge tone="neutral">General</Badge>
                      )}
                      {e.message && (
                        <span className="mt-1 block max-w-sm text-xs italic text-[var(--text-secondary)]">
                          “{e.message.slice(0, 160)}{e.message.length > 160 ? "…" : ""}”
                        </span>
                      )}
                    </Td>
                    <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                      {formatDate(e.createdAt)}
                    </Td>
                    <Td>
                      <StatusSelect
                        id={e._id}
                        value={e.status}
                        options={ENQUIRY_STATUSES}
                        action={updateEnquiryStatus}
                        label={`Status for ${e.name}`}
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
