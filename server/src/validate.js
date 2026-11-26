/* Eingaben prüfen und normalisieren. Fehlermeldungen auf Deutsch, direkt für die App. */
import { bad } from './http.js';
import { BOTS } from '../../js/bots.js';
import { USERNAME_MIN, USERNAME_MAX } from '../../js/limits.js';

export { USERNAME_MIN, USERNAME_MAX };
export const PASSWORD_MIN = 8, PASSWORD_MAX = 128;
const RESERVED = new Set(['admin', 'administrator', 'root', 'system', 'support', 'darts', 'bot', 'gast', 'guest', 'null', 'undefined',
  ...BOTS.map((b) => b.name.toLowerCase().replace(/\s+/g, ''))]);

export function normEmail(v) {
  const e = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (!e || e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw bad('email_invalid', 'Bitte eine gültige E-Mail-Adresse eingeben.');
  return e;
}

export const usernameKey = (u) => u.normalize('NFC').toLowerCase();

/** Prüft einen Anzeigenamen. Gibt { name, key } zurück oder wirft einen 400er mit Grund. */
export function checkUsername(v) {
  const name = typeof v === 'string' ? v.trim().normalize('NFC') : '';
  if (name.length < USERNAME_MIN) throw bad('username_short', `Der Name braucht mindestens ${USERNAME_MIN} Zeichen.`);
  if (name.length > USERNAME_MAX) throw bad('username_long', `Benutzername zu lang – höchstens ${USERNAME_MAX} Zeichen.`);
  if (!/^[\p{L}\p{N}][\p{L}\p{N}_.-]*$/u.test(name)) throw bad('username_chars', 'Erlaubt sind Buchstaben, Ziffern sowie _ . - (ohne Leerzeichen, Anfang mit Buchstabe oder Ziffer).');
  const key = usernameKey(name);
  if (RESERVED.has(key)) throw bad('username_reserved', `„${name}“ ist reserviert.`);
  return { name, key };
}

export function checkPassword(v, email = '') {
  if (typeof v !== 'string' || v.length < PASSWORD_MIN) throw bad('password_short', `Das Passwort braucht mindestens ${PASSWORD_MIN} Zeichen.`);
  if (v.length > PASSWORD_MAX) throw bad('password_long', `Das Passwort darf höchstens ${PASSWORD_MAX} Zeichen haben.`);
  if (email && v.trim().toLowerCase() === email) throw bad('password_email', 'Das Passwort darf nicht die E-Mail-Adresse sein.');
  return v;
}

export const isId = (v) => typeof v === 'string' && v.length > 0 && v.length <= 80 && /^[\w.-]+$/.test(v);
export const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/** Meta eines Dart-Scans (Header X-Scan-Meta, URL-kodiertes JSON): nur ein kleines Objekt, Texte gekürzt */
export function scanMeta(raw) {
  let m = {};
  try { m = typeof raw === 'string' && raw.length <= 12000 ? JSON.parse(decodeURIComponent(raw)) : {}; } catch { m = {}; }
  if (!isPlainObject(m)) m = {};
  const out = { ok: m.ok === true, step: typeof m.step === 'string' ? m.step.slice(0, 30) : 'unknown' };
  if (typeof m.err === 'string') out.err = m.err.slice(0, 300);
  if (Number.isFinite(m.ms)) out.ms = Math.round(m.ms);
  for (const k of ['img', 'seg', 'st', 'zones', 'spec']) if (isPlainObject(m[k])) out[k] = m[k];
  return out;
}
