# SingAdvisor Server Setup & Auto-Deploy Runbook

One-time VPS setup for the new SPA + Backend, then GitHub-push auto-deploy.
Mirrors eventsh-v1's `deployment/SERVER_SETUP.md` pattern, adapted to this
app's two-piece deployment (Frontend-vite SPA + NestJS Backend).

## 1. One-time server setup (as your deploy user)

```bash
# Clone once (on a shared server use your deploy user's home, e.g.
# /home/eventshadmin — then start the webhook with
# SINGADVISOR_PROJ=/home/eventshadmin/singadvisor)
mkdir -p /home/singadvisor && cd /home/singadvisor
git clone git@github.com:<you>/singadvisor.git
cd singadvisor
git checkout main
```

### Secrets files (NEVER committed — create on the server only)

**`Backend/.env`** — production values (add `PORT=4001` if another app on
the server already occupies 4000; the nginx /api proxy matches this port):
- `MONGO_URI` (production Mongo)
- `JWT_ACCESS_SECRET`, `JWT_ACCESS_EXPIRY`
- `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- `EVENTSH_BACKEND_URL` (the eventsh instance's PUBLIC url), `EVENTSH_ORGANIZER_ID`, `EVENTSH_API_KEY`
- `SETTINGS_ENC_KEY` (fresh `openssl rand -hex 32`)
- `SMTP_*` (fallback mailer)
- `RAZORPAY_*` only if you prefer env over the Settings UI

**`Frontend-vite/.env.production`** — build-time values (Vite reads this
file automatically during `npm run build`):
```
VITE_API_URL=https://singadvisor.com/api      # or https://api.singadvisor.com
VITE_EVENTSH_PUBLIC_URL=https://eventsh.yourdomain
VITE_EVENTSH_ORGANIZER_ID=<the organizer id>
SITE_URL=https://singadvisor.com              # used by the sitemap script
```

### Install + first manual deploy (proves everything works before automation)

```bash
cd /home/singadvisor/singadvisor/Backend
npm ci && npm run build
pm2 start dist/src/main.js --name singadvisor-backend
pm2 save

cd ../Frontend-vite
npm ci && npm run build
npx tsx scripts/generate-sitemap.ts

# nginx: copy deployment/nginx-singadvisor.conf → sites-available,
# symlink to sites-enabled, nginx -t && systemctl reload nginx
```

## 2. Auto-deploy webhook

```bash
cd /home/singadvisor/singadvisor/deployment
chmod +x autodeploy.sh
WEBHOOK_SECRET=<random> pm2 start webhook-server.js --name singadvisor-webhook
pm2 save
```

In GitHub → repo Settings → Webhooks:
- Payload URL: `http://<server>:9002/webhook` (or expose via nginx as `/deploy-webhook` with HTTPS)
- Content type: `application/json`
- Secret: the same `WEBHOOK_SECRET`
- Events: just `push`

From now on every push to **`main`** auto-deploys only the changed
side: `Frontend-vite/` files → SPA build; `Backend/` files → backend build
+ `pm2 restart singadvisor-backend`.

## 3. Manual deploy

```bash
cd /home/singadvisor/singadvisor/deployment
bash autodeploy.sh frontend   # or backend, or both
```

## 4. Rollback (while the old Next app exists)

The old `Frontend/` Next.js app is deliberately untouched by autodeploy —
it stays on the server as the rollback target. Re-point nginx's `root`
back at the old app's serving directory (or restore the previous nginx
config) to roll back instantly.

## 5. Notes

- `sync_repo` hard-resets the working tree: the server is a deployment
  target, not a workspace. Gitignored files survive (`Backend/.env`,
  `Frontend-vite/.env.production`, `Backend/uploads/`, `Backend/resumes/`).
- Razorpay live webhooks need a publicly reachable URL — point Razorpay at
  `https://<server>/payments/razorpay/webhook` (routed to the Backend,
  port 4000) when moving to live keys.
- The eventsh dedicated instance this Backend talks to must itself be
  deployed and reachable at `EVENTSH_BACKEND_URL` (see the eventsh repo's
  WHITE_LABEL_DEPLOYMENT docs).
