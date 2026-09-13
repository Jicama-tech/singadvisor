#!/bin/bash
# Auto-deploy script for SingAdvisor (mirrors eventsh-v1/deployment/autodeploy.sh)
#
# Deploys the new Vite+React SPA (Frontend-vite) and the NestJS Backend.
# The old Next.js app in Frontend/ is deliberately NOT deployed — it stays
# untouched on the server as the rollback target until cutover is complete.
#
# Triggered by GitHub webhook or manually:
#   bash autodeploy.sh [frontend|backend|both]
#
# Server prerequisites (see SERVER_SETUP.md for the full runbook):
#   - pm2 processes: singadvisor-backend (node Backend/dist/src/main.js)
#   - nginx serving Frontend-vite/dist with SPA fallback
#     (see nginx-singadvisor.conf)
#   - Frontend-vite/.env.production with VITE_API_URL / VITE_EVENTSH_PUBLIC_URL /
#     VITE_EVENTSH_ORGANIZER_ID / SITE_URL (gitignored — never committed)
#   - Backend/.env with all production secrets (gitignored)

set -eo pipefail

# Override on shared servers: SINGADVISOR_PROJ=/home/<user>/singadvisor
PROJ="${SINGADVISOR_PROJ:-/home/singadvisor/singadvisor}"
LOG="${PROJ}/../deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

sync_repo() {
  # Hard-reset to origin/main so runtime-generated files (uploads,
  # résumés) never block the pull. Anything not committed will be discarded —
  # this server is a deployment target, not a workspace. Gitignored files
  # (.env, .env.production, uploads/, resumes/) survive `git clean -fd`.
  git fetch origin main 2>&1 | tee -a "$LOG"
  git reset --hard origin/main 2>&1 | tee -a "$LOG"
  git clean -fd 2>&1 | tee -a "$LOG"
}

deploy_frontend() {
  log "=== Deploying Frontend-vite (SPA) ==="
  cd "$PROJ/Frontend-vite"
  sync_repo
  npm ci 2>&1 | tee -a "$LOG"
  rm -rf dist
  npm run build 2>&1 | tee -a "$LOG"
  # Regenerate sitemap.xml/robots.txt against the live data with the
  # production domain (SITE_URL comes from .env.production).
  npx tsx scripts/generate-sitemap.ts 2>&1 | tee -a "$LOG"
  log "Frontend deployed!"
}

deploy_backend() {
  log "=== Deploying Backend ==="
  cd "$PROJ/Backend"
  sync_repo
  npm ci 2>&1 | tee -a "$LOG"
  run_migrations
  npm run build 2>&1 | tee -a "$LOG"
  pm2 restart singadvisor-backend 2>&1 | tee -a "$LOG"
  log "Backend deployed!"
}

# Schema changes that existing documents do not already satisfy. Mongoose
# applies a @Prop default when a document is WRITTEN, never when an old one is
# read, so a field added to an entity is simply absent on every row already in
# the database until something backfills it.
#
# Ordering is the whole point of this step, and it is not arbitrary:
#   - after `npm ci`, because these run through tsx, which npm ci installs;
#   - before `pm2 restart`, so the new build never serves a request against
#     data it assumes has already been migrated. The old build is still
#     running while this executes, which is safe precisely because every
#     migration here only ADDS the new shape and leaves the old field in
#     place — the running code cannot see, and does not care about, either.
#
# `set -eo pipefail` at the top of this script means a failing migration
# aborts the deploy BEFORE the restart, leaving the previous build serving
# the un-migrated data it was written for. That is the correct failure: a
# deploy that stops is recoverable, one that restarts into a half-migrated
# database is not.
#
# Every migration must be idempotent — this runs on each deploy, and the
# second run has to be a no-op rather than a second pass over the data.
run_migrations() {
  log "--- Running data migrations ---"
  # Training.trainerId -> trainerIds[] (a course credits several facilitators).
  # Without this the Facilitators tab counts 0 trainings against everyone and
  # its delete guard, which counts trainerIds, hard-deletes a facilitator that
  # courses still credit through the legacy field.
  npm run migrate:trainers 2>&1 | tee -a "$LOG"
  log "--- Migrations done ---"
}

case "${1:-both}" in
  frontend) deploy_frontend ;;
  backend)  deploy_backend ;;
  both)     deploy_frontend && deploy_backend ;;
  *)        echo "Usage: bash autodeploy.sh [frontend|backend|both]" ;;
esac

log "=== Deploy complete ==="
