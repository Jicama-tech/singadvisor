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

PROJ="/home/singadvisor/singadvisor"
LOG="/home/singadvisor/deploy.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG"
}

sync_repo() {
  # Hard-reset to origin/development so runtime-generated files (uploads,
  # résumés) never block the pull. Anything not committed will be discarded —
  # this server is a deployment target, not a workspace. Gitignored files
  # (.env, .env.production, uploads/, resumes/) survive `git clean -fd`.
  git fetch origin development 2>&1 | tee -a "$LOG"
  git reset --hard origin/development 2>&1 | tee -a "$LOG"
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
  npm run build 2>&1 | tee -a "$LOG"
  pm2 restart singadvisor-backend 2>&1 | tee -a "$LOG"
  log "Backend deployed!"
}

case "${1:-both}" in
  frontend) deploy_frontend ;;
  backend)  deploy_backend ;;
  both)     deploy_frontend && deploy_backend ;;
  *)        echo "Usage: bash autodeploy.sh [frontend|backend|both]" ;;
esac

log "=== Deploy complete ==="
