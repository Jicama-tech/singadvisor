# SingAdvisor Backend

NestJS + MongoDB API service — **Phase 1 scaffold only**, per §5 of the
*SingAdvisor Platform Modernization Proposal* (client deliverable, kept
outside this repo).

## Status

This is currently a skeleton: it boots, connects to MongoDB, and exposes
`GET /health`. None of the eight domain modules the proposal calls for are
implemented yet:

| Module | Owns |
|---|---|
| `trainings` | Training catalogue, trainer directory |
| `blog` | Editorial articles |
| `consultancy` | Advisory service catalogue, inbound enquiries |
| `careers` | Job postings, applications, résumé storage |
| `registrations` | Training enrolments |
| `admin` / `auth` | Admin accounts, JWT session issuance |
| `contact` | Contact-form messages, newsletter subscribers |
| `files` | Résumé upload/retrieval |

The `Frontend/` app still talks to Prisma/SQLite directly — nothing here is
wired up yet. Building out these modules against `Frontend/prisma/schema.prisma`
as the source of truth for the data model is Phase 1 of the proposal.

## Quick start

```bash
cd Backend
npm install
cp .env.example .env       # set DATABASE_URL (MongoDB Atlas) and JWT_SECRET
npm run start:dev          # http://localhost:4000/health
```

## Structure

```
src/
├── main.ts          # bootstrap, global ValidationPipe, CORS
├── app.module.ts     # root module — domain modules register here
├── app.controller.ts # health check
└── app.service.ts
```
