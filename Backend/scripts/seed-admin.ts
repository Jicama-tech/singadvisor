/**
 * Creates the first super admin (role: owner) in the `admin-users`
 * collection, from ADMIN_EMAIL / ADMIN_PASSWORD — mirrors the admin block of
 * Frontend/prisma/seed.ts, re-pointed at MongoDB. Safe to re-run: it upserts
 * rather than duplicating.
 *
 *   npm run seed:admin
 */
import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { AdminUserSchema } from '../src/modules/admin/entities/admin.entity';

async function main() {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI is not set (check Backend/.env)');

  const email = (process.env.ADMIN_EMAIL ?? 'admin@singadvisor.sg').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD ?? 'ChangeMe123!';

  await mongoose.connect(uri);
  const AdminUser = mongoose.model('AdminUser', AdminUserSchema);

  const passwordHash = await bcrypt.hash(password, 12);
  await AdminUser.updateOne(
    { email },
    {
      $set: { name: 'Site Owner', passwordHash, role: 'owner' },
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true },
  );

  console.log(`  admin: ${email} / ${password}`);
  await mongoose.disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
