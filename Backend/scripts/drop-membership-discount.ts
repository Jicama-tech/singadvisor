/**
 * Retires the membership course-discount: strips the `course-discount` perk
 * from every plan and every membership that still carries it.
 *
 * A membership no longer changes what a course costs. The perk was removed from
 * the catalogue in membership-perks.ts, and both schemas now validate `perks`
 * against that list — so any plan or membership still holding the old key FAILS
 * VALIDATION the next time it is written. An admin opening an existing plan and
 * pressing Save would get a 500 with nothing to explain it; that is what this
 * script exists to prevent.
 *
 * `discountPercent` goes too.
 *
 * It was left in place at first, on the migrate-trainer-ids.ts precedent of
 * keeping a retired field as a rollback path. That was the wrong call here, for
 * two reasons. Mongoose still hands back a stored field that is no longer in
 * the schema, so a dead `discountPercent: 25` was being served on the PUBLIC
 * plans endpoint — anybody reading the API would reasonably conclude the
 * discount still existed. And unlike `trainerId`, which encoded a real
 * relationship that would be laborious to reconstruct, this is a single
 * configuration number somebody would simply retype.
 *
 * Nothing recalculates past bookings. A registration taken at a member rate
 * keeps the price it was actually sold at — `amountCents` is a snapshot of what
 * somebody agreed to pay, and rewriting it would be inventing a different
 * agreement after the fact.
 *
 * Safe to re-run: it matches only documents that still contain the key, so a
 * second run finds none and writes nothing.
 *
 *   npm run migrate:membership-discount
 */
import 'dotenv/config';
import mongoose from 'mongoose';

const PERK = 'course-discount';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI is not set — nothing to migrate against.');
    process.exit(1);
  }

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle after connecting.');

  // The raw collections, not the models: the key being removed is no longer in
  // either schema's enum, so Mongoose would refuse to describe these documents.
  let total = 0;
  for (const name of ['membership_plans', 'memberships']) {
    const held = await db.collection(name).countDocuments({ perks: PERK });
    if (held === 0) {
      console.log(`${name}: none carry "${PERK}" — nothing to do.`);
      continue;
    }
    const result = await db
      .collection(name)
      .updateMany({ perks: PERK }, { $pull: { perks: PERK } } as never);
    console.log(`${name}: stripped "${PERK}" from ${result.modifiedCount} of ${held}.`);
    total += result.modifiedCount;
  }

  // Separate pass, and a separate match: a document can carry the dead number
  // without the perk (the perk was already pulled by an earlier run, or the
  // plan never had it ticked but a percentage was saved anyway).
  for (const name of ['membership_plans', 'memberships']) {
    const held = await db.collection(name).countDocuments({ discountPercent: { $exists: true } });
    if (held === 0) {
      console.log(`${name}: no discountPercent field left.`);
      continue;
    }
    const result = await db
      .collection(name)
      .updateMany({ discountPercent: { $exists: true } }, { $unset: { discountPercent: '' } });
    console.log(`${name}: removed discountPercent from ${result.modifiedCount} of ${held}.`);
    total += result.modifiedCount;
  }

  console.log(total === 0 ? 'Nothing needed changing.' : `Done — ${total} update(s).`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
