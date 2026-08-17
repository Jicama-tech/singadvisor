# SingAdvisor

Full-stack site for SingAdvisor, a Singapore learning and consultancy practice,
built around four use cases — **Trainings**, **Events**, **Consultancy** and
**Careers** — each with public pages, a submission flow, and admin management,
plus a **Blog**.

Next.js 15 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · Prisma · SQLite

**Deploying?** See **[DEPLOY.md](DEPLOY.md)** — step-by-step for
`https://jicama.tech/singadvisor` on the Hostinger VPS.

---

## Quick start

```bash
npm install
cp .env.example .env          # then set AUTH_SECRET (see below)
npm run setup                 # prisma generate + db push + seed
npm run dev                   # http://localhost:3000
```

Generate a signing secret for admin sessions and put it in `.env`:

```bash
openssl rand -base64 32
```

**Admin:** <http://localhost:3000/admin> — `admin@singadvisor.sg` / `ChangeMe123!`
Change this before any deployment (see [Going to production](#going-to-production)).

---

## The sections

| | Public | Detail | Submission | Admin |
|---|---|---|---|---|
| **Trainings** | `/trainings` — search + category filter | `/trainings/[slug]` | Enrolment | `/admin/trainings` CRUD |
| **Events** | `/events` — upcoming / past tabs | `/events/[slug]` | RSVP with live seat capacity | `/admin/events` CRUD |
| **Consultancy** | `/consultancy` — services + process | `/consultancy/[slug]` | Scoped enquiry | `/admin/consultancy` CRUD |
| **Careers** | `/careers` — board + department filter | `/careers/[slug]` | Application + résumé upload | `/admin/careers` CRUD |
| **Blog** | `/blog` — category filter + search | `/blog/[slug]` | — | `/admin/blog` CRUD |

Submissions land in the admin inbox: `/admin/registrations`, `/admin/enquiries`,
`/admin/applications`, `/admin/messages` — each with an inline status workflow.
Sidebar badges count what still needs attention.

Nothing is hardcoded. Every training, event, service, job posting and article is
created and edited through the CMS; adding one never requires a deploy.

Articles are written in Markdown and rendered by `react-markdown`, which builds
React elements rather than injecting an HTML string — so a post cannot introduce
a script even if its stored content is malicious. Raw HTML in the source is
ignored by design; do not add `rehype-raw`.

---

## Scripts

| Command | Does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | `prisma generate` + production build |
| `npm start` | Serve the production build |
| `npm run setup` | Generate client, push schema, seed |
| `npm run db:seed` | Wipe and repopulate demo content |
| `npm run db:studio` | Prisma Studio |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

> **Don't run `npm run build` while `npm run dev` is running.** They share the
> `.next/` directory, so the build overwrites the dev server's chunks and every
> page loads as unstyled HTML (CSS 404s). If that happens: stop the dev server,
> `rm -rf .next`, and `npm run dev` again.

---

## Architecture notes

**Server Actions, not API routes.** Every form posts to a server action in
`src/app/actions.ts` (public) or `src/app/admin/actions.ts` (admin). Each one
re-validates with Zod (`src/lib/validation.ts`) on the server — client `required`
attributes are only a convenience.

**Failed submissions keep what you typed.** React clears an uncontrolled form
once its action resolves, so a single bad field would otherwise wipe a long
application. Actions echo the submission back as `FormState.values` and every
form seeds its `defaultValue` from it. Note that `<select>` needs a `key` on the
same value — `defaultValue` alone only applies at mount.

**`FormState` lives in `src/lib/form-state.ts`, not in the action files.** A file
marked `"use server"` may only export async functions; exporting a plain object
from one makes the page 500 at runtime, which the build does not catch.

**Auth.** Admin sessions are a JWT (`jose`) in an httpOnly cookie, passwords
hashed with bcrypt. `src/middleware.ts` gates navigation, but it is not the
security boundary — the admin layout and every mutating action independently
verify the session.

**Portable schema.** List fields are stored as JSON strings and status fields as
plain strings (constrained in `src/lib/constants.ts`) so the schema moves to
Postgres by changing only the datasource.

**Résumés are not in `public/`.** Two reasons: Next.js resolves `public/` at
build time, so a file written there afterwards is never served (every résumé
uploaded after a deploy would 404); and anything under `public/` is readable by
anyone with the URL. They live in `UPLOAD_DIR` and are streamed by
`src/app/admin/resumes/[file]/route.ts` after a session check.

**Subpath support.** Setting `NEXT_PUBLIC_BASE_PATH` at build time serves the
app from a subpath. Next.js prefixes `next/link` and `useRouter` automatically
but *not* raw `<a href>`, `<form action>`, `<source src>`, `<Image src>`,
metadata paths, or `new URL(path, request.url)` in middleware — those go
through `withBasePath()` in `src/lib/base-path.ts`, and images through
`src/components/ui/AppImage.tsx`. Do not also set `assetPrefix`; combined with
`basePath` it makes the image optimizer 400 on every request.

**Legacy redirects.** Old capitalised routes (`/Trainings`) are redirected in
`middleware.ts`, not `next.config.ts` — `redirects()` matches case-insensitively,
so a `/Trainings` → `/trainings` rule there matches its own destination and loops
forever. Slug changes (`/trainings/managetime`) are safe in `next.config.ts`.

---

## Going to production

1. **Rotate the seeded admin password.** Set `ADMIN_EMAIL` / `ADMIN_PASSWORD`
   before seeding, or change it in the database afterwards.
2. **Set a real `AUTH_SECRET`.** The app refuses to sign sessions without one.
3. **Move to Postgres:** set `provider = "postgresql"` in
   `prisma/schema.prisma`, point `DATABASE_URL` at the server, then
   `npx prisma migrate deploy`.
4. **Back up `var/uploads/`.** Résumés are written to `UPLOAD_DIR` (default
   `var/uploads`, outside `public/`) and streamed only to signed-in admins via
   `/admin/resumes/[file]`. On a VPS with a persistent disk this is fine; on
   ephemeral hosting (Vercel, Fly) move them to S3/R2 with signed URLs, since
   the filesystem is discarded on redeploy.
5. **Wire up outbound email.** Submissions are stored and shown in the admin
   inbox; no confirmation emails are sent yet.
6. Set `NEXT_PUBLIC_SITE_URL` so metadata, sitemap and `robots.txt` are absolute.

### Not built (deliberate)

Payments and candidate/attendee login accounts were left out of scope. The
schema anticipates both — `priceCents` on trainings and events, `AdminUser`
separate from any future public user — but there is no checkout or public auth.

---

## Legacy app

The previous Vite + React SPA is preserved under `legacy/` for reference. It is
excluded from the build, typecheck and lint. Its `.env` contained a live Gmail
address and app password in plaintext; **that credential was not carried over
and should be treated as compromised and revoked.**
