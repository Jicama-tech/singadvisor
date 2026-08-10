import { updateEnquiryStatus } from "@/app/admin/actions";
import { AdminEmpty, PageHeading, Panel } from "@/components/admin/AdminUI";
import { StatusSelect } from "@/components/admin/StatusSelect";
import { Badge } from "@/components/ui/Badge";
import { ENQUIRY_STATUSES } from "@/lib/constants";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Enquiries" };

export default async function AdminEnquiriesPage() {
  const enquiries = await db.consultancyEnquiry.findMany({
    orderBy: { createdAt: "desc" },
    include: { service: { select: { title: true } } },
  });

  const fresh = enquiries.filter((e) => e.status === "new").length;

  return (
    <>
      <PageHeading
        title="Consultancy enquiries"
        description={`${enquiries.length} total · ${fresh} new`}
      />

      {enquiries.length === 0 ? (
        <Panel>
          <AdminEmpty message="No enquiries yet." />
        </Panel>
      ) : (
        // Enquiries carry long free-text, so cards read better than a table.
        <div className="flex flex-col gap-4">
          {enquiries.map((e) => (
            <Panel key={e.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <h2 className="text-lg">{e.company}</h2>
                  <p className="text-sm text-[var(--text-secondary)]">
                    {e.name} ·{" "}
                    <a href={`mailto:${e.email}`} className="text-[var(--accent)] hover:underline">
                      {e.email}
                    </a>{" "}
                    ·{" "}
                    <a href={`tel:${e.phone}`} className="hover:underline">
                      {e.phone}
                    </a>
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[var(--text-muted)]">
                    {formatDate(e.createdAt)}
                  </span>
                  <StatusSelect
                    id={e.id}
                    value={e.status}
                    options={ENQUIRY_STATUSES}
                    action={updateEnquiryStatus}
                    label={`Status for ${e.company}`}
                  />
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {e.service && <Badge tone="accent">{e.service.title}</Badge>}
                {e.companySize && <Badge>{e.companySize} people</Badge>}
                {e.budget && <Badge tone="info">{e.budget}</Badge>}
                {e.timeline && <Badge tone="warn">{e.timeline}</Badge>}
              </div>

              <p className="mt-4 whitespace-pre-wrap rounded-xl surface-sunken p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                {e.message}
              </p>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
