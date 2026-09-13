/**
 * Carries every training's single `trainerId` over to the `trainerIds` list
 * that replaced it, now that a course can credit several facilitators.
 *
 * Nothing does this on its own: Mongoose applies a schema default when a
 * document is written, not when an old one is read, so without this run every
 * training that already had a facilitator comes back with an empty list — the
 * public page quietly stops crediting anyone, and the Facilitators tab reports
 * that nobody is teaching anything and offers to delete them all.
 *
 * `trainerId` is deliberately left where it is. It costs one field per
 * document, nothing reads it any more (see TrainersService.usage()), and it is
 * the rollback path: if this change is reverted, the old value is still
 * sitting there, correct and untouched.
 *
 * Safe to re-run: it only picks up trainings that have a `trainerId` and no
 * `trainerIds` yet, so a second run finds none and writes nothing.
 *
 *   npm run migrate:trainers
 */
import 'dotenv/config';
import mongoose from 'mongoose';

/**
 * Only what this script reads. `trainerId` is off the schema now, so the raw
 * collection is the one place it is still visible — the same reason
 * drop-passwords.ts reaches past Mongoose. It is typed loosely because the
 * field it replaced was a Mixed path (see training.entity.ts) and may hold
 * either an ObjectId or the string form of one.
 */
type LegacyTraining = {
  title?: string;
  trainerId?: mongoose.Types.ObjectId | string | null;
  trainerIds?: (mongoose.Types.ObjectId | string)[];
};

/** A training still waiting to be carried over: it names a facilitator the old
 * way and has nothing in the new list. */
const PENDING = {
  trainerId: { $ne: null },
  $or: [{ trainerIds: { $exists: false } }, { trainerIds: { $size: 0 } }],
};

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set (check Backend/.env)');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle');
  const trainings = db.collection<LegacyTraining>('trainings');

  const pending = await trainings.find(PENDING).toArray();
  console.log(`${pending.length} training(s) to carry over`);

  for (const t of pending) {
    // The filter already excluded these; the type cannot say so.
    if (!t.trainerId) continue;
    // Normalise on the way across: the new field is a real ObjectId path, and
    // a string left in it would never match the ObjectId the delete guard
    // counts with, silently making a facilitator in use look deletable.
    const trainerId =
      typeof t.trainerId === 'string' && mongoose.Types.ObjectId.isValid(t.trainerId)
        ? new mongoose.Types.ObjectId(t.trainerId)
        : t.trainerId;
    await trainings.updateOne({ _id: t._id }, { $set: { trainerIds: [trainerId] } });
    console.log(`  ${t.title ?? String(t._id)}: ${String(trainerId)}`);
  }

  // A course crediting nobody is the one outcome worth shouting about, so end
  // by saying whether any are left — including ones that never had a trainer.
  const uncredited = await trainings.countDocuments({
    $or: [{ trainerIds: { $exists: false } }, { trainerIds: { $size: 0 } }],
  });
  console.log(
    uncredited
      ? `\n${uncredited} training(s) still credit no facilitator — set one in the admin.`
      : '\nEvery training credits at least one facilitator.',
  );

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
