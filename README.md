# SingAdvisor

Full-stack platform for SingAdvisor, a Singapore learning and consultancy
practice — Trainings, Events, Consultancy, Careers, and a Blog.

The repo is laid out as three independently-lifecycled parts, mirroring
`eventsh-v1`'s `frontend/` / `backend/` / `deployment/` split and the target
architecture in the *SingAdvisor Platform Modernization Proposal*:

```
singadvisor/
├── Frontend/     Next.js 15 app — everything that runs in production today
├── Backend/      NestJS + MongoDB API (Phase 1 scaffold — not wired up yet)
└── Deployment/   Combined deploy runbook & auto-deploy tooling (Phase 5 — not built yet)
```

## Current state — read before assuming anything works differently

This restructuring is **folder-only, no functional change**:

- `Frontend/` is the exact app that's live at
  `https://jicama.tech/singadvisor` today. It still talks to Prisma/SQLite
  directly — see [`Frontend/README.md`](Frontend/README.md) and
  [`Frontend/DEPLOY.md`](Frontend/DEPLOY.md) for the real quick-start and
  deploy steps.
- `Backend/` is a fresh NestJS skeleton (boots, exposes `GET /health`,
  connects to MongoDB) with none of the real domain modules built out yet.
  See [`Backend/README.md`](Backend/README.md).
- `Frontend/` and `Backend/` are **not connected**. `Deployment/` is empty
  scaffolding for later.
- The Events vertical federates out to the EventSH platform
  (`eventsh.com`) via a reverse-proxy at `/events` — no shared code or
  database with EventSH, by design.

Turning this into the target architecture (Backend fully implemented,
Frontend rewired to call it, Events federation live, dedicated infra) is the
6-phase programme described in the modernization proposal — this commit is
just the shape the repo will grow into.
