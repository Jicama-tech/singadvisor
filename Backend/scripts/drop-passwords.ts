/**
 * Clears every stored password hash, after the move to Google-only sign-in.
 *
 * Dropping `passwordHash` from the schemas stops the app reading or writing
 * it, but Mongo keeps whatever is already in the documents. Those are live
 * credential material for accounts that can reach the dashboard, and nothing
 * uses them any more — so they are deleted rather than left lying in the
 * database and in every backup taken from here on.
 *
 * Safe to re-run: $unset on a field that is already gone is a no-op.
 *
 *   npm run drop:passwords
 */
import 'dotenv/config';
import mongoose from 'mongoose';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set (check Backend/.env)');

  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  if (!db) throw new Error('No database handle');

  for (const collection of ['admin-users', 'operators']) {
    const before = await db.collection(collection).countDocuments({ passwordHash: { $exists: true } });
    const result = await db
      .collection(collection)
      .updateMany({ passwordHash: { $exists: true } }, { $unset: { passwordHash: '' } });
    console.log(`${collection}: ${before} had a hash, ${result.modifiedCount} cleared`);
  }

  // A dashboard nobody can sign in to is the one outcome worth shouting
  // about, so end by naming who is still able to get in.
  const owners = await db
    .collection('admin-users')
    .find({}, { projection: { email: 1, role: 1 } })
    .toArray();
  const operators = await db
    .collection('operators')
    .find({ active: true }, { projection: { email: 1 } })
    .toArray();
  console.log('\nWho can sign in with Google now:');
  owners.forEach((a) => console.log(`  admin     ${String(a.email)} (${String(a.role)})`));
  operators.forEach((o) => console.log(`  operator  ${String(o.email)}`));

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
