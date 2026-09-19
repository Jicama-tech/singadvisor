import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
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
} from './entities/whatsapp-broadcast.entity';
import { access, readFile } from 'fs/promises';
import { constants as fsConstants } from 'fs';
import { join, resolve, sep } from 'path';
import { SendBroadcastDto } from './dto/send-broadcast.dto';
import { htmlToWhatsapp } from './html-to-whatsapp';
import { WhatsappService } from './whatsapp.service';

/**
 * Sending one message to many people, slowly and on purpose.
 *
 * PACE IS THE WHOLE DESIGN. Baileys sends as a linked device of a real
 * WhatsApp account, and WhatsApp bans accounts that behave like bulk senders:
 * a burst of identical messages to numbers that have never replied is the
 * exact signature. So a campaign here is not a loop over sendMessage. It
 * waits between every message, jitters the wait so the spacing is not
 * machine-regular, checks each number is actually on WhatsApp first, and
 * stops entirely if the session drops.
 *
 * The number being risked belongs to the business, and losing it means losing
 * the account — not just this feature. That is why the delay is not
 * configurable down to zero.
 */

/** Between messages. Enough to look human, short enough that a few hundred
 * recipients finish within an hour. */
const MIN_GAP_MS = 4_000;
const MAX_GAP_MS = 9_000;

/** Per campaign. Not a technical limit — a deliberate ceiling, because a list
 * bigger than this should be going out by email, and a mistake at this size
 * is one nobody can take back. */
const MAX_RECIPIENTS = 500;

/** Fewer digits than this and WhatsApp cannot address the number at all —
 * the same threshold WhatsappService.toJid rejects on, kept in step with it. */
const MIN_DIGITS = 8;

/** WhatsApp's own limits: 4096 for a text message, 1024 for an image caption.
 * A campaign with an image is bound by the smaller one. */
const MAX_TEXT = 4096;
const MAX_CAPTION = 1024;

/** Every campaign image lives here and nowhere else. */
const IMAGE_ROOT = join(process.cwd(), 'uploads', 'whatsapp');

/**
 * Held by send() from the moment it decides to start, before it has an id to
 * hold the slot under.
 *
 * buildAudience() and create() both await, and an await is where a second
 * request gets to run. Setting `running` only after them left a window in
 * which two POSTs both read `null`, both passed the check, and both started —
 * exactly the doubled send rate the pacing exists to prevent.
 */
const CLAIMING = '__claiming__';

@Injectable()
export class WhatsappBroadcastService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappBroadcastService.name);

  /** The campaign currently going out. One at a time: two campaigns
   * interleaving would double the send rate that the pacing above exists to
   * hold down. */
  private running: string | null = null;

  /**
   * Close off campaigns the last process was part-way through.
   *
   * A campaign lives in this process's memory — `running` above, and the loop
   * in run(). A restart mid-send loses both, and the row is left reading
   * 'sending' for ever: the admin list shows it in flight and polls every four
   * seconds for as long as it says so.
   *
   * Nothing is resumed. Recipients still marked 'pending' were never
   * attempted, and picking the loop back up minutes or days later would
   * deliver half a campaign out of context; the honest move is to close the
   * row and let the admin decide. Per-recipient rows still say exactly who
   * already got it, which is what a resend needs.
   *
   * Safe to do unconditionally because the deploy runs ONE backend process
   * (Deployment/autodeploy.sh: `pm2 restart singadvisor-backend`, fork mode).
   * Under a second instance this would mark a live campaign failed — gate it
   * on an owner/lease field before scaling out.
   */
  async onModuleInit() {
    try {
      const res = await this.model.updateMany(
        { status: { $in: ['queued', 'sending'] } },
        {
          $set: {
            status: 'failed',
            finishedAt: new Date(),
            lastError:
              'The server restarted part-way through. Recipients still marked pending were never messaged.',
          },
        },
      );
      if (res.modifiedCount > 0) {
        this.logger.warn(
          `Closed ${res.modifiedCount} WhatsApp campaign(s) left mid-send by a restart.`,
        );
      }
    } catch (err) {
      // Bookkeeping. It must never stop the app booting.
      this.logger.warn(`Could not reconcile interrupted campaigns: ${describe(err)}`);
    }
  }

  constructor(
    @InjectModel(WhatsappBroadcast.name)
    private readonly model: Model<WhatsappBroadcastDocument>,
    @InjectModel(Contact.name)
    private readonly contacts: Model<ContactDocument>,
    @InjectModel(Membership.name)
    private readonly memberships: Model<MembershipDocument>,
    private readonly whatsapp: WhatsappService,
  ) {}

  list() {
    // Recipient arrays get long; the list view needs counts, not rows.
    return this.model.find().select('-recipients').sort({ createdAt: -1 }).limit(100).lean().exec();
  }

  async findOne(id: string) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid campaign id');
    const doc = await this.model.findById(id).lean().exec();
    if (!doc) throw new NotFoundException('No such campaign');
    return doc;
  }

  /**
   * The text WhatsApp will receive, from whichever field the client sent.
   *
   * Conversion happens HERE rather than in the browser so that the stored
   * `message` is provably the thing that went out, and so a client that posts
   * straight to the API cannot store one message and send another.
   */
  private resolveMessage(dto: SendBroadcastDto): string {
    const text = dto.messageHtml ? htmlToWhatsapp(dto.messageHtml) : (dto.message ?? '').trim();
    if (!text) {
      throw new BadRequestException('Write a message first.');
    }
    // The cap depends on whether an image is going with it — a caption is
    // limited to a quarter of what a plain message allows, and WhatsApp
    // rejects the whole send rather than truncating.
    const cap = dto.imageUrl ? MAX_CAPTION : MAX_TEXT;
    if (text.length > cap) {
      throw new BadRequestException(
        dto.imageUrl
          ? `With an image attached the message can be ${MAX_CAPTION} characters; this one is ${text.length}. WhatsApp limits an image caption.`
          : `The message can be ${MAX_TEXT} characters; this one is ${text.length}.`,
      );
    }
    return text;
  }

  /**
   * The bytes of a campaign's image, or null.
   *
   * The DTO already pins the shape of the path, but this decides which file
   * the server reads off its own disk, so it is checked again where it is
   * used: resolve it, and refuse anything that does not land inside
   * uploads/whatsapp. Two independent checks, because a regex is a poor place
   * to rest a file-read primitive on its own.
   */
  private imagePath(imageUrl: string): string {
    const name = imageUrl.replace(/^\/uploads\/whatsapp\//, '');
    // resolve() collapses any "..", so a name that tries to climb out lands
    // somewhere that is no longer under the root — which is what is checked.
    const root = resolve(IMAGE_ROOT);
    const full = resolve(root, name);
    if (!full.startsWith(root + sep)) {
      throw new BadRequestException('That image is not one of ours.');
    }
    return full;
  }

  /**
   * That the image is where it says it is — without reading it.
   *
   * Preview calls this so a campaign whose upload has gone missing fails
   * while it is still a draft. Reading the bytes to find that out would pull
   * a five-megabyte file into memory for a question `access` answers.
   */
  private async assertImageUsable(imageUrl: string): Promise<void> {
    const full = this.imagePath(imageUrl);
    try {
      await access(full, fsConstants.R_OK);
    } catch {
      throw new BadRequestException(
        'That image is no longer on the server. Upload it again before sending.',
      );
    }
  }

  private async loadImage(imageUrl: string): Promise<Buffer> {
    const full = this.imagePath(imageUrl);
    try {
      return await readFile(full);
    } catch {
      throw new BadRequestException(
        'That image is no longer on the server. Upload it again before sending.',
      );
    }
  }

  /**
   * Who a campaign would reach, without sending anything.
   *
   * The admin sees this before committing. A marketing send cannot be recalled,
   * so the count and the first names are shown while it is still a decision.
   */
  async preview(dto: SendBroadcastDto) {
    // Converted here too, so a message that is too long for a caption is
    // caught while it is still a draft rather than at the moment of sending.
    const message = this.resolveMessage(dto);
    // Checked here too: an upload that has since been removed should fail on
    // the preview button, not at the moment of sending to two hundred people.
    if (dto.imageUrl) await this.assertImageUsable(dto.imageUrl);
    const recipients = await this.buildAudience(dto);
    return {
      // Exactly what WhatsApp will receive, markers and newlines and all, so
      // the composer can show it rather than describe it.
      message,
      hasImage: !!dto.imageUrl,
      total: recipients.length,
      willSend: recipients.filter((r) => r.status === 'pending').length,
      willSkip: recipients.filter((r) => r.status === 'skipped').length,
      // Enough to recognise the list, not the whole thing.
      sample: recipients.slice(0, 10).map((r) => ({
        name: r.name,
        phone: maskPhone(r.phone),
        status: r.status,
        reason: r.reason,
      })),
    };
  }

  /**
   * Resolve an audience to a fixed list.
   *
   * Everything that disqualifies a recipient is recorded as a `skipped` row
   * with a reason rather than filtered away, so the campaign can answer "why
   * didn't X get it".
   */
  private async buildAudience(dto: SendBroadcastDto): Promise<BroadcastRecipient[]> {
    const rows: BroadcastRecipient[] = [];

    const push = (
      phone: string,
      name: string,
      email: string,
      skip?: string,
    ) => {
      const clean = (phone || '').trim();
      // A number WhatsApp cannot address is a skip decided here, not a send
      // left to fail later. It has to be caught at build time because nothing
      // downstream reports it: isOnWhatsapp() answers `true` when its lookup
      // throws, and toJid's "no country code" rejection is thrown from inside
      // that very try. Left to run(), an unusable number is counted in
      // `willSend`, burns its four-to-nine seconds of pacing, and is recorded
      // as a failed send rather than a number that was never a number.
      const unusable = !skip && clean !== '' && clean.replace(/\D/g, '').length < MIN_DIGITS;
      rows.push({
        phone: clean,
        name: name || '',
        email: email || '',
        status: skip || unusable ? 'skipped' : 'pending',
        reason: skip ?? (unusable ? 'Not a usable number — include the country code' : null),
        sentAt: null,
      });
    };

    if (dto.audience === 'manual') {
      const numbers = (dto.numbers ?? []).map((n) => n.trim()).filter(Boolean);
      if (numbers.length === 0) {
        throw new BadRequestException('Add at least one number.');
      }
      for (const n of numbers) push(n, '', '');
    } else if (dto.audience === 'members') {
      // Active members only. Somebody whose membership lapsed did not agree to
      // keep hearing from us on WhatsApp.
      const members = await this.memberships
        .find(activeMembershipFilter())
        .select('email name phone')
        .lean()
        .exec();
      // The opt-out lives on the CRM contact, which is keyed by email.
      const optedOut = await this.optedOutEmails(members.map((m) => m.email));
      for (const m of members) {
        if (!m.phone) push('', m.name, m.email, 'No phone number on the membership');
        else if (optedOut.has(m.email.toLowerCase()))
          push(m.phone, m.name, m.email, 'Opted out of WhatsApp marketing');
        else push(m.phone, m.name, m.email);
      }
    } else {
      // 'contacts' and 'tag' are the same query with one extra condition.
      const filter: Record<string, unknown> = {};
      if (dto.audience === 'tag') {
        if (!dto.tag) throw new BadRequestException('Choose a tag.');
        filter.tags = dto.tag;
      }
      const contacts = await this.contacts
        .find(filter)
        .select('email name phone whatsapp whatsappOptOut')
        .lean()
        .exec();
      for (const c of contacts) {
        // `whatsapp` wins over `phone`: it exists precisely because the number
        // somebody answers calls on is not always the one on WhatsApp.
        const number = (c.whatsapp || c.phone || '').trim();
        if (!number) push('', c.name, c.email, 'No phone number on the contact');
        else if (c.whatsappOptOut) push(number, c.name, c.email, 'Opted out of WhatsApp marketing');
        else push(number, c.name, c.email);
      }
    }

    // The same person reachable twice — a member who is also a tagged contact —
    // must not be messaged twice.
    return dedupeByDigits(rows);
  }

  private async optedOutEmails(emails: string[]): Promise<Set<string>> {
    if (emails.length === 0) return new Set();
    const rows = await this.contacts
      .find({ email: { $in: emails.map((e) => e.toLowerCase()) }, whatsappOptOut: true })
      .select('email')
      .lean()
      .exec();
    return new Set(rows.map((r) => r.email.toLowerCase()));
  }

  /**
   * Create the campaign and start sending.
   *
   * Returns as soon as the record exists — the send itself runs on after the
   * response, and the admin watches it through findOne(). An HTTP request held
   * open for the twenty minutes a 200-person campaign takes would be timed out
   * by nginx long before it finished.
   */
  async send(dto: SendBroadcastDto, createdBy: string) {
    if (!this.whatsapp.isConnected()) {
      throw new BadRequestException('WhatsApp is not connected. Pair a phone in Settings first.');
    }
    if (this.running) {
      throw new BadRequestException(
        'A campaign is already going out. Wait for it to finish before starting another.',
      );
    }

    // Claimed HERE, before the first await. Everything below yields to the
    // event loop at least twice, and a second POST landing in one of those
    // gaps would otherwise read `running` as null and start alongside this
    // one. See CLAIMING.
    this.running = CLAIMING;
    let handedOff = false;
    try {
      // Both before the audience work and before any row is written: a
      // message too long for its cap, or an image no longer on disk, must
      // fail while this is still a request — not half-way through a send.
      const message = this.resolveMessage(dto);
      if (dto.imageUrl) await this.loadImage(dto.imageUrl);

      const recipients = await this.buildAudience(dto);
      const sendable = recipients.filter((r) => r.status === 'pending');
      if (sendable.length === 0) {
        throw new BadRequestException('Nobody in that audience has a number we can message.');
      }
      if (sendable.length > MAX_RECIPIENTS) {
        throw new BadRequestException(
          `That audience is ${sendable.length} people; the limit for one campaign is ${MAX_RECIPIENTS}.`,
        );
      }

      const campaign = await this.model.create({
        name: dto.name,
        message,
        messageHtml: dto.messageHtml ?? '',
        imageUrl: dto.imageUrl ?? null,
        audience: dto.audience,
        tag: dto.tag ?? null,
        recipients,
        status: 'queued',
        sentFrom: this.whatsapp.getState().number,
        skippedCount: recipients.length - sendable.length,
        createdBy,
      });

      this.running = String(campaign._id);
      handedOff = true;
      // Deliberately not awaited: see the docblock.
      void this.run(String(campaign._id)).catch((err) => {
        this.logger.error(`Campaign ${String(campaign._id)} died: ${describe(err)}`);
      });

      return {
        id: String(campaign._id),
        queued: sendable.length,
        skipped: recipients.length - sendable.length,
      };
    } finally {
      // Nothing took ownership — a rejected audience, or a failed insert — so
      // the claim is given back here. Once run() has it, run()'s own finally
      // is what releases it.
      if (!handedOff && this.running === CLAIMING) this.running = null;
    }
  }

  /** The actual send loop. */
  private async run(id: string) {
    try {
      await this.model.updateOne({ _id: id }, { $set: { status: 'sending', startedAt: new Date() } });

      const campaign = await this.model.findById(id).exec();
      if (!campaign) {
        this.logger.error(`Campaign ${id} vanished before it could start.`);
        return;
      }

      // Read ONCE for the whole campaign rather than per recipient: the file
      // does not change mid-send, and re-reading it five hundred times is
      // five hundred disk reads for the same bytes.
      const image = campaign.imageUrl ? await this.loadImage(campaign.imageUrl) : null;

      for (let i = 0; i < campaign.recipients.length; i += 1) {
        const r = campaign.recipients[i];
        if (r.status !== 'pending') continue;

        // A session that dropped mid-campaign stops it. Carrying on would
        // throw on every remaining recipient and mark them all failed, when
        // the truth is they were never attempted.
        if (!this.whatsapp.isConnected()) {
          await this.model.updateOne(
            { _id: id },
            {
              $set: {
                status: 'failed',
                finishedAt: new Date(),
                lastError: 'The WhatsApp connection dropped part-way through.',
              },
            },
          );
          this.logger.error(`Campaign ${id} stopped: WhatsApp disconnected.`);
          return;
        }

        // What happened, decided first; writing it down comes after. The two
        // are separated on purpose — see the write below.
        let outcome: 'sent' | 'failed' | 'skipped';
        let reason: string | null = null;
        try {
          if (!(await this.whatsapp.isOnWhatsapp(r.phone))) {
            outcome = 'skipped';
            reason = 'That number is not on WhatsApp';
          } else {
            await this.whatsapp.sendText(r.phone, campaign.message);
            outcome = 'sent';
          }
        } catch (err) {
          outcome = 'failed';
          reason = describe(err);
          this.logger.warn(`Campaign ${id}: ${maskPhone(r.phone)} failed — ${describe(err)}`);
        }

        // Outside the try, because this write is bookkeeping and not the send.
        // Inside it, a write that failed AFTER Mongo applied it — a dropped
        // ack, a reconnect — was caught and re-recorded as 'failed': both
        // sentCount and failedCount incremented for one message, and a
        // message that did go out filed as one that did not. And a write that
        // failed while already recording a failure escaped the loop entirely,
        // abandoning every recipient after it.
        try {
          await this.markRecipient(id, i, outcome, reason);
        } catch (err) {
          this.logger.error(
            `Campaign ${id}: ${maskPhone(r.phone)} was ${outcome}, but recording it failed — ${describe(err)}`,
          );
        }

        // Unchanged from the original `continue`: a number that turned out
        // not to be on WhatsApp got a lookup, not a message, and the gap
        // below paces messages.
        if (outcome === 'skipped') continue;

        // Between every message, including after the last — cheaper than
        // working out whether anyone is left.
        await sleep(MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS)));
      }

      await this.model.updateOne({ _id: id }, { $set: { status: 'sent', finishedAt: new Date() } });
      this.logger.log(`Campaign ${id} finished.`);
    } catch (err) {
      // Everything above outside the per-send try — the status write, the
      // reload, the disconnect write — used to have no handler at all. A
      // failure there left the campaign reading 'queued' or 'sending' for
      // ever, with no finishedAt, no lastError, and an admin list polling
      // every four seconds because a row still claimed to be in flight.
      this.logger.error(`Campaign ${id} aborted: ${describe(err)}`);
      await this.model
        .updateOne(
          { _id: id },
          { $set: { status: 'failed', finishedAt: new Date(), lastError: describe(err) } },
        )
        .catch((writeErr) => {
          this.logger.error(`Campaign ${id}: could not even record the abort — ${describe(writeErr)}`);
        });
    } finally {
      // Released whatever happened, or no campaign could ever start again.
      if (this.running === id) this.running = null;
    }
  }

  /**
   * Record one recipient's outcome, immediately.
   *
   * Written per message rather than batched at the end: the point of the
   * record is to survive a crash mid-campaign, and a batch at the end is
   * exactly the thing a crash loses.
   */
  private async markRecipient(
    id: string,
    index: number,
    status: 'sent' | 'failed' | 'skipped',
    reason: string | null,
  ) {
    const counter =
      status === 'sent' ? 'sentCount' : status === 'failed' ? 'failedCount' : 'skippedCount';
    await this.model.updateOne(
      { _id: id },
      {
        $set: {
          [`recipients.${index}.status`]: status,
          [`recipients.${index}.reason`]: reason,
          [`recipients.${index}.sentAt`]: status === 'sent' ? new Date() : null,
        },
        $inc: { [counter]: 1 },
      },
    );
  }
}

/**
 * Two rows are the same person when the digits match — "+65 9123 4567" and
 * "6591234567" are one number. The first occurrence wins, so a row with a real
 * name is kept over a bare number where the ordering puts it first.
 *
 * WITH ONE OVERRIDE: a skip always survives the merge. Contacts are keyed by
 * email and one person routinely has two — a work address and a personal one —
 * so the same number can arrive on two rows with different opt-out flags.
 * First-occurrence-wins alone would drop the opted-out row and message the
 * number anyway, with no skipped row left in the record to say why. An opt-out
 * recorded against any row for a number is an opt-out for that number.
 */
function dedupeByDigits(rows: BroadcastRecipient[]): BroadcastRecipient[] {
  const kept = new Map<string, BroadcastRecipient>();
  const out: BroadcastRecipient[] = [];
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
    // Same number, already kept. Drop this row, but not its reason for not
    // being messaged — mutating the kept row in place is what carries the
    // skip into `out`, which holds that same object.
    if (first.status === 'pending' && r.status === 'skipped') {
      first.status = 'skipped';
      first.reason = r.reason;
    }
  }
  return out;
}

/** Last three digits only. Campaign logs are read by whoever can read the
 * server's logs, which is a wider group than whoever can read the CRM. */
function maskPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.length <= 3) return '***';
  return `***${digits.slice(-3)}`;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
