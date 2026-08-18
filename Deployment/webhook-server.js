/**
 * GitHub Webhook Listener for Auto-Deploy (SingAdvisor) — mirrors
 * eventsh-v1/deployment/webhook-server.js. Listens for pushes to the
 * `main` branch and runs autodeploy.sh for whichever side changed
 * (Backend/ or Frontend-vite/).
 *
 * Setup on server:
 *   1. cd /home/singadvisor/singadvisor/Deployment
 *   2. WEBHOOK_SECRET=your_secret pm2 start webhook-server.js --name singadvisor-webhook
 *   3. Add GitHub webhook: https://<server>/webhook (port 9002)
 *      - Content type: application/json
 *      - Secret: (must match WEBHOOK_SECRET env var)
 *      - Events: Just "push"
 *
 * Or run directly: WEBHOOK_SECRET=your_secret node webhook-server.js
 */

const http = require("http");
const crypto = require("crypto");
const { execFile } = require("child_process");
const path = require("path");

const PORT = 9002;
const SECRET = process.env.WEBHOOK_SECRET || "singadvisor-deploy-secret";
const DEPLOY_SCRIPT = path.resolve(__dirname, "autodeploy.sh");

let deploying = false;

function verifySignature(payload, signature) {
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", SECRET);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/webhook") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const sig = req.headers["x-hub-signature-256"];
    if (!verifySignature(body, sig)) {
      console.log("[webhook] Invalid signature, rejecting");
      res.writeHead(403);
      res.end("Invalid signature");
      return;
    }

    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      res.writeHead(400);
      res.end("Invalid JSON");
      return;
    }

    // Only deploy on push to main
    if (payload.ref !== "refs/heads/main") {
      console.log(`[webhook] Ignoring push to ${payload.ref}`);
      res.writeHead(200);
      res.end("Ignored - not main branch");
      return;
    }

    if (deploying) {
      console.log("[webhook] Deploy already in progress, skipping");
      res.writeHead(200);
      res.end("Deploy already in progress");
      return;
    }

    // Determine which side changed, so a frontend-only push never restarts
    // the backend and vice versa.
    const commits = payload.commits || [];
    const changed = new Set();
    commits.forEach((c) => {
      [...(c.added || []), ...(c.modified || []), ...(c.removed || [])].forEach((f) => changed.add(f));
    });

    const frontendChanged = [...changed].some((f) => f.startsWith("Frontend-vite/"));
    const backendChanged = [...changed].some((f) => f.startsWith("Backend/"));

    let target = "both";
    if (frontendChanged && !backendChanged) target = "frontend";
    if (backendChanged && !frontendChanged) target = "backend";
    if (!frontendChanged && !backendChanged) {
      console.log("[webhook] No deployable paths changed, skipping");
      res.writeHead(200);
      res.end("No deployable changes");
      return;
    }

    deploying = true;
    console.log(`[webhook] Deploying ${target} (${changed.size} files)`);

    execFile("bash", [DEPLOY_SCRIPT, target], (err, stdout, stderr) => {
      deploying = false;
      if (err) {
        console.error(`[webhook] Deploy failed: ${err.message}`);
        console.error(stderr);
      } else {
        console.log("[webhook] Deploy succeeded");
      }
    });

    res.writeHead(202);
    res.end(`Deploying ${target}`);
  });
});

server.listen(PORT, () => {
  console.log(`SingAdvisor deploy webhook listening on port ${PORT}`);
});
