/**
 * Promotes a Google-capable address to a full owner admin.
 *
 * Written for the move to Google-only sign-in: the seeded owner
 * (admin@singadvisor.sg) may not resolve through Google, and removing password
 * auth before a Google-capable owner exists would lock everyone out of the
 * dashboard with no route back except editing the database by hand. Run this
 * FIRST, sign in with that account, and only then drop passwords.
 *
 * Safe to re-run: it upserts on email and never downgrades an existing owner.
 *
 *   OWNER_EMAIL=you@gmail.com npm run add:owner
 *   npm run add:owner -- you@gmail.com
 *
 * The account is created with a random password nobody is told, because it is
 * meant to be used through Google sign-in. `passwordHash` is still required by
 * the schema at this point; once password auth is removed the field goes with
 * it. A random hash is deliberately better than a known placeholder — this
 * account must not be reachable by guessing a default.
 */
import 'dotenv/config';
import { randomBytes } from 'crypto';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AdminUserSchema } from '../src/modules/admin/entities/admin.entity';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set (check Backend/.env)');

  const email = (process.argv[2] ?? process.env.OWNER_EMAIL ?? '').toLowerCase().trim();
  if (!email) {
    throw new Error('Usage: npm run add:owner -- you@gmail.com   (or set OWNER_EMAIL)');
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error(`"${email}" does not look like an email address`);
  }

  const name = process.env.OWNER_NAME ?? 'Site Owner';

  await mongoose.connect(uri);
  const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

  const existing = await AdminUser.findOne({ email }).exec();
  if (existing) {
    if (existing.get('role') === 'owner') {
      console.log(`already an owner: ${email} — nothing to do`);
    } else {
      await AdminUser.updateOne({ email }, { $set: { role: 'owner' } }).exec();
      console.log(`promoted to owner: ${email}`);
    }
  } else {
    // Unguessable and never printed: this account signs in with Google.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 12);
    await AdminUser.create({ email, name, passwordHash, role: 'owner', createdAt: new Date() });
    console.log(`created owner: ${email}`);
  }

  const owners = await AdminUser.find({ role: 'owner' }).select('email').lean().exec();
  console.log(`owners now: ${owners.map((o) => o.email).join(', ')}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
