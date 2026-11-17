/* HTTP-Helfer: Fehler, JSON lesen/senden, Cookies, Client-IP. */

export class HttpError extends Error {
  constructor(status, code, message, extra) { super(message); this.status = status; this.code = code; this.extra = extra; }
}
export const bad = (code, message, extra) => new HttpError(400, code, message, extra);

export function sendJson(res, status, body, headers = {}) {
  const data = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Length': Buffer.byteLength(data), ...headers });
  res.end(data);
}

/** JSON-Körper lesen – mit Größenlimit und Content-Type-Pflicht (verhindert auch Cross-Site-Formular-Posts). */
export async function readJson(req, limit) {
  const ct = String(req.headers['content-type'] || '');
  if (!/^application\/json\b/i.test(ct)) throw new HttpError(415, 'content_type', 'Content-Type muss application/json sein.');
  const len = Number(req.headers['content-length'] || 0);
  if (len > limit) throw new HttpError(413, 'too_large', 'Anfrage zu groß.');
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new HttpError(413, 'too_large', 'Anfrage zu groß.');
    chunks.push(c);
  }
  if (!size) return {};
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw bad('bad_json', 'Ungültiges JSON.'); }
}

export function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const k = part.slice(0, i).trim(), v = part.slice(i + 1).trim();
    if (k && !(k in out)) { try { out[k] = decodeURIComponent(v); } catch { out[k] = v; } }
  }
  return out;
}

export function cookie(name, value, { maxAge, secure, httpOnly = true, sameSite = 'Lax', path = '/' } = {}) {
  let c = `${name}=${encodeURIComponent(value)}; Path=${path}; SameSite=${sameSite}`;
  if (maxAge !== undefined) c += `; Max-Age=${Math.floor(maxAge)}`;
  if (httpOnly) c += '; HttpOnly';
  if (secure) c += '; Secure';
  return c;
}

export function clientIp(req, trustProxy) {
  if (trustProxy) {
    const xf = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
    if (xf) return xf;
  }
  return req.socket.remoteAddress || 'unknown';
}

export function isHttps(req, trustProxy) {
  if (req.socket.encrypted) return true;
  return trustProxy && String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim() === 'https';
}
