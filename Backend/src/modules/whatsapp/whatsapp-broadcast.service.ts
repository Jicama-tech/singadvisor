import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
import { SendBroadcastDto } from './dto/send-broadcast.dto';
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

@Injectable()
export class WhatsappBroadcastService {
  private readonly logger = new Logger(WhatsappBroadcastService.name);

  /** The campaign currently going out. One at a time: two campaigns
   * interleaving would double the send rate that the pacing above exists to
   * hold down. */
  private running: string | null = null;

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
   * Who a campaign would reach, without sending anything.
   *
   * The admin sees this before committing. A marketing send cannot be recalled,
   * so the count and the first names are shown while it is still a decision.
   */
  async preview(dto: SendBroadcastDto) {
    const recipients = await this.buildAudience(dto);
    return {
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
      rows.push({
        phone: (phone || '').trim(),
        name: name || '',
        email: email || '',
        status: skip ? 'skipped' : 'pending',
        reason: skip ?? null,
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
      message: dto.message,
      audience: dto.audience,
      tag: dto.tag ?? null,
      recipients,
      status: 'queued',
      sentFrom: this.whatsapp.getState().number,
      skippedCount: recipients.length - sendable.length,
      createdBy,
    });

    this.running = String(campaign._id);
    // Deliberately not awaited: see the docblock.
    void this.run(String(campaign._id)).catch((err) => {
      this.logger.error(`Campaign ${String(campaign._id)} died: ${describe(err)}`);
    });

    return { id: String(campaign._id), queued: sendable.length, skipped: recipients.length - sendable.length };
  }

  /** The actual send loop. */
  private async run(id: string) {
    try {
      await this.model.updateOne({ _id: id }, { $set: { status: 'sending', startedAt: new Date() } });

      const campaign = await this.model.findById(id).exec();
      if (!campaign) return;

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

        try {
          const onWhatsapp = await this.whatsapp.isOnWhatsapp(r.phone);
          if (!onWhatsapp) {
            await this.markRecipient(id, i, 'skipped', 'That number is not on WhatsApp');
            continue;
          }
          await this.whatsapp.sendText(r.phone, campaign.message);
          await this.markRecipient(id, i, 'sent', null);
        } catch (err) {
          await this.markRecipient(id, i, 'failed', describe(err));
          this.logger.warn(`Campaign ${id}: ${maskPhone(r.phone)} failed — ${describe(err)}`);
        }

        // Between every message, including after the last — cheaper than
        // working out whether anyone is left.
        await sleep(MIN_GAP_MS + Math.floor(Math.random() * (MAX_GAP_MS - MIN_GAP_MS)));
      }

      await this.model.updateOne({ _id: id }, { $set: { status: 'sent', finishedAt: new Date() } });
      this.logger.log(`Campaign ${id} finished.`);
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

/** Two rows are the same person when the digits match — "+65 9123 4567" and
 * "6591234567" are one number. The first occurrence wins, so a row with a real
 * name is kept over a bare number where the ordering puts it first. */
function dedupeByDigits(rows: BroadcastRecipient[]): BroadcastRecipient[] {
  const seen = new Set<string>();
  const out: BroadcastRecipient[] = [];
  for (const r of rows) {
    const digits = r.phone.replace(/\D/g, '');
    // Rows with no number cannot collide and are all kept, so the report still
    // accounts for every person in the audience.
    if (digits && seen.has(digits)) continue;
    if (digits) seen.add(digits);
    out.push(r);
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
