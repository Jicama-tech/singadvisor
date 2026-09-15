/**
 * Stores `featured: false` on every newsletter issue and blog post written
 * before the flag existed.
 *
 * `default: false` on the schema does NOT cover them. A Mongoose default is
 * filled in when a document is hydrated — long after the server has done the
 * sorting. In the stored document the field is simply absent, and the public
 * listings sort on it:
 *
 *   .sort({ featured: -1, publishedAt: -1, createdAt: -1 })
 *
 * Mongo sorts an absent field as null, and null is a distinct BSON type that
 * orders below the WHOLE of Boolean — so an absent field lands below `false`
 * rather than alongside it. That leaves three groups, not two, and the date
 * only breaks ties WITHIN a group. Verified against mongod:
 *
 *   true(2019) | false(2026-08) | false(2020) | MISSING(2026-09)
 *
 * The newest document, missing the field, sorted dead last.
 *
 * Today every issue is missing it, so they share one group, the date orders
 * them correctly, and nothing looks wrong. It breaks on the first ordinary
 * admin save: the form always submits `featured` as a real boolean, so saving
 * one issue with the toggle untouched writes `featured: false` on it — and
 * that issue then outranks every issue nobody has edited, however new. An
 * older issue silently takes the top of /newsletter and the hero slot on /blog.
 *
 * Only these two collections need it. `trainings` sorts on sortOrder/updatedAt,
 * and events FILTER on `{ featured: true }`, where an absent field correctly
 * never matches.
 *
 * The collection names are the ones the entities declare — 'blog-posts', with
 * a hyphen, is not what Mongoose would have pluralised `BlogPost` to. They are
 * checked to exist before anything is written, because naming one wrong is a
 * silent success rather than a failure.
 *
 * Safe to re-run: it matches only documents that still lack the field, so a
 * second run finds none and writes nothing.
 *
 *   npm run migrate:featured
 */
import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set — nothing to migrate against.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle after connecting.');

  // The names Mongoose is configured with, NOT what it would pluralise to.
  // Both entities set an explicit `collection:` — 'blog-posts' with a hyphen,
  // which is not what `BlogPost` pluralises to. Getting this wrong does not
  // fail: it reports "nothing to do" against a collection that does not exist
  // and the migration looks like it ran.
  const COLLECTIONS = ['newsletters', 'blog-posts'];

  // So the existence of each one is checked first, and a missing name is an
  // error rather than a quiet success.
  const present = new Set((await db.listCollections().toArray()).map((c) => c.name));
  const absent = COLLECTIONS.filter((name) => !present.has(name));
  if (absent.length > 0) {
    throw new Error(
      `No such collection: ${absent.join(', ')}. ` +
        `Check the @Schema({ collection: … }) on the entity — a silent no-op here ` +
        `would leave the listings mis-ordered with nothing to show for it.`,
    );
  }

  let total = 0;
  for (const name of COLLECTIONS) {
    const missing = await db.collection(name).countDocuments({ featured: { $exists: false } });
    if (missing === 0) {
      console.log(`${name}: every document already stores "featured" — nothing to do.`);
      continue;
    }
    const result = await db
      .collection(name)
      .updateMany({ featured: { $exists: false } }, { $set: { featured: false } });
    console.log(`${name}: stored featured=false on ${result.modifiedCount} of ${missing}.`);
    total += result.modifiedCount;
  }

  console.log(total === 0 ? 'Nothing needed changing.' : `Done — ${total} update(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
