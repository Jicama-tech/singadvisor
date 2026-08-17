import type { LandingVariant, StatsContent } from "@/lib/landing-client";

export function StatsSection({
  content,
  variant,
}: {
  content: StatsContent;
  variant: LandingVariant;
}) {
  if (variant === "minimal") {
    return (
      <div className="container-page py-10">
        <dl className="flex flex-wrap items-stretch justify-center divide-x divide-[var(--border-subtle)]">
          {content.items.map((stat) => (
            <div key={stat.label} className="flex flex-col items-center gap-1 px-8 py-2 text-center">
              <dd className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--text-primary)]">
                {stat.value}
              </dd>
              <dt className="text-xs text-[var(--text-muted)]">{stat.label}</dt>
            </div>
          ))}
        </dl>
      </div>
    );
  }

  if (variant === "bold") {
    return (
      <div className="border-b border-[var(--border-subtle)] surface-sunken">
        <div className="container-page py-14">
          <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {content.items.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[var(--radius-card)] bg-[var(--accent)] p-6 text-center shadow-[var(--shadow-soft)]"
              >
                <dd className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--accent-foreground)] md:text-4xl">
                  {stat.value}
                </dd>
                <dt className="mt-1 text-sm text-[var(--accent-foreground)]/80">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>
      </div>
    );
  }

  // ---- modern (default) — unchanged from the original design ----
  return (
    <div className="border-b border-[var(--border-subtle)] surface-raised">
      <dl className="container-page grid grid-cols-2 gap-8 py-10 md:grid-cols-4">
        {content.items.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-1">
            <dt className="order-2 text-sm text-[var(--text-secondary)]">{stat.label}</dt>
            <dd className="order-1 font-[family-name:var(--font-display)] text-3xl font-semibold text-[var(--text-primary)] md:text-4xl">
              {stat.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
