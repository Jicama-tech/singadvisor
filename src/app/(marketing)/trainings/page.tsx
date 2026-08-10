import type { Metadata } from "next";
import Link from "next/link";
import { TrainingCard } from "@/components/cards/TrainingCard";
import { Icon } from "@/components/ui/Icon";
import { Input } from "@/components/ui/Field";
import { Button } from "@/components/ui/Button";
import { EmptyState, PageHero } from "@/components/ui/Section";
import { TRAINING_CATEGORIES } from "@/lib/constants";
import { db } from "@/lib/db";
import { withBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Trainings",
  description:
    "Practical training programmes for students, corporate teams and professionals in Singapore — time, money, health, emotions, leadership and communication.",
};

type SearchParams = Promise<{ category?: string; q?: string }>;

export default async function TrainingsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";

  // Only honour a category we actually recognise, so a hand-edited URL falls
  // back to "all" rather than silently returning nothing.
  const category = (TRAINING_CATEGORIES as readonly string[]).includes(
    params.category ?? "",
  )
    ? params.category
    : undefined;

  const trainings = await db.training.findMany({
    where: {
      published: true,
      ...(category ? { category } : {}),
      ...(query
        ? {
            OR: [
              { title: { contains: query } },
              { summary: { contains: query } },
            ],
          }
        : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });

  const counts = await db.training.groupBy({
    by: ["category"],
    where: { published: true },
    _count: true,
  });
  const countFor = (c: string) =>
    counts.find((x) => x.category === c)?._count ?? 0;
  const total = counts.reduce((sum, c) => sum + c._count, 0);

  const filterHref = (c?: string) => {
    const sp = new URLSearchParams();
    if (c) sp.set("category", c);
    if (query) sp.set("q", query);
    const s = sp.toString();
    return s ? `/trainings?${s}` : "/trainings";
  };

  return (
    <>
      <PageHero
        eyebrow="Trainings"
        title="Programmes that survive contact with a real week"
        description="Every session ends with something concrete — a system, a script, a decision you can act on. Filter by who it's built for, or search for a specific topic."
      />

      <div className="container-page py-12 md:py-16">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          {/* Category filters are links, not buttons, so they are shareable
              and work without JavaScript. */}
          <nav aria-label="Filter by audience" className="flex flex-wrap gap-2">
            <FilterChip href={filterHref()} active={!category}>
              All <span className="opacity-60">{total}</span>
            </FilterChip>
            {TRAINING_CATEGORIES.map((c) => (
              <FilterChip key={c} href={filterHref(c)} active={category === c}>
                {c} <span className="opacity-60">{countFor(c)}</span>
              </FilterChip>
            ))}
          </nav>

          {/* A raw form action is not rewritten by basePath. */}
          <form action={withBasePath("/trainings")} className="flex gap-2 lg:w-80">
            {category && <input type="hidden" name="category" value={category} />}
            <label htmlFor="training-search" className="sr-only">
              Search trainings
            </label>
            <Input
              id="training-search"
              name="q"
              type="search"
              defaultValue={query}
              placeholder="Search programmes…"
            />
            <Button type="submit" variant="secondary" size="md" aria-label="Search">
              <Icon name="search" size={18} />
            </Button>
          </form>
        </div>

        <p className="mt-8 text-sm text-[var(--text-secondary)]" aria-live="polite">
          {trainings.length} programme{trainings.length === 1 ? "" : "s"}
          {category ? ` for ${category.toLowerCase()} audiences` : ""}
          {query ? ` matching “${query}”` : ""}
        </p>

        {trainings.length === 0 ? (
          <div className="mt-8">
            <EmptyState
              title="Nothing matches those filters"
              description="Try a broader search term, or clear the filters to see everything we run."
              action={
                <Link
                  href="/trainings"
                  className="text-sm font-medium text-[var(--accent)] hover:underline"
                >
                  Clear filters
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {trainings.map((t) => (
              <TrainingCard key={t.id} training={t} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

function FilterChip({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
          : "surface-sunken text-[var(--text-secondary)] hover:text-[var(--text-primary)]",
      )}
    >
      {children}
    </Link>
  );
}
