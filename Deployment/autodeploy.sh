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
  # NOT `rm -rf dist` first. nginx serves this directory in place, so deleting
  # it before the build means a failed build takes the whole site down — and
  # see the `both)` note below for why that failure would not even stop the
  # script. Vite empties its own outDir, so the delete bought nothing; leaving
  # the old bundle in place means a broken build is a no-op, not an outage.
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
#     data it assumes has already been migrated.
#
# The old build is still serving while this runs, so the real rule is not
# "migrations only add" — one of them below removes a field — but this:
#
#   EVERY MIGRATION HERE MUST BE SAFE FOR THE OLD BUILD TO SERVE AGAINST.
#
# migrate:trainers only adds (trainerIds[] alongside the legacy trainerId), so
# the old build neither sees it nor cares. migrate:membership-discount removes,
# and is safe for a narrower reason worth stating: the only thing the old build
# does with `course-discount` and `discountPercent` is take money off a course,
# and taking money off a course is precisely what this deploy exists to stop.
# Somebody enrolling in the seconds between the migration and the restart pays
# the list price — the new behaviour, slightly early. No member loses access:
# nothing about who counts as a member is touched.
#
# A future migration that removes something the old build NEEDS does not belong
# here. It belongs after the restart, or behind two deploys.
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
  # Strips the retired `course-discount` perk from plans and memberships.
  # Both schemas now validate `perks` against a catalogue that no longer
  # contains it, so without this an admin saving an existing plan gets a
  # validation failure with nothing on screen to explain it.
  npm run migrate:membership-discount 2>&1 | tee -a "$LOG"
  # Stores featured=false on issues and posts written before the flag existed.
  # An absent field sorts BELOW an explicit false in Mongo, not alongside it,
  # so without this the first ordinary admin save of any one issue pins it
  # above every issue nobody has edited — regardless of date.
  npm run migrate:featured 2>&1 | tee -a "$LOG"
  log "--- Migrations done ---"
}

case "${1:-both}" in
  frontend) deploy_frontend ;;
  backend)  deploy_backend ;;
  # Sequenced with `;`, NOT `&&`. POSIX: "-e shall be ignored when executing
  # any command of an AND-OR list other than the last" — and that suppression
  # propagates into the function body. With `&&`, every failure inside
  # deploy_frontend was ignored and the script went on to report success.
  # With `;`, `set -e` at the top of this file stops the run on the first
  # failure, which is what the rest of the script already assumes.
  both)     deploy_frontend; deploy_backend ;;
  *)        echo "Usage: bash autodeploy.sh [frontend|backend|both]" ;;
esac

log "=== Deploy complete ==="
