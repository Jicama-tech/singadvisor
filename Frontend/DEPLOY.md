# Deploying to `https://jicama.tech/singadvisor`

Target: **168.231.121.20** (`srv866262`, Hostinger VPS) — the same host that
already runs jicama.tech, docaiq, auditaiq, compaiq, chataiq, xauditaiq and
xpenseaiq. Steps below follow the conventions already in use on that box.

**DEPLOYED — live at <https://jicama.tech/singadvisor>** (2026-08-09).
App at `/opt/singadvisor`, PM2 process `singadvisor` on `127.0.0.1:3100`.

---

## Connecting

Per `~/Downloads/prodUbantuconnect`. The pubkey-disable flags are mandatory —
without them pubkey auth hangs for the full timeout.

```bash
sshpass -p "$(cat ~/.docaiq-prod-pass)" ssh \
  -o StrictHostKeyChecking=no \
  -o ConnectTimeout=30 \
  -o PreferredAuthentications=password \
  -o PubkeyAuthentication=no \
  -o NumberOfPasswordPrompts=1 \
  root@168.231.121.20 '<cmd>'
```

A transient `Permission denied (publickey,password)` is fail2ban reacting to
rapid connects — wait and retry.

---

## What is already true on the server (verified)

| | Status |
|---|---|
| OS | Ubuntu 25.04, kernel 6.14 |
| Node / npm | **v20.20.2 / 10.8.2 already installed** — no install step needed |
| Disk | 116 GB free of 193 GB |
| Memory | 15 GB total, ~11 GB available |
| Port 3100 | **free** (3000, 3001, 3002, 4000, 5000, 5001, 5002, 8093 are taken) |
| TLS | Let's Encrypt cert for `jicama.tech` already installed and renewing |
| nginx | config currently valid; site file at `/etc/nginx/sites-enabled/jicama.tech` |
| Process manager | **PM2**, `pm2-root.service` enabled at boot |
| `/singadvisor` | returns 200 today only because `location /` falls back to the SPA `index.html` — the path is free |

### Conventions this box uses

- Apps live in `/opt/<product>` (docaiq, auditaiq, compaiq, xauditaiq) or
  `/home/<product>`.
- Node apps run under **PM2 as root**, not bespoke systemd units:
  `jicama-backend`, `xauditaiq-server`, `xpenseaiq-app`, `xpenseaiq-admin`,
  `xpenseaiq-enterprise`.
- jicama.tech itself is a static SPA at `/home/jicamaadmin/public_html`, with
  its NestJS backend (`/home/jicamaadmin/backend`) on PM2 proxied at `/api/`
  and `/auth/` → `localhost:5000`.
- Backups go to `/opt/<product>-backups`.
- **Subpath proxying is already in use**: the jicama.tech server block has a
  `location ^~ /events` proxying out to eventsh.com. `/singadvisor` follows
  exactly that shape.

---

## 1. Get the code onto the server

Repo: **<https://github.com/rbgoda/singadvisor>** (private).

The live server was originally seeded by rsync. To switch it to the same
git-based flow docaiq uses:

```bash
cd /opt && mv singadvisor singadvisor.rsync-backup
git clone https://github.com/rbgoda/singadvisor.git /opt/singadvisor
cp /opt/singadvisor.rsync-backup/.env /opt/singadvisor/.env
cp /opt/singadvisor.rsync-backup/prisma/prod.db /opt/singadvisor/prisma/prod.db
cp -r /opt/singadvisor.rsync-backup/var /opt/singadvisor/var
cd /opt/singadvisor && npm ci && npm run build && pm2 restart singadvisor
```

Updates then become `git fetch origin && git reset --hard origin/main`, exactly
like every other product on this host.

**Until then, updates go by rsync:**

```bash
rsync -az --delete \
  -e 'sshpass -p "$(cat ~/.docaiq-prod-pass)" ssh -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no -o NumberOfPasswordPrompts=1' \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude legacy --exclude 'prisma/*.db*' --exclude var --exclude .env \
  ~/Downloads/projects/singAdvisor/ \
  root@168.231.121.20:/opt/singadvisor/
```

## 2. Configure

```bash
cd /opt/singadvisor
cat > .env <<'EOF'
DATABASE_URL="file:/opt/singadvisor/prisma/prod.db"
AUTH_SECRET="REPLACE"
NEXT_PUBLIC_SITE_URL="https://jicama.tech/singadvisor"
NEXT_PUBLIC_BASE_PATH="/singadvisor"
UPLOAD_DIR="/opt/singadvisor/var/uploads"
ADMIN_EMAIL="you@jicama.tech"
ADMIN_PASSWORD="CHOOSE_A_STRONG_ONE"
PORT=3100
EOF
sed -i "s|REPLACE|$(openssl rand -base64 32)|" .env
chmod 600 .env
```

`NEXT_PUBLIC_BASE_PATH` is compiled in — changing it later needs a **rebuild**,
not just a restart.

## 3. Build

```bash
cd /opt/singadvisor
npm ci
npm run setup          # prisma generate + db push + seed (creates the admin user)
npm run build
mkdir -p var/uploads
```

## 4. Start under PM2 (matching the other apps)

> **The port MUST be a CLI arg, not `PORT` in `.env`.** `next start` resolves
> its listen port *before* `.env` is loaded, so `PORT=3100` there is ignored and
> it silently falls back to **3000 — already taken on this host**, producing an
> `EADDRINUSE` crash-loop. `ecosystem.config.js` passes `-p 3100` explicitly.

`/opt/singadvisor/ecosystem.config.js` (already on the server):

```js
module.exports = {
  apps: [{
    name: 'singadvisor',
    cwd: '/opt/singadvisor',
    script: 'node_modules/next/dist/bin/next',
    args: 'start -p 3100 -H 127.0.0.1',   // -H loopback: only nginx reaches it
    env: { NODE_ENV: 'production', PORT: '3100' },
    instances: 1, exec_mode: 'fork',
    max_memory_restart: '500M', autorestart: true, max_restarts: 10,
  }],
};
```

```bash
cd /opt/singadvisor
pm2 start ecosystem.config.js
pm2 save               # persists across reboot via the enabled pm2-root.service
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3100/singadvisor   # expect 200
```

Confirm it is healthy on the loopback **before** touching nginx. That ordering
is what caught the port collision above without any public impact.

## 5. Add the nginx location

Edit `/etc/nginx/sites-enabled/jicama.tech` and add this inside the existing
`server { listen 443 ssl; ... }` block, alongside the current `location ^~ /events`:

```nginx
    # SingAdvisor — Next.js under PM2 on 127.0.0.1:3100.
    # ^~ so it wins over the SPA `location /` fallback.
    # The app is BUILT with basePath=/singadvisor and already emits the prefix
    # on every URL — pass the path through UNCHANGED. No trailing slash on
    # proxy_pass, no rewrite; stripping the prefix breaks every route.
    location ^~ /singadvisor {
        proxy_pass http://127.0.0.1:3100;
        proxy_http_version 1.1;

        proxy_set_header Host              $host;
        proxy_set_header X-Real-IP         $remote_addr;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host  $host;

        client_max_body_size 10m;   # résumé uploads (5 MB cap in-app)
        proxy_buffering off;
        proxy_read_timeout 300s;

        proxy_set_header Upgrade    $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
```

Back up first, then validate before reloading:

```bash
cp /etc/nginx/sites-enabled/jicama.tech /opt/singadvisor-backups/jicama.tech.$(date +%F-%H%M).bak
nginx -t && systemctl reload nginx
```

`nginx -t` currently passes, so any failure after editing is your edit — fix it
before reloading rather than reloading a broken config.

## 6. Verify end state

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://jicama.tech/singadvisor           # 200
curl -s -o /dev/null -w '%{http_code}\n' https://jicama.tech/singadvisor/trainings # 200
curl -s -o /dev/null -w '%{http_code}\n' https://jicama.tech/singadvisor/blog      # 200
curl -s -o /dev/null -w '%{http_code}\n' https://jicama.tech/                      # 200, old site intact
curl -s -o /dev/null -w '%{http_code}\n' https://jicama.tech/events                # 200, /events still proxied
```

Then in a browser: images load, nav works, and `/singadvisor/admin` prompts for
login. **Change the admin password immediately after first sign-in.**

## Rollback

```bash
pm2 stop singadvisor && pm2 delete singadvisor && pm2 save
cp /opt/singadvisor-backups/jicama.tech.<timestamp>.bak /etc/nginx/sites-enabled/jicama.tech
nginx -t && systemctl reload nginx
```

That restores the previous state completely — the app is additive and touches
nothing the existing site depends on.

## Updating later

```bash
cd /opt/singadvisor
# rsync or `git fetch && git reset --hard origin/main`
npm ci
npx prisma db push        # only if the schema changed
npm run build
pm2 restart singadvisor
```

`npm run db:seed` **wipes all content and submissions** — first install only.

## Backups

```bash
/opt/singadvisor/prisma/prod.db   # all content + submissions
/opt/singadvisor/var/uploads/     # candidate résumés
```

```bash
sudo tee /etc/cron.daily/singadvisor-backup > /dev/null <<'EOF'
#!/bin/sh
d=/opt/singadvisor-backups; mkdir -p "$d"
sqlite3 /opt/singadvisor/prisma/prod.db ".backup '$d/db-$(date +%F).sqlite'"
tar czf "$d/uploads-$(date +%F).tgz" -C /opt/singadvisor/var uploads
find "$d" -name 'db-*' -mtime +30 -delete
find "$d" -name 'uploads-*' -mtime +30 -delete
EOF
sudo chmod +x /etc/cron.daily/singadvisor-backup
```

---

## Troubleshooting

| Symptom | Cause |
|---|---|
| 502 Bad Gateway | App not running — `pm2 logs singadvisor --lines 50` |
| Falls through to the old SPA | `location` is missing `^~`, so `location /` won the match |
| Page loads, no CSS/images | `NEXT_PUBLIC_BASE_PATH` was not set **at build time**. Rebuild. |
| 404 on every route under `/singadvisor` | nginx is stripping the prefix — remove any trailing slash on `proxy_pass` and any `rewrite` |
| **Every form fails**, log shows `x-forwarded-host … does not match origin` | Server Actions origin check. Forward the real host (`Host $host`, `X-Forwarded-Host $host`) and keep `X-Forwarded-Proto $scheme` |
| Admin login never sticks | Session cookie is `Secure`. Test via `https://jicama.tech/...`, never `http://IP:3100` |
| Résumé download 404s | `UPLOAD_DIR` not writable by the PM2 user |

---

## Alternative: a subdomain

Worth weighing — **every other product on this box is a subdomain**
(`docaiq.jicama.tech`, `auditaiq.jicama.tech`, `compaiq.jicama.tech`,
`admin.auditaiq.jicama.tech`). `singadvisor.jicama.tech` would match that
convention, needs no `basePath`, and decouples the app from jicama.tech's
nginx file.

1. **Namecheap** → jicama.tech → Advanced DNS → A record, host `singadvisor`,
   value `168.231.121.20`.
2. Set `NEXT_PUBLIC_BASE_PATH=""` and
   `NEXT_PUBLIC_SITE_URL="https://singadvisor.jicama.tech"`, rebuild.
3. New nginx `server` block proxying `/` → `127.0.0.1:3100`.
4. `certbot --nginx -d singadvisor.jicama.tech`.

The app supports both; both are covered by the same 36-check test suite.
