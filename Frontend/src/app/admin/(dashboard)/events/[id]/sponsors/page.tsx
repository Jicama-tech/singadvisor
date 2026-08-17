import Link from "next/link";
import { notFound } from "next/navigation";
import {
  approveSponsorRequest,
  confirmSponsorPayment,
  rejectSponsorRequest,
} from "@/app/admin/actions";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { formatPrice } from "@/lib/utils";
import {
  EventsServiceError,
  fetchEventAdmin,
  fetchSponsorRequestsAdmin,
  type SponsorRequestRow,
} from "@/lib/events-admin-client";

export const metadata = { title: "Sponsor applications" };

function statusTone(status: SponsorRequestRow["status"]) {
  switch (status) {
    case "Confirmed":
      return "success" as const;
    case "Approved":
    case "PaymentSubmitted":
      return "info" as const;
    case "Rejected":
    case "Cancelled":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

export default async function EventSponsorsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let event;
  try {
    event = await fetchEventAdmin(id);
  } catch (err) {
    if (err instanceof EventsServiceError && err.status === 404) notFound();
    throw err;
  }

  const requests = await fetchSponsorRequestsAdmin(id);

  return (
    <>
      <PageHeading
        title="Sponsor applications"
        description={`For ${event.title} — ${requests.length} application${requests.length === 1 ? "" : "s"}`}
        action={
          <Link href={`/admin/events/${id}`} className="text-sm font-medium text-[var(--accent)] hover:underline">
            Back to event
          </Link>
        }
      />

      <Panel>
        {requests.length === 0 ? (
          <AdminEmpty message="No sponsor applications yet." />
        ) : (
          <TableWrap>
            <thead>
              <tr>
                <Th>Company</Th>
                <Th>Tier</Th>
                <Th>Contact</Th>
                <Th>Amount</Th>
                <Th>Status</Th>
                <Th className="text-right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {requests.map((r) => (
                <tr key={r._id} className="hover:bg-[var(--surface-sunken)]">
                  <Td>
                    <span className="font-medium text-[var(--text-primary)]">{r.companyName}</span>
                    {r.website && (
                      <a
                        href={r.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block text-xs text-[var(--accent)] hover:underline"
                      >
                        {r.website}
                      </a>
                    )}
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {r.sponsorTypeName}
                    {!r.collectPayment && r.selectedOptions.length > 0 && (
                      <span className="block text-xs text-[var(--text-muted)]">
                        {r.selectedOptions.join(", ")}
                      </span>
                    )}
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    <span className="block">{r.contactName}</span>
                    <a href={`mailto:${r.email}`} className="block text-xs text-[var(--accent)] hover:underline">
                      {r.email}
                    </a>
                  </Td>
                  <Td className="text-[var(--text-secondary)]">
                    {r.collectPayment ? formatPrice(Math.round(r.amount * 100), "SGD") : "Non-cash"}
                  </Td>
                  <Td>
                    <div className="flex flex-col gap-1">
                      <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                      {r.transactionId && !r.paymentVerified && (
                        <span className="text-[0.7rem] text-[var(--text-muted)]">
                          Txn: {r.transactionId}
                        </span>
                      )}
                    </div>
                  </Td>
                  <Td>
                    <div className="flex items-center justify-end gap-2">
                      {r.status === "Applied" && (
                        <>
                          <form action={approveSponsorRequest}>
                            <input type="hidden" name="id" value={r._id} />
                            <input type="hidden" name="eventId" value={id} />
                            <button
                              type="submit"
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                            >
                              Approve
                            </button>
                          </form>
                          <form action={rejectSponsorRequest}>
                            <input type="hidden" name="id" value={r._id} />
                            <input type="hidden" name="eventId" value={id} />
                            <button
                              type="submit"
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/50"
                            >
                              Reject
                            </button>
                          </form>
                        </>
                      )}
                      {(r.status === "Approved" || r.status === "PaymentSubmitted") &&
                        r.collectPayment &&
                        !r.paymentVerified && (
                          <form action={confirmSponsorPayment}>
                            <input type="hidden" name="id" value={r._id} />
                            <input type="hidden" name="eventId" value={id} />
                            <button
                              type="submit"
                              className="rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                            >
                              Verify payment
                            </button>
                          </form>
                        )}
                      {r.status === "Approved" && !r.collectPayment && (
                        <form action={confirmSponsorPayment}>
                          <input type="hidden" name="id" value={r._id} />
                          <input type="hidden" name="eventId" value={id} />
                          <button
                            type="submit"
                            className="rounded-lg px-2.5 py-1 text-xs font-medium text-[var(--accent)] hover:bg-[var(--accent-soft)]"
                          >
                            Confirm
                          </button>
                        </form>
                      )}
                    </div>
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
