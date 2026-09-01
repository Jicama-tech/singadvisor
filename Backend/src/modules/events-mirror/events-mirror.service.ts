import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  EventMirrorSource,
  EventshEventMirror,
  EventshEventMirrorDocument,
} from './entities/eventsh-event.entity';

/**
 * Keeps SingAdvisor's own database holding a copy of every eventsh event.
 *
 * Two paths, deliberately overlapping:
 *
 *  1. Write-through — eventsh-proxy calls `mirrorFromResponse` / `remove` the
 *     moment a create/update/delete it forwarded comes back successful. This
 *     is the fast path: the local copy exists before the admin's save even
 *     returns.
 *
 *  2. Reconcile — `reconcile()` pulls the organizer's complete event list from
 *     eventsh and upserts all of it, on boot and hourly. This is what turns
 *     "usually mirrored" into "mirrored": it repairs anything the write-through
 *     path missed (Backend restarting mid-save, a transient Mongo blip) and it
 *     is the only way events created directly in eventsh's own organizer UI —
 *     which never touch this Backend — reach the mirror at all.
 *
 * Nothing here modifies eventsh. Reconcile uses the same read endpoint the
 * admin event list already calls.
 *
 * Every method is failure-tolerant by design: mirroring is bookkeeping, and it
 * must never turn a successful save into an error the organizer sees, nor stop
 * the Backend from booting.
 */
@Injectable()
export class EventsMirrorService implements OnApplicationBootstrap {
  private readonly logger = new Logger(EventsMirrorService.name);

  constructor(
    @InjectModel(EventshEventMirror.name)
    private readonly mirrorModel: Model<EventshEventMirrorDocument>,
  ) {}

  private config(): { url: string; organizerId: string; apiKey: string } | null {
    const url = process.env.EVENTSH_BACKEND_URL;
    const organizerId = process.env.EVENTSH_ORGANIZER_ID;
    const apiKey = process.env.EVENTSH_API_KEY;
    if (!url || !organizerId || !apiKey) return null;
    return { url, organizerId, apiKey };
  }

  // --------------------------------------------------------------------
  // Write-through, driven by eventsh-proxy
  // --------------------------------------------------------------------

  /**
   * Mirrors the event out of an eventsh create/update response body.
   *
   * eventsh wraps those in `{ success, message, data }` but returns some
   * documents bare — both shapes are unwrapped here, same as the SPA's own
   * `unwrapEventshEvent`.
   *
   * Returns nothing and throws nothing: the caller is mid-request, forwarding
   * a response the organizer is waiting on.
   */
  async mirrorFromResponse(body: unknown, source: EventMirrorSource): Promise<void> {
    const doc = unwrapEventshEvent(body);
    if (!doc) return;
    await this.upsert(doc, source);
  }

  /** Drops an event's mirror row after eventsh confirmed the delete. */
  async remove(eventshId: string): Promise<void> {
    try {
      await this.mirrorModel.deleteOne({ _id: eventshId }).exec();
    } catch (err: any) {
      this.logger.warn(
        `Could not remove mirrored event ${eventshId}: ${err?.message}. The next reconcile will prune it.`,
      );
    }
  }

  // --------------------------------------------------------------------
  // Reconcile
  // --------------------------------------------------------------------

  async onApplicationBootstrap() {
    // Deliberately not awaited: a slow or unreachable eventsh must not hold
    // up the Backend's boot. Failures are logged inside reconcile().
    void this.reconcile();
  }

  @Cron(CronExpression.EVERY_HOUR)
  async scheduledReconcile() {
    await this.reconcile();
  }

  /**
   * Pulls every event eventsh has for the configured organizer and upserts all
   * of them, then prunes mirror rows for events that no longer exist upstream.
   *
   * `publicOnly=false` is load-bearing — the mirror is a copy of everything the
   * organizer owns, drafts and private events included, not of what the public
   * storefront can see.
   */
  async reconcile(): Promise<
    { skipped: true; reason: string } | { skipped: false; upserted: number; pruned: number }
  > {
    const config = this.config();
    if (!config) {
      return { skipped: true, reason: 'eventsh is not configured on this Backend' };
    }
    const { url, organizerId, apiKey } = config;

    let events: Record<string, unknown>[];
    try {
      const response = await fetch(
        `${url}/events/organizer/${organizerId}?publicOnly=false`,
        { headers: { 'x-organizer-id': organizerId, 'x-api-key': apiKey } },
      );
      if (!response.ok) {
        this.logger.warn(
          `Reconcile skipped: eventsh returned ${response.status} for the organizer event list.`,
        );
        return { skipped: true, reason: `upstream ${response.status}` };
      }
      const body = (await response.json()) as { data?: unknown };
      if (!Array.isArray(body?.data)) {
        this.logger.warn('Reconcile skipped: eventsh returned no `data` array.');
        return { skipped: true, reason: 'unexpected response shape' };
      }
      events = body.data as Record<string, unknown>[];
    } catch (err: any) {
      // An eventsh outage is not this Backend's problem to escalate — the
      // existing mirror stays as it is and the next run picks up.
      this.logger.warn(`Reconcile skipped: eventsh is unreachable (${err?.message}).`);
      return { skipped: true, reason: 'unreachable' };
    }

    let upserted = 0;
    const seen: string[] = [];
    for (const event of events) {
      const id = idOf(event);
      if (!id) continue;
      seen.push(id);
      if (await this.upsert(event, 'reconcile')) upserted += 1;
    }

    const pruned = await this.prune(seen);
    if (upserted || pruned) {
      this.logger.log(`Event mirror reconciled: ${upserted} upserted, ${pruned} pruned.`);
    }
    return { skipped: false, upserted, pruned };
  }

  /**
   * Removes mirror rows for events eventsh no longer has — an event deleted
   * directly in eventsh's own UI leaves no other trace here.
   *
   * Refuses to prune on an empty list. An organizer genuinely having zero
   * events is rare and self-corrects on the next write, whereas an upstream
   * bug that answers `{ data: [] }` would otherwise wipe the entire mirror in
   * one tick. Deletes made through this Backend are handled precisely by
   * `remove()` above, so nothing depends on pruning to stay correct.
   */
  private async prune(seenIds: string[]): Promise<number> {
    if (seenIds.length === 0) {
      const existing = await this.mirrorModel.estimatedDocumentCount().exec();
      if (existing > 0) {
        this.logger.warn(
          `Reconcile returned no events while the mirror holds ${existing}; not pruning.`,
        );
      }
      return 0;
    }
    try {
      const result = await this.mirrorModel
        .deleteMany({ _id: { $nin: seenIds } })
        .exec();
      return result.deletedCount ?? 0;
    } catch (err: any) {
      this.logger.warn(`Could not prune the event mirror: ${err?.message}`);
      return 0;
    }
  }

  // --------------------------------------------------------------------

  /** Upserts one eventsh document. Returns whether it was written. */
  private async upsert(
    event: Record<string, unknown>,
    source: EventMirrorSource,
  ): Promise<boolean> {
    const id = idOf(event);
    if (!id) {
      this.logger.warn('Refusing to mirror an eventsh event with no _id.');
      return false;
    }

    // `_id` is set by the upsert filter; including it in $set makes Mongo
    // reject the update of an existing row as an immutable-field write.
    const { _id: _ignored, ...fields } = normalizeOrganizer(event);

    try {
      await this.mirrorModel
        .updateOne(
          { _id: id },
          { $set: { ...fields, syncedAt: new Date(), syncSource: source } },
          { upsert: true, strict: false },
        )
        .exec();
      return true;
    } catch (err: any) {
      this.logger.warn(`Could not mirror eventsh event ${id}: ${err?.message}`);
      return false;
    }
  }
}

/** eventsh returns `{ success, message, data }` from its write endpoints and a
 * bare document from some reads. Narrows either to the document. */
function unwrapEventshEvent(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== 'object') return null;
  const candidate =
    'data' in body ? (body as { data: unknown }).data : (body as unknown);
  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return null;
  }
  return candidate as Record<string, unknown>;
}

/** eventsh's `_id` arrives as a string over JSON. */
function idOf(event: Record<string, unknown>): string | null {
  const id = event._id;
  return typeof id === 'string' && id.length > 0 ? id : null;
}

/**
 * The one field this mirror does not store verbatim.
 *
 * eventsh returns `organizer` as a plain id string from its write endpoints,
 * but the organizer list that reconcile reads calls `.populate("organizer")`,
 * so the same field comes back as a full nested document there. Left alone,
 * a mirrored event would change shape depending on which path last wrote it —
 * and any local query filtering on `organizer` would match only half the rows.
 * Flattened back to the id so the mirror is self-consistent. Everything else
 * is stored exactly as received.
 */
function normalizeOrganizer(event: Record<string, unknown>): Record<string, unknown> {
  const organizer = event.organizer;
  if (!organizer || typeof organizer !== 'object' || Array.isArray(organizer)) {
    return event;
  }
  const id = (organizer as { _id?: unknown })._id;
  if (typeof id !== 'string') return event;
  return { ...event, organizer: id };
}
