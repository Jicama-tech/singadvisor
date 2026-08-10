import { toggleMessageHandled } from "@/app/admin/actions";
import { AdminEmpty, PageHeading, Panel } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { Icon } from "@/components/ui/Icon";
import { db } from "@/lib/db";
import { cn, formatDateTime } from "@/lib/utils";

export const metadata = { title: "Messages" };

export default async function AdminMessagesPage() {
  const messages = await db.contactMessage.findMany({
    orderBy: [{ handled: "asc" }, { createdAt: "desc" }],
  });

  const unread = messages.filter((m) => !m.handled).length;

  return (
    <>
      <PageHeading
        title="Contact messages"
        description={`${messages.length} total · ${unread} unhandled`}
      />

      {messages.length === 0 ? (
        <Panel>
          <AdminEmpty message="No messages yet." />
        </Panel>
      ) : (
        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <Panel
              key={m.id}
              className={cn("p-5", m.handled && "opacity-60")}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg">{m.subject}</h2>
                    {m.handled ? (
                      <Badge tone="success">Handled</Badge>
                    ) : (
                      <Badge tone="warn">New</Badge>
                    )}
                  </div>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {m.name} ·{" "}
                    <a href={`mailto:${m.email}`} className="text-[var(--accent)] hover:underline">
                      {m.email}
                    </a>
                    {m.phone && (
                      <>
                        {" "}
                        ·{" "}
                        <a href={`tel:${m.phone}`} className="hover:underline">
                          {m.phone}
                        </a>
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="whitespace-nowrap text-xs text-[var(--text-muted)]">
                    {formatDateTime(m.createdAt)}
                  </span>
                  <form action={toggleMessageHandled}>
                    <input type="hidden" name="id" value={m.id} />
                    <button
                      type="submit"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
                    >
                      <Icon name="check" size={13} />
                      {m.handled ? "Mark unhandled" : "Mark handled"}
                    </button>
                  </form>
                </div>
              </div>

              <p className="mt-4 whitespace-pre-wrap rounded-xl surface-sunken p-4 text-sm leading-relaxed text-[var(--text-secondary)]">
                {m.message}
              </p>
            </Panel>
          ))}
        </div>
      )}
    </>
  );
}
