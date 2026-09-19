import { BadRequestException, Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  useMultiFileAuthState,
  type WASocket,
} from 'baileys';
import * as qrcode from 'qrcode';
import { existsSync, rmSync } from 'fs';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { SettingsService } from '../settings/settings.service';

/**
 * WhatsApp, over Baileys.
 *
 * Baileys is an unofficial client: it pairs as a LINKED DEVICE of a real
 * WhatsApp account, exactly as WhatsApp Web does, and sends as that number.
 * There is no API key and no Business API account — the phone that scans the
 * QR is the sender, and everything sent is attributable to it. That is worth
 * being clear about, because it also means WhatsApp can block the number if it
 * is used the way a bulk sender would use it. sendBroadcast below is
 * deliberately slow for that reason.
 *
 * WHAT THIS SERVICE OWNS: exactly one socket, and the truth about its state.
 *
 * eventsh-v1's equivalent (backend/src/modules/otp/whatsapp.service.ts) is the
 * pattern this follows, with four deliberate departures:
 *
 *  1. It connects at module init, unconditionally. This one connects only when
 *     the admin has turned it on — a deployment that does not use WhatsApp
 *     should not be opening a socket to WhatsApp on every boot.
 *
 *  2. Its QR is printed to the server's terminal. Nobody scanning a phone is
 *     reading production logs, so this one keeps the QR in memory as a data
 *     URL for the Settings page to render.
 *
 *  3. Its `isReady()` is `!!this.sock`, which is true from the moment a socket
 *     object exists — including while it is unauthenticated, waiting to be
 *     scanned, or closed and retrying. Sending on that returns a promise that
 *     never settles. Here readiness means the connection actually reached
 *     `open`, tracked from the event rather than inferred from the object.
 *
 *  4. Its reconnect calls init again from inside the old socket's own event
 *     handler, so every reconnect adds another live handler on another socket,
 *     all still firing. Here each socket gets a generation number and events
 *     from a superseded generation are dropped.
 *
 * THE AUTH FOLDER IS THE PAIRING. Baileys writes the linked-device keys to
 * disk; delete them and the phone must scan again. Deployment/autodeploy.sh
 * runs `git clean -fd`, which removes untracked files — so this folder MUST
 * stay gitignored or every deploy silently unpairs the phone. It is in both
 * .gitignore files; see the note there before renaming it.
 */

/** Where the pairing lives. Overridable because the deploy may want it off the
 * repo path entirely — see WHATSAPP_AUTH_DIR in .env.example. */
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || join(process.cwd(), 'whatsapp-auth');

/**
 * What the admin page is told.
 *
 * `awaiting-scan` is a state of its own rather than a flavour of
 * `connecting`, because it is the only one that asks the human for something.
 */
export type WhatsappStatus =
  | 'off'
  | 'disconnected'
  | 'connecting'
  | 'awaiting-scan'
  | 'connected';

export type WhatsappState = {
  status: WhatsappStatus;
  /** The QR as a data: URL, only while `awaiting-scan`. */
  qr: string | null;
  /** When the current QR stops being scannable. WhatsApp rotates it about
   * every 20 seconds and Baileys emits a fresh one; this lets the page show
   * that it is refreshing rather than looking frozen. */
  qrExpiresAt: string | null;
  /** The paired number, once connected. Digits, as WhatsApp reports them. */
  number: string | null;
  connectedAt: string | null;
  /** The last failure, for the page to show instead of silence. */
  lastError: string | null;
};

@Injectable()
export class WhatsappService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappService.name);

  private sock: WASocket | null = null;

  /**
   * Which socket is the current one.
   *
   * Every socket captures the generation it was created under. A socket whose
   * generation is stale has been replaced — by a reconnect, a manual restart,
   * or a disconnect — and its events are ignored. Without this, a reconnect
   * leaves the old socket's handlers running and two sockets race to set the
   * status, which is how a disconnected session ends up reporting `connected`.
   */
  private generation = 0;

  private status: WhatsappStatus = 'off';
  private qrDataUrl: string | null = null;
  private qrExpiresAt: Date | null = null;
  private number: string | null = null;
  private connectedAt: Date | null = null;
  private lastError: string | null = null;

  /** Reconnect backoff, reset on a successful open. Capped so a permanently
   * broken pairing does not reconnect in a tight loop for days. */
  private retries = 0;
  private retryTimer: NodeJS.Timeout | null = null;
  private static readonly MAX_RETRIES = 5;

  /** Guards against two connect() calls overlapping — the admin
   * double-clicking, or a reconnect landing while one is in flight. */
  private starting = false;

  constructor(private readonly settings: SettingsService) {}

  /**
   * On boot, reconnect silently IF the admin has it switched on AND the phone
   * has been paired before. No pairing means no QR is generated here: a QR
   * nobody is watching would expire unseen, so it is left for the admin to ask
   * for from the page.
   */
  async onModuleInit() {
    try {
      const s = await this.settings.getForInternalUse();
      if (!s.whatsappMessagingEnabled) {
        this.status = 'off';
        return;
      }
      if (!this.isPaired()) {
        this.status = 'disconnected';
        return;
      }
      await this.connect();
    } catch (err) {
      // A WhatsApp session that cannot start must never stop the app booting.
      this.logger.warn(`WhatsApp did not start: ${describe(err)}`);
      this.lastError = describe(err);
      this.status = 'disconnected';
    }
  }

  async onModuleDestroy() {
    this.clearRetry();
    await this.teardown();
  }

  /** Whether a pairing exists on disk. `creds.json` is the file Baileys writes
   * first and needs; the key files alone are not a session. */
  private isPaired(): boolean {
    return existsSync(join(AUTH_DIR, 'creds.json'));
  }

  getState(): WhatsappState {
    return {
      status: this.status,
      qr: this.status === 'awaiting-scan' ? this.qrDataUrl : null,
      qrExpiresAt: this.qrExpiresAt ? this.qrExpiresAt.toISOString() : null,
      number: this.number,
      connectedAt: this.connectedAt ? this.connectedAt.toISOString() : null,
      lastError: this.lastError,
    };
  }

  /** True only when a message would actually go out. */
  isConnected(): boolean {
    return this.status === 'connected' && this.sock !== null;
  }

  /**
   * Open a session. Returns immediately — pairing is asynchronous, and the
   * page polls getState() for the QR.
   *
   * Turning the toggle on calls this. So does the Reconnect button.
   */
  async connect(): Promise<WhatsappState> {
    if (this.starting) return this.getState();
    if (this.isConnected()) return this.getState();

    this.starting = true;
    try {
      this.clearRetry();
      // A previous socket, if any, is replaced rather than left running.
      await this.teardown();

      const myGeneration = ++this.generation;
      this.status = 'connecting';
      this.lastError = null;

      await mkdir(AUTH_DIR, { recursive: true });
      const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
      // Asked for rather than pinned: WhatsApp refuses clients it considers
      // too old, and a pinned version becomes a silent outage months later.
      const { version } = await fetchLatestBaileysVersion();

      const sock = makeWASocket({
        version,
        auth: state,
        // The QR goes to the admin page, not the terminal. Baileys deprecated
        // this option anyway and prints a warning when it is set.
        printQRInTerminal: false,
        // What the phone shows under Linked Devices. Naming it for the site
        // means somebody auditing their linked devices knows what it is.
        browser: ['SingAdvisor', 'Chrome', '1.0.0'],
        // Nothing here reads history, and syncing it on every connect costs
        // minutes and memory for data that is thrown away.
        syncFullHistory: false,
        markOnlineOnConnect: false,
      });

      this.sock = sock;
      sock.ev.on('creds.update', saveCreds);
      sock.ev.on('connection.update', (update) => {
        // Events from a socket that has been superseded are not this session's.
        if (myGeneration !== this.generation) return;
        void this.onConnectionUpdate(update, myGeneration);
      });

      return this.getState();
    } catch (err) {
      this.lastError = describe(err);
      this.status = 'disconnected';
      this.logger.error(`WhatsApp connect failed: ${this.lastError}`);
      return this.getState();
    } finally {
      this.starting = false;
    }
  }

  private async onConnectionUpdate(
    update: { connection?: string; lastDisconnect?: { error?: unknown }; qr?: string },
    myGeneration: number,
  ) {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        this.qrDataUrl = await qrcode.toDataURL(qr, { margin: 1, width: 288 });
        // Baileys re-emits before this elapses; the page uses it to show that
        // a refresh is coming rather than that the code is dead.
        this.qrExpiresAt = new Date(Date.now() + 60_000);
        this.status = 'awaiting-scan';
        this.logger.log('WhatsApp QR ready — waiting for a phone to scan it.');
      } catch (err) {
        this.lastError = `Could not render the QR: ${describe(err)}`;
        this.logger.error(this.lastError);
      }
    }

    if (connection === 'open') {
      this.status = 'connected';
      this.qrDataUrl = null;
      this.qrExpiresAt = null;
      this.connectedAt = new Date();
      this.lastError = null;
      this.retries = 0;
      // `id` arrives as "<digits>:<device>@s.whatsapp.net"; the part before the
      // colon is the number that will appear as the sender.
      this.number = this.sock?.user?.id?.split(':')[0]?.split('@')[0] ?? null;
      this.logger.log(`WhatsApp connected as ${this.number ?? 'unknown number'}.`);
    }

    if (connection === 'close') {
      const code = statusCodeOf(lastDisconnect?.error);
      this.qrDataUrl = null;
      this.qrExpiresAt = null;

      if (code === DisconnectReason.loggedOut) {
        // The pairing is gone — unlinked from the phone, or rejected. Keeping
        // the credentials would make every future connect fail the same way,
        // so they are cleared and the next connect starts a fresh QR.
        this.logger.warn('WhatsApp logged out — clearing the pairing.');
        this.clearAuthFolder();
        this.status = 'disconnected';
        this.number = null;
        this.connectedAt = null;
        this.lastError = 'The phone unlinked this device. Scan again to reconnect.';
        this.sock = null;
        return;
      }

      if (this.retries >= WhatsappService.MAX_RETRIES) {
        this.status = 'disconnected';
        this.lastError = `Connection closed (code ${code ?? 'unknown'}) and gave up after ${this.retries} attempts.`;
        this.logger.error(this.lastError);
        this.sock = null;
        return;
      }

      // 2s, 4s, 8s, 16s, 32s.
      const wait = 2000 * 2 ** this.retries;
      this.retries += 1;
      this.status = 'connecting';
      this.lastError = `Reconnecting after a dropped connection (code ${code ?? 'unknown'}).`;
      this.logger.warn(`WhatsApp closed (code ${code ?? 'unknown'}). Retry ${this.retries} in ${wait}ms.`);
      this.clearRetry();
      this.retryTimer = setTimeout(() => {
        // Still the current generation? A manual reconnect or a disconnect in
        // the meantime supersedes this retry.
        if (myGeneration === this.generation) void this.connect();
      }, wait);
    }
  }

  /**
   * Unlink. Tells WhatsApp to drop the linked device where it can, then clears
   * the local pairing either way — a logout that failed on the network must
   * not leave credentials behind that the admin believes are gone.
   */
  async disconnect(): Promise<WhatsappState> {
    this.clearRetry();
    // Bumped first: any event still in flight from the old socket is stale.
    this.generation += 1;

    if (this.sock) {
      try {
        await this.sock.logout();
      } catch (err) {
        this.logger.warn(`WhatsApp logout call failed, clearing locally: ${describe(err)}`);
      }
    }
    await this.teardown();
    this.clearAuthFolder();

    this.status = 'disconnected';
    this.number = null;
    this.connectedAt = null;
    this.qrDataUrl = null;
    this.qrExpiresAt = null;
    this.lastError = null;
    return this.getState();
  }

  /** Called when the admin switches the feature off. Ends the socket but KEEPS
   * the pairing, so switching it back on does not need the phone again. */
  async suspend(): Promise<WhatsappState> {
    this.clearRetry();
    this.generation += 1;
    await this.teardown();
    this.status = 'off';
    this.qrDataUrl = null;
    this.qrExpiresAt = null;
    this.connectedAt = null;
    return this.getState();
  }

  private async teardown() {
    const sock = this.sock;
    this.sock = null;
    if (!sock) return;
    try {
      // Drop every listener before ending, so a close event from this socket
      // cannot schedule a reconnect for a session being deliberately stopped.
      sock.ev.removeAllListeners('connection.update');
      sock.ev.removeAllListeners('creds.update');
      sock.end(undefined);
    } catch (err) {
      this.logger.warn(`WhatsApp teardown: ${describe(err)}`);
    }
  }

  private clearRetry() {
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  private clearAuthFolder() {
    try {
      rmSync(AUTH_DIR, { recursive: true, force: true });
    } catch (err) {
      this.logger.error(`Could not clear the WhatsApp pairing at ${AUTH_DIR}: ${describe(err)}`);
    }
  }

  /**
   * A phone number as WhatsApp addresses it.
   *
   * Everything but digits goes, which handles the "+65 9123 4567" shape the
   * rest of this app stores. A number with no country code cannot be
   * addressed — WhatsApp has no concept of a local number — so it is rejected
   * rather than sent somewhere unintended.
   */
  toJid(phone: string): string {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 8) {
      throw new BadRequestException(
        `"${phone}" is not a WhatsApp number. Include the country code, e.g. +65 9123 4567.`,
      );
    }
    return `${digits}@s.whatsapp.net`;
  }

  /** Send one message. Throws when there is no live session, rather than
   * queueing into a void. */
  async sendText(phone: string, text: string): Promise<void> {
    if (!this.isConnected() || !this.sock) {
      throw new BadRequestException('WhatsApp is not connected. Pair a phone in Settings first.');
    }
    await this.sock.sendMessage(this.toJid(phone), { text });
  }

  /**
   * Whether a number is actually on WhatsApp.
   *
   * Worth asking before a broadcast: sending to numbers that are not on
   * WhatsApp is one of the patterns that gets a sender flagged. Returns true
   * when the check itself fails, so a flaky lookup does not silently drop a
   * real recipient.
   */
  async isOnWhatsapp(phone: string): Promise<boolean> {
    if (!this.isConnected() || !this.sock) return false;
    try {
      // Typed as possibly undefined — destructuring it directly throws on the
      // very failure this method is meant to absorb.
      const results = await this.sock.onWhatsApp(this.toJid(phone));
      // `exists` is typed `unknown` in this Baileys version, so a `?? false`
      // would widen to {} rather than narrowing to a boolean.
      return results?.[0]?.exists === true;
    } catch {
      return true;
    }
  }
}

/** Baileys wraps failures in Boom errors; the code is what says whether this
 * was a logout, a replaced session, or a dropped connection. */
function statusCodeOf(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const e = err as { output?: { statusCode?: number }; status?: number; code?: number };
  return e.output?.statusCode ?? e.status ?? e.code;
}

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
