/* Passwort-Hashing mit scrypt (Node-Bordmittel, speicherhart). Format: scrypt$logN$r$p$salt$hash (base64url). */
import { scrypt as scryptCb, randomBytes, timingSafeEqual } from 'node:crypto';

const scrypt = (pw, salt, len, opts) => new Promise((ok, fail) => scryptCb(pw, salt, len, opts, (e, k) => (e ? fail(e) : ok(k))));
const KEYLEN = 32;
const opts = (logN, r, p) => ({ N: 2 ** logN, r, p, maxmem: 256 * 2 ** logN * r + 8 * 1024 * 1024 });

export async function hashPassword(pw, logN = 15) {
  const salt = randomBytes(16);
  const key = await scrypt(pw.normalize('NFKC'), salt, KEYLEN, opts(logN, 8, 1));
  return `scrypt$${logN}$8$1$${salt.toString('base64url')}$${key.toString('base64url')}`;
}

export async function verifyPassword(pw, stored) {
  const [alg, logN, r, p, salt, hash] = String(stored).split('$');
  if (alg !== 'scrypt' || !hash) return false;
  const want = Buffer.from(hash, 'base64url');
  const key = await scrypt(pw.normalize('NFKC'), Buffer.from(salt, 'base64url'), want.length, opts(Number(logN), Number(r), Number(p)));
  return key.length === want.length && timingSafeEqual(key, want);
}

/** Braucht ein gespeicherter Hash neue Parameter (z. B. nach Erhöhung von SCRYPT_LOG_N)? */
export const needsRehash = (stored, logN) => Number(String(stored).split('$')[1]) !== logN;
