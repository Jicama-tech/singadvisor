import * as crypto from 'crypto';

// AES-256-GCM encryption for secrets at rest (Razorpay keys stored via the
// Settings module). Stored format: `enc:v1:<iv>:<authTag>:<ciphertext>`
// (base64 parts), so the value is unreadable in the database — including to
// anyone with DB access. Ported from eventsh-v1's secret-crypto.util.ts
// (which uses EMAIL_CONFIG_ENC_KEY); this app keys on SETTINGS_ENC_KEY.
//
// Unlike eventsh's version, this one is FAIL-SAFE for writes: encryptSecret
// throws when SETTINGS_ENC_KEY is unset rather than silently falling back to
// a well-known dev secret — a real Razorpay key must never be persisted
// under a default key.

const PREFIX = 'enc:v1:';

function encryptionKey(): Buffer {
  const secret =
    process.env.SETTINGS_ENC_KEY || process.env.JWT_ACCESS_SECRET || 'singadvisor-dev-secret';
  return crypto.createHash('sha256').update(String(secret)).digest();
}

/** True when a real encryption key is configured — the Settings service
 * refuses to persist secrets unless this is true. */
export function hasEncryptionKey(): boolean {
  return !!process.env.SETTINGS_ENC_KEY;
}

// Idempotent: already-encrypted values pass through unchanged.
export function encryptSecret(plain: string): string {
  if (!hasEncryptionKey()) {
    throw new Error(
      'SETTINGS_ENC_KEY is not set in Backend/.env — refusing to persist a secret without it.',
    );
  }
  if (!plain || plain.startsWith(PREFIX)) return plain;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return PREFIX + [iv, tag, ciphertext].map((b) => b.toString('base64')).join(':');
}

// Legacy plaintext values (saved before encryption existed) pass through
// unchanged so older configs keep working; they get encrypted on next save.
export function decryptSecret(value?: string): string {
  if (!value || !value.startsWith(PREFIX)) return value || '';
  try {
    const [ivB64, tagB64, ctB64] = value.slice(PREFIX.length).split(':');
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      encryptionKey(),
      Buffer.from(ivB64, 'base64'),
    );
    decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
    return Buffer.concat([
      decipher.update(Buffer.from(ctB64, 'base64')),
      decipher.final(),
    ]).toString('utf8');
  } catch {
    // Wrong key or corrupted ciphertext — behave as "no secret saved".
    return '';
  }
}
