/* Strukturierte Logs: eine JSON-Zeile pro Ereignis auf stdout (Fehler auf stderr) → systemd-Journal (deploy/logs.sh).
   Felder: t (Zeit), level (debug|info|warn|error), msg (Ereignisname, snake_case), dazu Kontext wie rid (Request-ID),
   u (Nutzer-id), m/p/s/ms (Methode, Pfad, Status, Dauer).
   Datenschutz: niemals Passwörter, Tokens, Cookies oder E-Mail-Adressen loggen; IPs nur gekürzt (anonIp). */

export const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 };

/** Fehler in loggbare Felder umwandeln (Meldung + Stack, gekürzt) */
const errFields = (e) => ({ err: String(e?.message ?? e).slice(0, 500), ...(e?.stack ? { stack: String(e.stack).split('\n').slice(0, 8).join('\n') } : {}), ...(e?.code ? { code: e.code } : {}) });

/**
 * level: kleinste Stufe, die ausgegeben wird (Standard info) · silent: gar nichts ausgeben (Tests)
 * sink: eigene Ausgabe (Tests sammeln damit die Zeilen) · base: Felder, die in jeder Zeile stehen
 */
export function createLogger({ level = 'info', silent = false, sink = null, base = {} } = {}) {
  const min = LEVELS[level] ?? LEVELS.info;
  const write = (lvl, msg, extra = {}) => {
    if (LEVELS[lvl] < min || (silent && !sink)) return;
    const fields = {};
    for (const [k, v] of Object.entries(extra || {})) {
      if (v === undefined) continue;
      if (v instanceof Error) Object.assign(fields, errFields(v)); else fields[k] = v;
    }
    const entry = { t: new Date().toISOString(), level: lvl, msg, ...base, ...fields };
    if (sink) { sink(entry); return; }
    let line;
    try { line = JSON.stringify(entry); } catch { line = JSON.stringify({ t: entry.t, level: lvl, msg, note: 'unserialisierbar' }); }
    (lvl === 'error' ? process.stderr : process.stdout).write(line + '\n');
  };
  return {
    debug: (msg, extra) => write('debug', msg, extra),
    info: (msg, extra) => write('info', msg, extra),
    warn: (msg, extra) => write('warn', msg, extra),
    error: (msg, extra) => write('error', msg, extra),
    /** Logger mit festen Zusatzfeldern (z. B. Request-ID und Nutzer einer Anfrage) */
    child: (fields) => createLogger({ level, silent, sink, base: Object.fromEntries(Object.entries({ ...base, ...fields }).filter(([, v]) => v !== undefined)) }),
  };
}

/** IP gekürzt (DSGVO): IPv4 → letztes Oktett 0, IPv6 → erste 3 Blöcke */
export function anonIp(ip = '') {
  const v4 = String(ip).replace(/^::ffff:/, '');
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) return v4.replace(/\.\d+$/, '.0');
  if (ip.includes(':')) return `${ip.split(':').slice(0, 3).join(':')}::`;
  return ip ? 'unknown' : undefined;
}
