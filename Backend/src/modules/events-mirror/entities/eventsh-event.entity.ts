import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

/** Which code path last wrote this mirror row — useful when diagnosing a
 * stale copy: `proxy` means it was captured live as an admin saved through
 * this Backend, `reconcile` means the periodic full pull from eventsh wrote
 * it (which is also how events created directly in eventsh's own UI get
 * here). */
export type EventMirrorSource = 'proxy' | 'reconcile';

export type EventshEventMirrorDocument = HydratedDocument<EventshEventMirror>;

/**
 * A verbatim shadow copy of an eventsh Event document, stored in SingAdvisor's
 * own database.
 *
 * Events are owned by eventsh — this Backend forwards every write to it
 * (see eventsh-proxy) and never persisted them locally, which is why they were
 * the one domain absent from the SingAdvisor database. This collection closes
 * that gap without asking eventsh for anything: eventsh stays the source of
 * truth and is not modified in any way.
 *
 * `strict: false` is the whole point. eventsh's Event has ~30 fields this
 * Backend has no schema for (stall/table templates, venue layout and its CAD
 * annotations, workshop sessions and packages, add-on items, seat rows,
 * speaker zones, chatbot config...). A typed schema would silently drop every
 * one of them on save, and would then have to be updated by hand every time
 * eventsh adds a field. Storing the document as it arrived is lossless and
 * needs no maintenance.
 *
 * `_id` is declared as a String so the mirror reuses eventsh's own `_id`
 * verbatim: the mirror row for an event is trivially addressable by the same
 * id the rest of the system already passes around, and re-syncing the same
 * event can never create a duplicate.
 *
 * NOT a read source. Nothing serves pages from this collection — the site and
 * the admin still read from eventsh exactly as before. It exists so the data
 * lives in SingAdvisor's database and is queryable there.
 */
@Schema({
  collection: 'eventsh_events',
  strict: false,
  // eventsh's own createdAt/updatedAt come along in the copied document;
  // adding Mongoose's would overwrite them with meaningless local times.
  timestamps: false,
  versionKey: false,
  // Keep empty objects/arrays exactly as eventsh sent them — with the default
  // `minimize`, an event whose `chatbot: {}` is empty would lose the key
  // entirely and the copy would stop being verbatim.
  minimize: false,
})
export class EventshEventMirror {
  @Prop({ type: String, required: true })
  _id!: string;

  /** When this row last matched eventsh. */
  @Prop({ type: Date, required: true })
  syncedAt!: Date;

  @Prop({ type: String, enum: ['proxy', 'reconcile'], required: true })
  syncSource!: EventMirrorSource;
}

export const EventshEventMirrorSchema =
  SchemaFactory.createForClass(EventshEventMirror);

// Reconcile prunes by comparing against eventsh's full list, and the admin
// looks these up by how fresh they are; both scan on syncedAt.
EventshEventMirrorSchema.index({ syncedAt: -1 });
