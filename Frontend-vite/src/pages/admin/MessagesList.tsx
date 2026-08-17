import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { adminFetch } from "@/lib/adminFetch";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminEmpty, PageHeading, Panel, TableWrap, Td, Th } from "@/components/admin/AdminUI";
import { Badge } from "@/components/ui/Badge";
import { toggleMessageHandled } from "@/adminActions";
import { formatDate } from "@/lib/utils";
import type { ContactMessageDoc } from "@/lib/contentClient";

export default function MessagesList() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ContactMessageDoc[] | null>(null);

  const load = useCallback(async () => {
    const res = await adminFetch(`${__API_URL__}/contact-messages`);
    if (res.ok) setMessages((await res.json()) as ContactMessageDoc[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(m: ContactMessageDoc) {
    await toggleMessageHandled(m._id);
    await load();
  }

  if (!user) return null;

  return (
    <AdminShell
      user={{ name: user.name, email: user.email, role: user.role }}
      counts={{ registrations: 0, enquiries: 0, applications: 0, messages: 0 }}
    >
      <div className="flex flex-col gap-8">
        <PageHeading
          title="Messages"
          description={`${messages?.length ?? "…"} message${messages?.length === 1 ? "" : "s"}`}
        />

        <Panel>
          {messages && messages.length === 0 ? (
            <AdminEmpty message="No messages yet." />
          ) : (
            <TableWrap>
              <thead>
                <tr>
                  <Th>From</Th>
                  <Th>Subject</Th>
                  <Th>Message</Th>
                  <Th>Received</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Actions</Th>
                </tr>
              </thead>
              <tbody>
                {(messages ?? []).map((m) => (
                  <tr key={m._id} className="hover:bg-[var(--surface-sunken)]">
                    <Td>
                      <span className="font-medium text-[var(--text-primary)]">{m.name}</span>
                      <a href={`mailto:${m.email}`} className="block text-[var(--accent)] hover:underline">
                        {m.email}
                      </a>
                      {m.phone && (
                        <a href={`tel:${m.phone}`} className="block text-xs text-[var(--text-muted)] hover:underline">
                          {m.phone}
                        </a>
                      )}
                    </Td>
                    <Td className="max-w-xs text-[var(--text-secondary)]">{m.subject}</Td>
                    <Td className="max-w-sm text-[var(--text-secondary)]">
                      <span className="line-clamp-2">{m.message}</span>
                    </Td>
                    <Td className="whitespace-nowrap text-[var(--text-secondary)]">
                      {formatDate(m.createdAt)}
                    </Td>
                    <Td>
                      {m.handled ? (
                        <Badge tone="success">Handled</Badge>
                      ) : (
                        <Badge tone="warn">New</Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => toggle(m)}
                          className="rounded-full border border-[var(--border-strong)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)]/50 hover:text-[var(--accent)]"
                        >
                          {m.handled ? "Mark unread" : "Mark handled"}
                        </button>
                      </div>
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
