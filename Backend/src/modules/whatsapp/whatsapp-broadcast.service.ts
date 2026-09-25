import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Contact, ContactDocument } from '../crm/entities/contact.entity';
import { Membership, MembershipDocument } from '../memberships/entities/membership.entity';
import { activeMembershipFilter } from '../memberships/entities/membership.entity';
import {
  WhatsappBroadcast,
  WhatsappBroadcastDocument,
  type BroadcastRecipient,
  type BroadcastStatus,
} from './entities/whatsapp-broadcast.entity';
import { access, readFile } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { join, resolve, sep } from 'path';
import { SendBroadcastDto } from './dto/send-broadcast.dto';
import { htmlToWhatsapp } from './html-to-whatsapp';
import { WhatsappService } from './whatsapp.service';
import { cleanName, firstNameOf, render, validate, type CampaignVars } from './campaign-template';

/**
 * Personalised WhatsApp campaigns, sent slowly and on purpose.
 *
 * Modelled on kioscart-v1's campaigns (backend/src/modules/campaigns): each
 * recipient gets their own rendering of the message — `{{name}}` filled,
 * `{Hi|Hello}` spintax picked — and the send can pause, resume and stop.
 *
 * PACE IS THE WHOLE DESIGN. Baileys sends as a linked device of a real
 * WhatsApp account, and WhatsApp bans accounts that behave like bulk senders:
 * a burst of identical messages to numbers that have never replied is the
 * exact signature. So a campaign waits 6–15 s (jittered) after every message
 * and 30–60 s after every twentieth, checks each number is on WhatsApp first,
 * pauses the moment the session drops, and pauses for the day at a rolling
 * 24-hour cap. The number being risked belongs to the business, and losing it
 * means losing the account — which is why production can only make the pacing
 * slower (see pacing()).
 *
 * ONE CAMPAIGN AT A TIME. Two interleaving would double the send rate. The
 * slot is claimed before the first await (see CLAIMING).
 *
 * The runner lives in this process's memory. A restart loses the loop, so on
 * boot anything left `queued`/`sending` is PAUSED, and a resume picks up where
 * it stopped: each recipient is marked as taken (attemptAt) before its message
 * goes out and its outcome is written right after. The one message that can
 * fall between the two is closed as failed on the next run and NOT sent again.
 * That reconciliation assumes ONE backend process (Deployment/autodeploy.sh:
 * pm2 fork mode); gate it on an owner/lease field before scaling out.
 */

/** Per campaign. A deliberate ceiling: a list bigger than this should be going
 * out by email, and a mistake at this size is one nobody can take back. */
const MAX_RECIPIENTS = 500;

/** Fewer digits than this and WhatsApp cannot address the number — the same
 * threshold WhatsappService.toJid rejects on. */
const MIN_DIGITS = 8;

/** WhatsApp's own limits: 4096 for a text message, 1024 for an image caption. */
const MAX_TEXT = 4096;
const MAX_CAPTION = 1024;

/** Every campaign image lives here and nowhere else. */
const IMAGE_ROOT = join(process.cwd(), 'uploads', 'whatsapp');

/** Held from the moment send()/resume() decides to start until the campaign
 * has an id to hold the slot under. Every check before the claim is
 * synchronous, so two requests cannot both pass it. */
const CLAIMING = '__claiming__';

const DAY_MS = 24 * 60 * 60 * 1000;
const SAMPLE_COUNT = 20;

/** How long cancel() waits for the runner to notice, so its answer usually
 * already says `cancelled`. The page polls either way. */
const CANCEL_SETTLE_MS = 2_500;

/** Waits between tries at writing down one recipient's outcome. */
const RECORD_RETRY_MS = [500, 2_000, 5_000];

/** Why a recipient was left out. Shown per row and grouped in the preview. */
export const SKIP = {
  noNumber: 'No phone number on record',
  unusable: 'Not a usable number — include the country code',
  optedOut: 'Opted out of WhatsApp marketing',
  tooLong: 'Message too long for WhatsApp',
  notOnWhatsapp: 'That number is not on WhatsApp',
  invalid: 'WhatsApp could not address that number',
  stopped: 'Campaign stopped',
} as const;

const FAIL = {
  notSent: 'WhatsApp did not send the message.',
  /** Taken for sending, outcome never recorded — see attemptAt. */
  unknown: 'Sending was interrupted and this message may have gone out, so it was not sent again.',
} as const;

const MSG = {
  unknown: (keys: string[]) =>
    `The message uses placeholders that do not exist: ${keys.map((k) => `{{${k}}}`).join(', ')}.`,
  empty: 'Write a message first.',
  notLinked: 'WhatsApp is not connected. Pair a phone in Settings first.',
  busy: 'A campaign is already going out. Wait for it to finish, or stop it, before starting another.',
  nobody: 'Nobody in that audience has a number we can message.',
  tooMany: (n: number) =>
    `That audience is ${n} people; the limit for one campaign is ${MAX_RECIPIENTS}.`,
  notPaused: 'Only a paused campaign can be resumed.',
  disconnected: 'The WhatsApp connection dropped. Reconnect it in Settings, then resume.',
  dailyLimit: (limit: number) =>
    `Daily limit reached (${limit} messages in 24 hours). Resume it tomorrow.`,
  restarted: 'The server restarted while this campaign was sending. Resume to continue.',
  crashed: 'Sending stopped because of a server error. Resume to try again.',
  imageGone: 'The campaign image is no longer on the server, so nothing more was sent.',
} as const;

/**
 * The pacing, read per use because main.ts loads .env after the imports.
 *
 * Overridable by environment (WHATSAPP_CAMPAIGN_MIN_GAP_MS and friends) so a
 * test can run a campaign in milliseconds — but ONLY when NODE_ENV says
 * development or test. Anywhere else an override can only make it SLOWER.
 * Keyed that way round because the deploy (Deployment/autodeploy.sh) never
 * sets NODE_ENV=production: "strict unless production" would leave the live
 * server unclamped, and a copied-over test value must never turn the
 * business's number into a bulk sender.
 */
function pacing() {
  const prod = !['development', 'test'].includes(process.env.NODE_ENV ?? '');
  const ms = (name: string, fallback: number) => {
    const raw = process.env[name];
    const value = raw === undefined || raw === '' ? NaN : Number(raw);
    if (!Number.isFinite(value) || value < 0) return fallback;
    return prod ? Math.max(value, fallback) : value;
  };
  const minGap = ms('WHATSAPP_CAMPAIGN_MIN_GAP_MS', 6_000);
  const minPause = ms('WHATSAPP_CAMPAIGN_MIN_PAUSE_MS', 30_000);
  const everyRaw = ms('WHATSAPP_CAMPAIGN_PAUSE_EVERY', 20);
  return {
    minGap,
    maxGap: Math.max(minGap, ms('WHATSAPP_CAMPAIGN_MAX_GAP_MS', 15_000)),
    minPause,
    maxPause: Math.max(minPause, ms('WHATSAPP_CAMPAIGN_MAX_PAUSE_MS', 60_000)),
    // A longer pause after every N messages: in production N may only shrink.
    pauseEvery: Math.max(1, Math.round(prod ? Math.min(everyRaw, 20) : everyRaw)),
  };
}

/**
 * Campaign messages per rolling 24 hours, across all campaigns. 100 by
 * default: a low daily volume is one of the strongest protections against
 * WhatsApp restricting the number. WHATSAPP_CAMPAIGN_DAILY_LIMIT overrides it.
 */
function dailyLimit(): number {
  const raw = Number(process.env.WHATSAPP_CAMPAIGN_DAILY_LIMIT);
  // Blank, zero, negative or not a number all mean "use the default": a typo
  // here must not stop every campaign at once, nor silently lift the cap.
  return Number.isFinite(raw) && raw >= 1 ? Math.floor(raw) : 100;
}

function between(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** One campaign as its progress view reads it: the campaign, and each
 * recipient with a masked number and the message they were sent. */
export type BroadcastDetail = Omit<WhatsappBroadcast, 'recipients'> & {
  _id: unknown;
  recipients: Array<{
    name: string;
    phone: string;
    status: BroadcastRecipient['status'];
    reason: string | null;
    sentAt: Date | null;
    text: string;
  }>;
};

/** A row being assembled, before it is rendered. */
type Draft = BroadcastRecipient & { vars: CampaignVars };

/** Who has opted out, as the checks need it. */
type OptOuts = { emails: Set<string>; contactIds: Set<string>; digits: string[] };

@Injectable()
export class WhatsappBroadcastService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(WhatsappBroadcastService.name);

  /** The campaign currently going out, or CLAIMING, or null. */
  private running: string | null = null;
  /** Campaigns asked to stop; the runner acts on it before the next message. */
  private readonly cancelRequested = new Set<string>();
  /** Wakes a runner waiting out a gap, so a stop is not held up by a
   * minute-long pause. */
  private waker: (() => void) | null = null;
  /** When the last campaign message was handed to WhatsApp, from whichever
   * campaign. The pacing gap is per number, not per run. */
  private lastSendAt: number | null = null;
  private shuttingDown = false;

  constructor(
    @InjectModel(WhatsappBroadcast.name)
    private readonly model: Model<WhatsappBroadcastDocument>,
    @InjectModel(Contact.name)
    private readonly contacts: Model<ContactDocument>,
    @InjectModel(Membership.name)
    private readonly memberships: Model<MembershipDocument>,
    private readonly whatsapp: WhatsappService,
  ) {}

  // ── Lifecycle ────────────────────────────────────────────────────────────

  /**
   * Campaigns the last process was part-way through are PAUSED, not failed:
   * the loop is gone, but who has and has not been messaged is on the record,
   * so the admin can resume. Never allowed to stop the app booting.
   */
  async onModuleInit() {
    try {
      const res = await this.model.updateMany(
        { status: { $in: ['queued', 'sending'] } },
        { $set: { status: 'paused', lastError: MSG.restarted } },
      );
      if (res.modifiedCount > 0) {
        this.logger.warn(`Paused ${res.modifiedCount} WhatsApp campaign(s) left mid-send by a restart.`);
      }
    } catch (err) {
      this.logger.warn(`Could not reconcile interrupted campaigns: ${describe(err)}`);
    }
  }

  /** A sleeping runner is woken so the process is not held open by a pacing
   * timer; the next boot pauses what it leaves behind. */
  onModuleDestroy() {
    this.shuttingDown = true;
    this.waker?.();
  }

  // ── Reading ──────────────────────────────────────────────────────────────

  list() {
    // Recipient arrays get long; the list view needs counts, not rows.
    return this.model.find().select('-recipients').sort({ createdAt: -1 }).limit(100).lean().exec();
  }

  /** One campaign with its recipients. Phones are masked: the page needs to
   * recognise a row, not to dial it. */
  async findOne(id: string): Promise<BroadcastDetail> {
    const doc = await this.findDoc(id, true);
    return {
      ...doc,
      // Absent on campaigns stored before it existed (.lean() applies no
      // schema defaults), and the progress bar divides by it.
      pendingCount: doc.pendingCount ?? (doc.recipients ?? []).filter((r) => r.status === 'pending').length,
      recipients: (doc.recipients ?? []).map((r) => ({
        name: r.name,
        phone: maskPhone(r.phone),
        status: r.status,
        reason: r.reason,
        sentAt: r.sentAt,
        text: r.text || doc.message,
      })),
    };
  }

  /**
   * The CRM contacts the composer's picker lists — enough to recognise and
   * tick someone, nothing more. Served here, under the `whatsapp` tab, so an
   * operator who runs campaigns does not also need the whole CRM.
   */
  async pickableContacts() {
    const rows = await this.contacts
      .find()
      .select('name email company role tags phone whatsapp whatsappOptOut')
      .sort({ lastActivityAt: -1 })
      .lean()
      .exec();
    return rows.map((c) => {
      const number = (c.whatsapp || c.phone || '').trim();
      return {
        _id: String(c._id),
        name: c.name || '',
        email: c.email,
        company: c.company || '',
        role: c.role || '',
        tags: c.tags ?? [],
        phone: number ? maskPhone(number) : '',
        // Why this row cannot be ticked, if it cannot — the same words the
        // preview uses, so the picker and the skip list agree.
        blocked: !number
          ? SKIP.noNumber
          : number.replace(/\D/g, '').length < MIN_DIGITS
            ? SKIP.unusable
            : c.whatsappOptOut
              ? SKIP.optedOut
              : null,
      };
    });
  }

  // ── Preview ──────────────────────────────────────────────────────────────

  /**
   * Exactly what a campaign would do, without sending: who is skipped and
   * why, and the real text of the first recipients' messages (same renderer,
   * same seed, same names as the send). Works without a linked phone, so a
   * campaign can be written and checked first.
   */
  async preview(dto: SendBroadcastDto) {
    const template = this.resolveTemplate(dto);
    if (dto.imageUrl) await this.assertImageUsable(dto.imageUrl);
    const rows = await this.buildAudience(dto, template);

    const skipped: Record<string, number> = {};
    for (const r of rows) {
      if (r.status === 'skipped' && r.reason) skipped[r.reason] = (skipped[r.reason] ?? 0) + 1;
    }
    const sendable = rows.filter((r) => r.status === 'pending');
    const warnings: string[] = [];
    if (sendable.length > MAX_RECIPIENTS) warnings.push(MSG.tooMany(sendable.length));
    const sentToday = (await this.sentTimesSince(Date.now() - DAY_MS)).length;

    return {
      template,
      hasImage: !!dto.imageUrl,
      total: rows.length,
      willSend: sendable.length,
      willSkip: rows.length - sendable.length,
      skipped,
      unknownPlaceholders: validate(template).unknown,
      warnings,
      estimatedMinutes: estimateMinutes(sendable.length),
      dailyLimit: dailyLimit(),
      dailyRemaining: Math.max(0, dailyLimit() - sentToday),
      connected: this.whatsapp.isConnected(),
      samples: sendable.slice(0, SAMPLE_COUNT).map((r) => ({
        name: r.name,
        phone: maskPhone(r.phone),
        text: r.text,
      })),
    };
  }

  // ── Starting, stopping, resuming ─────────────────────────────────────────

  /**
   * Create the campaign and start sending. Returns as soon as it is under
   * way; the loop runs on after the response and the page polls it — a
   * request held open for the hour a campaign can take would be cut off by
   * nginx long before.
   */
  async send(dto: SendBroadcastDto, createdBy: string) {
    const template = this.resolveTemplate(dto);
    const { unknown } = validate(template);
    if (unknown.length) throw new BadRequestException(MSG.unknown(unknown));
    if (!this.whatsapp.isConnected()) throw new BadRequestException(MSG.notLinked);
    this.claim(CLAIMING);

    let handedOff = false;
    try {
      // Before any row is written: an image no longer on disk must fail while
      // this is still a request, not half-way through a send.
      if (dto.imageUrl) await this.loadImage(dto.imageUrl);

      const recipients = await this.buildAudience(dto, template);
      const sendable = recipients.filter((r) => r.status === 'pending').length;
      if (sendable === 0) throw new BadRequestException(MSG.nobody);
      if (sendable > MAX_RECIPIENTS) throw new BadRequestException(MSG.tooMany(sendable));

      const campaign = await this.model.create({
        name: dto.name,
        message: template,
        messageHtml: dto.messageHtml ?? '',
        imageUrl: dto.imageUrl ?? null,
        audience: dto.audience,
        tag: dto.tag ?? null,
        recipients,
        status: 'queued',
        sentFrom: this.whatsapp.getState().number,
        skippedCount: recipients.length - sendable,
        pendingCount: sendable,
        startedAt: new Date(),
        createdBy,
      });
      const id = String(campaign._id);
      this.running = id;
      handedOff = await this.startRunner(id, ['queued']);
      return { id, queued: sendable, skipped: recipients.length - sendable };
    } finally {
      // Nothing took the slot over — a rejected audience, a failed insert —
      // so it is given back here. Once the runner has it, the runner's own
      // `finally` releases it.
      if (!handedOff) this.release();
    }
  }

  /** Carry on from where a paused campaign stopped. */
  async resume(id: string) {
    const doc = await this.findDoc(id, false);
    if (doc.status !== 'paused') throw new BadRequestException(MSG.notPaused);
    if (!this.whatsapp.isConnected()) throw new BadRequestException(MSG.notLinked);
    // Synchronous from the check to the claim, so two resumes (or a resume
    // and a send) cannot both pass.
    this.claim(id);
    let handedOff = false;
    try {
      handedOff = await this.startRunner(id, ['paused']);
    } finally {
      if (!handedOff) this.release();
    }
    // Stopped between the read above and the flip.
    if (!handedOff) throw new BadRequestException(MSG.notPaused);
    return this.findDoc(id, false);
  }

  /**
   * Stop a campaign. One that is sending stops after the message in flight —
   * the runner owns its recipients while it runs, so it is asked, not
   * overridden. One that is not running is closed here. Either way every
   * recipient still pending becomes `skipped` "Campaign stopped".
   */
  async cancel(id: string) {
    const doc = await this.findDoc(id, false);
    const open: BroadcastStatus[] = ['queued', 'sending', 'paused'];
    if (open.includes(doc.status)) {
      if (this.running === id) {
        await this.askRunnerToStop(id);
      } else if (!(await this.stopRemaining(id, open)) && this.running === id) {
        // A resume started the runner between the read and the write.
        await this.askRunnerToStop(id);
      }
      // The runner can end in a pause while the stop is landing — the daily
      // cap or a dropped session decided it a moment before — and its
      // `finally` drops the stop request. Answering "stopped" over a campaign
      // that is really paused is the one outcome a Stop must not have, so once
      // no runner holds it, finish the stop here (a no-op if already closed).
      if (this.running !== id) await this.stopRemaining(id, open);
    }
    return this.findDoc(id, false);
  }

  // ── Building the audience ────────────────────────────────────────────────

  /**
   * The WhatsApp text the composer's message becomes — placeholders and
   * spintax still in it. Converted HERE rather than in the browser so that
   * the stored template is provably what was rendered, and a client posting
   * straight to the API cannot store one message and send another.
   */
  private resolveTemplate(dto: SendBroadcastDto): string {
    const text = dto.messageHtml ? htmlToWhatsapp(dto.messageHtml) : (dto.message ?? '').trim();
    if (!text) throw new BadRequestException(MSG.empty);
    return text;
  }

  /**
   * Resolve an audience to a fixed list, each row rendered.
   *
   * Everything that disqualifies a recipient is recorded as a `skipped` row
   * with a reason rather than filtered away, so the campaign can answer "why
   * didn't X get it".
   */
  private async buildAudience(dto: SendBroadcastDto, template: string): Promise<BroadcastRecipient[]> {
    const optOuts = await this.optOuts();
    const rows: Draft[] = [];

    const push = (p: {
      phone: string;
      name: string;
      email: string;
      contactId?: string | null;
      company?: string;
      role?: string;
      optedOut?: boolean;
    }) => {
      const phone = (p.phone || '').trim();
      const name = cleanName(p.name, p.email);
      let reason: string | null = null;
      if (!phone) reason = SKIP.noNumber;
      else if (phone.replace(/\D/g, '').length < MIN_DIGITS) reason = SKIP.unusable;
      // The flag on the row's own contact, OR any opted-out contact sharing
      // the address or the number: one person routinely has two contacts, and
      // an opt-out on either is an opt-out.
      else if (p.optedOut || isOptedOut(optOuts, p.email, p.contactId ?? null, phone))
        reason = SKIP.optedOut;
      rows.push({
        phone,
        name: p.name || '',
        email: p.email || '',
        contactId: p.contactId ?? null,
        status: reason ? 'skipped' : 'pending',
        reason,
        sentAt: null,
        text: '',
        attemptAt: null,
        vars: {
          name,
          first_name: firstNameOf(name),
          company: (p.company || '').trim(),
          role: (p.role || '').trim(),
        },
      });
    };

    if (dto.audience === 'manual') {
      const numbers = (dto.numbers ?? []).map((n) => n.trim()).filter(Boolean);
      if (numbers.length === 0) throw new BadRequestException('Add at least one number.');
      for (const n of numbers) push({ phone: n, name: '', email: '' });
    } else if (dto.audience === 'members') {
      // Active members only. Somebody whose membership lapsed did not agree to
      // keep hearing from us on WhatsApp.
      const members = await this.memberships
        .find(activeMembershipFilter())
        .select('email name phone company')
        .lean()
        .exec();
      // Their CRM contact, for the role placeholder and the contact id.
      const byEmail = new Map(
        (
          await this.contacts
            .find({ email: { $in: members.map((m) => m.email.toLowerCase()) } })
            .select('email company role whatsapp')
            .lean()
            .exec()
        ).map((c) => [c.email.toLowerCase(), c]),
      );
      for (const m of members) {
        const c = byEmail.get(m.email.toLowerCase());
        push({
          phone: m.phone || c?.whatsapp || '',
          name: m.name,
          email: m.email,
          contactId: c ? String(c._id) : null,
          company: m.company || c?.company || '',
          role: c?.role || '',
        });
      }
    } else {
      const filter: Record<string, unknown> = {};
      if (dto.audience === 'tag') {
        if (!dto.tag) throw new BadRequestException('Choose a tag.');
        filter.tags = dto.tag;
      } else if (dto.audience === 'selected') {
        const ids = (dto.contactIds ?? []).filter((id) => Types.ObjectId.isValid(id));
        if (ids.length === 0) throw new BadRequestException('Tick at least one contact.');
        filter._id = { $in: ids };
      }
      const contacts = await this.contacts
        .find(filter)
        .select('email name phone whatsapp whatsappOptOut company role')
        .lean()
        .exec();
      for (const c of contacts) {
        push({
          // `whatsapp` wins over `phone`: it exists precisely because the
          // number somebody answers calls on is not always the one on WhatsApp.
          phone: c.whatsapp || c.phone || '',
          name: c.name,
          email: c.email,
          contactId: String(c._id),
          company: c.company,
          role: c.role,
          optedOut: c.whatsappOptOut,
        });
      }
    }

    // The same person reachable twice — a member who is also a tagged contact —
    // must not be messaged twice.
    const kept = dedupeByDigits(rows);

    // Rendered last, once the list is final. The seed is the contact when
    // there is one, else the number, so a contact's spintax pick is the same
    // in every campaign preview and send.
    const cap = dto.imageUrl ? MAX_CAPTION : MAX_TEXT;
    return kept.map(({ vars, ...row }) => {
      if (row.status !== 'pending') return row;
      const text = render(template, vars, row.contactId || row.phone.replace(/\D/g, ''));
      if (text.length > cap) return { ...row, status: 'skipped', reason: SKIP.tooLong };
      return { ...row, text };
    });
  }

  /** Every opted-out contact, keyed the three ways a recipient can match. The
   * opted-out are few, so this is one small query. */
  private async optOuts(): Promise<OptOuts> {
    const rows = await this.contacts
      .find({ whatsappOptOut: true })
      .select('email phone whatsapp')
      .lean()
      .exec();
    const digits: string[] = [];
    for (const r of rows) {
      for (const n of [r.phone, r.whatsapp]) {
        const d = (n || '').replace(/\D/g, '');
        if (d.length >= MIN_DIGITS) digits.push(d);
      }
    }
    return {
      emails: new Set(rows.map((r) => r.email.toLowerCase())),
      contactIds: new Set(rows.map((r) => String(r._id))),
      digits,
    };
  }

  // ── The runner ───────────────────────────────────────────────────────────

  /** Take the slot, or refuse. Called with no await since the checks before
   * it, which is what makes it single-flight. */
  private claim(holder: string) {
    if (this.running) throw new ConflictException(MSG.busy);
    this.running = holder;
  }

  private release(id?: string) {
    if (!this.running) return;
    if (id === undefined || this.running === id || this.running === CLAIMING) this.running = null;
  }

  /**
   * Flip the campaign to `sending` — only from the statuses given, so a
   * cancel that got there first wins — and start the loop without awaiting
   * it. The slot must already be held for this campaign.
   */
  private async startRunner(id: string, from: BroadcastStatus[]): Promise<boolean> {
    let res;
    try {
      res = await this.model.updateOne(
        { _id: id, status: { $in: from } },
        { $set: { status: 'sending', finishedAt: null } },
      );
    } catch (err) {
      // No runner will start, so none will clear a stop that landed in the
      // meantime — left behind, it would stop every later resume on its first
      // message. And a campaign just created must not sit at 'queued' with
      // nothing behind it: paused, it can be resumed or stopped.
      this.cancelRequested.delete(id);
      await this.model
        .updateOne({ _id: id, status: 'queued' }, { $set: { status: 'paused', lastError: MSG.crashed } })
        .catch(() => undefined);
      throw err;
    }
    if (res.matchedCount === 0) {
      this.cancelRequested.delete(id);
      return false;
    }
    void this.run(id).catch((err) => {
      // run() handles its own errors; this is the last line of defence.
      this.logger.error(`Campaign ${id} died: ${describe(err)}`);
    });
    return true;
  }

  /** The send loop. Never throws; releases the slot whatever happens. */
  private async run(id: string): Promise<void> {
    try {
      const campaign = await this.model.findById(id).lean().exec();
      if (!campaign) {
        this.logger.error(`Campaign ${id} vanished before it could start.`);
        return;
      }

      // Read ONCE for the whole campaign: the file does not change mid-send.
      let image: Buffer | null = null;
      if (campaign.imageUrl) {
        try {
          image = await this.loadImage(campaign.imageUrl);
        } catch {
          // The admin chose to send WITH this image; going out without it
          // would be a different campaign from the one they approved.
          await this.pause(id, MSG.imageGone);
          return;
        }
      }
      // A resume clears the reason it was paused for.
      await this.model.updateOne({ _id: id, status: 'sending' }, { $set: { lastError: null } });

      const recipients = campaign.recipients ?? [];
      // Before anything is sent, settle what the time on hold changed: a row
      // the last run took but never recorded, and people who opted out since.
      await this.sweep(id, recipients);
      // Recounted from the rows rather than trusted: a campaign created before
      // pendingCount existed (one caught mid-send by the deploy that added
      // it) has none, and every recorded outcome decrements it.
      await this.model.updateOne(
        { _id: id, status: 'sending' },
        { $set: { pendingCount: recipients.filter((r) => r.status === 'pending').length } },
      );

      const pace = pacing();
      const sentTimes = await this.sentTimesSince(Date.now() - DAY_MS);
      let lastPending = -1;
      recipients.forEach((r, i) => {
        if (r.status === 'pending') lastPending = i;
      });
      let sentThisRun = 0;

      for (let i = 0; i < recipients.length; i += 1) {
        const r = recipients[i];
        if (r.status !== 'pending') continue;

        // Before the checks, so they are fresh when it ends.
        await this.waitForGap(id, pace.minGap);

        const stop = this.stopReason(id, sentTimes);
        if (stop === 'cancel') {
          await this.stopRemaining(id, ['sending']);
          this.logger.log(`Campaign ${id} stopped by an admin.`);
          return;
        }
        if (stop === 'shutdown') return;
        if (stop) {
          await this.pause(id, stop);
          return;
        }

        // Asked again right before every message, not only when the campaign
        // was built: a campaign can take days (it pauses at the daily cap),
        // and somebody who asked to stop in the meantime must not get the
        // rest of it. Outside the send's try on purpose: if the question
        // cannot be answered, the outer catch pauses rather than sending on.
        if (isOptedOut(await this.optOuts(), r.email, r.contactId, r.phone)) {
          await this.record(id, i, 'skipped', SKIP.optedOut);
          continue;
        }

        // Taken BEFORE anything goes out, so a crash or a lost write after
        // WhatsApp took the message cannot lead to sending it again. Only
        // while the campaign is `sending`, which also keeps this runner from
        // sending on a campaign stopped under it.
        if (!(await this.takeRow(id, i))) {
          const now = await this.model.findById(id).select('status').lean().exec();
          if (now?.status !== 'sending') {
            this.logger.log(`Campaign ${id} was closed while sending; stopping.`);
            return;
          }
          throw new Error(`recipient ${i} could not be taken for sending`);
        }

        // What happened, decided first; writing it down comes after, outside
        // this try. Inside it, a bookkeeping write that failed AFTER Mongo
        // applied it would be re-recorded as a failed send.
        const text = r.text || campaign.message;
        let outcome: 'sent' | 'failed' | 'skipped' | 'unsent';
        let reason: string | null = null;
        try {
          const exists = await this.whatsapp.isOnWhatsapp(r.phone);
          if (!exists) {
            // isOnWhatsapp answers false for a dropped session too — that is
            // a campaign to pause, not a person to write off.
            if (!this.whatsapp.isConnected()) {
              outcome = 'unsent';
            } else {
              outcome = 'skipped';
              reason = SKIP.notOnWhatsapp;
            }
          } else if (image) {
            // One message, not two: the text rides as the image's caption.
            await this.whatsapp.sendImage(r.phone, image, text);
            outcome = 'sent';
          } else {
            await this.whatsapp.sendText(r.phone, text);
            outcome = 'sent';
          }
        } catch (err) {
          if (err instanceof BadRequestException) {
            // Refused before anything went out: either the session dropped,
            // or toJid could not address the number.
            if (!this.whatsapp.isConnected()) {
              outcome = 'unsent';
            } else {
              outcome = 'skipped';
              reason = SKIP.invalid;
            }
          } else {
            outcome = 'failed';
            reason = FAIL.notSent;
          }
          this.logger.warn(`Campaign ${id}: ${maskPhone(r.phone)} ${outcome} — ${describe(err)}`);
        }

        if (outcome === 'unsent') {
          // Never messaged, so not failed: the row is given back as untaken
          // and the campaign pauses. A resume reaches them.
          await this.releaseRow(id, i);
          if (this.shuttingDown) return; // the next boot pauses it
          await this.pause(id, MSG.disconnected);
          return;
        }

        // A FAILED send is paced and counted like a sent one: a timeout is not
        // proof the message did not go out, and a failure from WhatsApp
        // throttling is the worst moment to send the next one straight away.
        if (outcome !== 'skipped') {
          this.lastSendAt = Date.now();
          sentTimes.push(Date.now());
        }
        if (outcome === 'sent') sentThisRun += 1;

        // Retried; if it still cannot be written the loop stops here (the
        // outer catch pauses the campaign) rather than sending the next
        // message while the record says less than what happened.
        await this.record(id, i, outcome, reason);

        if (outcome === 'skipped' || i === lastPending) continue;
        await this.sleep(id, between(pace.minGap, pace.maxGap));
        if (outcome === 'sent' && sentThisRun % pace.pauseEvery === 0) {
          await this.sleep(id, between(pace.minPause, pace.maxPause));
        }
      }

      await this.model.updateOne(
        { _id: id, status: 'sending' },
        { $set: { status: 'sent', finishedAt: new Date() } },
      );
      this.logger.log(`Campaign ${id} finished (${sentThisRun} sent this run).`);
    } catch (err) {
      // Paused rather than failed: the recipients are on the record, so once
      // whatever broke is fixed, a resume carries on.
      this.logger.error(`Campaign ${id} aborted: ${describe(err)}`);
      await this.pause(id, MSG.crashed).catch((writeErr) => {
        this.logger.error(`Campaign ${id}: could not record the abort — ${describe(writeErr)}`);
      });
    } finally {
      // Released whatever happened, or no campaign could ever start again.
      this.release(id);
      this.cancelRequested.delete(id);
      this.waker = null;
    }
  }

  /** Checked before every message: null to carry on, 'cancel' or
   * 'shutdown', or the sentence to pause with. */
  private stopReason(id: string, sentTimes: number[]): string | null {
    if (this.shuttingDown) return 'shutdown';
    if (this.cancelRequested.has(id)) return 'cancel';
    // Carrying on without a session would mark every remaining recipient
    // failed when the truth is they were never attempted.
    if (!this.whatsapp.isConnected()) return MSG.disconnected;
    const since = Date.now() - DAY_MS;
    while (sentTimes.length && sentTimes[0] < since) sentTimes.shift();
    const limit = dailyLimit();
    if (sentTimes.length >= limit) return MSG.dailyLimit(limit);
    return null;
  }

  /**
   * Record one recipient's outcome immediately — the record exists to survive
   * a crash mid-campaign. Conditional on the row still being pending, so no
   * outcome is ever counted twice, which is also what makes retrying safe.
   */
  private async markRecipient(
    id: string,
    index: number,
    status: 'sent' | 'failed' | 'skipped',
    reason: string | null,
  ) {
    const counter = status === 'sent' ? 'sentCount' : status === 'failed' ? 'failedCount' : 'skippedCount';
    const at = `recipients.${index}`;
    await this.model.updateOne(
      { _id: id, [`${at}.status`]: 'pending' },
      {
        $set: {
          [`${at}.status`]: status,
          [`${at}.reason`]: reason,
          [`${at}.sentAt`]: status === 'sent' ? new Date() : null,
        },
        $inc: { [counter]: 1, pendingCount: -1 },
      },
    );
  }

  private async record(
    id: string,
    index: number,
    status: 'sent' | 'failed' | 'skipped',
    reason: string | null,
  ) {
    for (let attempt = 0; ; attempt += 1) {
      try {
        await this.markRecipient(id, index, status, reason);
        return;
      } catch (err) {
        if (attempt >= RECORD_RETRY_MS.length) throw err;
        this.logger.warn(`Campaign ${id}: recording recipient ${index} failed, retrying — ${describe(err)}`);
        await new Promise((r) => setTimeout(r, RECORD_RETRY_MS[attempt]));
      }
    }
  }

  /** Mark a pending row as taken for sending, only while the campaign is
   * `sending`. Returns whether it was taken. */
  private async takeRow(id: string, index: number): Promise<boolean> {
    const at = `recipients.${index}`;
    const res = await this.model.updateOne(
      { _id: id, status: 'sending', [`${at}.status`]: 'pending', [`${at}.attemptAt`]: null },
      { $set: { [`${at}.attemptAt`]: new Date() } },
    );
    return res.matchedCount > 0;
  }

  /** Undo takeRow for a row that provably sent nothing. */
  private async releaseRow(id: string, index: number) {
    const at = `recipients.${index}`;
    await this.model.updateOne(
      { _id: id, [`${at}.status`]: 'pending' },
      { $set: { [`${at}.attemptAt`]: null } },
    );
  }

  /** Pause the running campaign — unless a stop landed first, which wins,
   * including one landing during the pause write itself. */
  private async pause(id: string, reason: string) {
    if (!this.cancelRequested.has(id)) {
      await this.model.updateOne(
        { _id: id, status: 'sending' },
        { $set: { status: 'paused', lastError: reason } },
      );
      this.logger.log(`Campaign ${id} paused: ${reason}`);
      if (!this.cancelRequested.has(id)) return;
    }
    await this.stopRemaining(id, ['sending', 'paused']);
  }

  /**
   * Run once before a run sends anything, over the rows it loaded (updated in
   * place, so the loop passes the settled ones by): a row the last run took
   * but never recorded is closed as failed, never re-sent; and anyone who
   * opted out while the campaign waited is skipped now.
   */
  private async sweep(id: string, recipients: BroadcastRecipient[]) {
    if (!recipients.some((r) => r.status === 'pending')) return;
    const optOuts = await this.optOuts();
    for (let i = 0; i < recipients.length; i += 1) {
      const r = recipients[i];
      if (r.status !== 'pending') continue;
      let status: 'failed' | 'skipped';
      let reason: string;
      if (r.attemptAt) {
        status = 'failed';
        reason = FAIL.unknown;
      } else if (isOptedOut(optOuts, r.email, r.contactId, r.phone)) {
        status = 'skipped';
        reason = SKIP.optedOut;
      } else {
        continue;
      }
      await this.record(id, i, status, reason);
      r.status = status;
    }
  }

  /**
   * Hold the minimum gap since the last campaign message, whichever campaign
   * sent it. The gaps inside a run already cover it; this is for a run's first
   * message — without it, stop-then-start in a loop would send every few
   * seconds. Interruptible like any gap.
   */
  private async waitForGap(id: string, minGap: number) {
    if (this.lastSendAt === null) return;
    const wait = this.lastSendAt + minGap - Date.now();
    if (wait > 0) await this.sleep(id, wait);
  }

  /**
   * Close a campaign: every pending recipient becomes skipped "Campaign
   * stopped", in one write, only if the campaign is still in one of `from`.
   * A pending row already taken for sending may have gone out, so it is
   * closed as failed with that said. Returns whether it applied.
   */
  private async stopRemaining(id: string, from: BroadcastStatus[]): Promise<boolean> {
    const doc = await this.model
      .findById(id)
      .select('status recipients.status recipients.attemptAt')
      .lean()
      .exec();
    if (!doc || !from.includes(doc.status)) return false;
    const set: Record<string, unknown> = { status: 'cancelled', finishedAt: new Date(), pendingCount: 0 };
    const filter: Record<string, unknown> = { _id: id, status: doc.status };
    let stopped = 0;
    let unknown = 0;
    (doc.recipients ?? []).forEach((r, i) => {
      if (r.status !== 'pending') return;
      if (r.attemptAt) {
        set[`recipients.${i}.status`] = 'failed';
        set[`recipients.${i}.reason`] = FAIL.unknown;
        unknown += 1;
      } else {
        set[`recipients.${i}.status`] = 'skipped';
        set[`recipients.${i}.reason`] = SKIP.stopped;
        stopped += 1;
      }
      // Only rows still pending at write time, so a row the runner has just
      // recorded is never overwritten or counted twice.
      filter[`recipients.${i}.status`] = 'pending';
    });
    const res = await this.model.updateOne(filter, {
      $set: set,
      $inc: { skippedCount: stopped, failedCount: unknown },
    });
    return res.matchedCount > 0;
  }

  /** Flag the runner to stop, wake it if it is waiting out a gap, and give it
   * a moment to close itself. */
  private async askRunnerToStop(id: string) {
    this.cancelRequested.add(id);
    this.waker?.();
    const until = Date.now() + CANCEL_SETTLE_MS;
    while (this.running === id && Date.now() < until) {
      await new Promise((r) => setTimeout(r, 100));
    }
  }

  /** A pacing wait that a stop (or shutdown) can cut short. */
  private sleep(id: string, ms: number): Promise<void> {
    if (this.cancelRequested.has(id) || this.shuttingDown) return Promise.resolve();
    return new Promise((resolve) => {
      const done = () => {
        clearTimeout(timer);
        if (this.waker === done) this.waker = null;
        resolve();
      };
      const timer = setTimeout(done, ms);
      this.waker = done;
    });
  }

  /**
   * When campaign messages went out (or may have), oldest first, since
   * `since` — what the rolling daily cap counts. A failed send and a row taken
   * but never recorded count too: the cap is the ban protection, so it must
   * not undercount.
   */
  private async sentTimesSince(since: number): Promise<number[]> {
    const from = new Date(since);
    const docs = await this.model
      .find({
        $or: [{ 'recipients.sentAt': { $gte: from } }, { 'recipients.attemptAt': { $gte: from } }],
      })
      .select('recipients.status recipients.sentAt recipients.attemptAt')
      .lean()
      .exec();
    const times: number[] = [];
    for (const doc of docs) {
      for (const r of doc.recipients ?? []) {
        if (r.status === 'skipped') continue;
        const when = r.status === 'sent' ? (r.sentAt ?? r.attemptAt) : r.attemptAt;
        const at = when ? new Date(when).getTime() : NaN;
        if (Number.isFinite(at) && at >= since) times.push(at);
      }
    }
    return times.sort((a, b) => a - b);
  }

  private async findDoc(id: string, withRecipients: boolean) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid campaign id');
    const query = this.model.findById(id);
    if (!withRecipients) query.select('-recipients');
    const doc = await query.lean().exec();
    if (!doc) throw new NotFoundException('No such campaign');
    return doc;
  }

  // ── The image ────────────────────────────────────────────────────────────

  /**
   * The file a campaign image path names. The DTO already pins its shape, but
   * this decides which file the server reads off its own disk, so it is
   * checked again where it is used: resolve it, and refuse anything that does
   * not land inside uploads/whatsapp.
   */
  private imagePath(imageUrl: string): string {
    const name = imageUrl.replace(/^\/uploads\/whatsapp\//, '');
    const root = resolve(IMAGE_ROOT);
    const full = resolve(root, name);
    if (!full.startsWith(root + sep)) throw new BadRequestException('That image is not one of ours.');
    return full;
  }

  /** That the image is there — without reading five megabytes to find out. */
  private async assertImageUsable(imageUrl: string): Promise<void> {
    try {
      await access(this.imagePath(imageUrl), fsConstants.R_OK);
    } catch {
      throw new BadRequestException('That image is no longer on the server. Upload it again before sending.');
    }
  }

  private async loadImage(imageUrl: string): Promise<Buffer> {
    try {
      return await readFile(this.imagePath(imageUrl));
    } catch {
      throw new BadRequestException('That image is no longer on the server. Upload it again before sending.');
    }
  }
}

// ── Module-level helpers ───────────────────────────────────────────────────

/**
 * Whether any opted-out contact matches this recipient — by contact, by
 * address, or by number. Numbers match on their last eight digits when both
 * have at least eight, because the same Singapore mobile is stored as
 * "9123 4567" on one contact and "+65 9123 4567" on another. Erring towards a
 * match is the right way round for an opt-out.
 */
function isOptedOut(o: OptOuts, email: string, contactId: string | null, phone: string): boolean {
  if (contactId && o.contactIds.has(contactId)) return true;
  if (email && o.emails.has(email.toLowerCase())) return true;
  const d = (phone || '').replace(/\D/g, '');
  if (d.length < MIN_DIGITS) return false;
  const tail = d.slice(-8);
  return o.digits.some((x) => x === d || x.slice(-8) === tail);
}

/**
 * Two rows are the same person when the digits match. The first occurrence
 * wins, WITH ONE OVERRIDE: a skip always survives the merge, so an opt-out
 * recorded against any row for a number is an opt-out for that number.
 */
function dedupeByDigits(rows: Draft[]): Draft[] {
  const kept = new Map<string, Draft>();
  const out: Draft[] = [];
  for (const r of rows) {
    const digits = r.phone.replace(/\D/g, '');
    // Rows with no number cannot collide and are all kept, so the report still
    // accounts for every person in the audience.
    if (!digits) {
      out.push(r);
      continue;
    }
    const first = kept.get(digits);
    if (!first) {
      kept.set(digits, r);
      out.push(r);
      continue;
    }
    if (first.status === 'pending' && r.status === 'skipped') {
      first.status = 'skipped';
      first.reason = r.reason;
    }
  }
  return out;
}

/** Minutes a campaign of `count` messages takes at the configured pacing, on
 * average. The daily cap may stretch it over days; that is shown apart. */
function estimateMinutes(count: number): number {
  if (count <= 0) return 0;
  const pace = pacing();
  const gap = (pace.minGap + pace.maxGap) / 2;
  const pause = (pace.minPause + pace.maxPause) / 2;
  const pauses = Math.floor((count - 1) / pace.pauseEvery);
  // At least a minute: "0 minutes" reads as "nothing will happen".
  return Math.max(1, Math.ceil(((count - 1) * gap + pauses * pause) / 60_000));
}

/** Last three digits only. Campaign logs and pages are read by a wider group
 * than whoever can read the CRM. */
function maskPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length <= 3) return '***';
  return `***${digits.slice(-3)}`;
}

/** An error for the log, with anything that looks like a phone number cut to
 * its last four digits. */
function describe(err: unknown): string {
  const text = err instanceof Error ? err.message : String(err);
  return text.replace(/\d{7,}/g, (d) => `…${d.slice(-4)}`);
}
