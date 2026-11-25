/* Mailversand über das lokale sendmail (Postfix): Nachricht als Text an `sendmail -t -i`.
   Ob und wie die Mail beim Empfänger ankommt (Relay, SPF/DKIM), regelt Postfix – nicht die App.
   In Tests ersetzt `config.sendMail` den Versand (bekommt { to, subject, text }). */
import { spawn } from 'node:child_process';

const oneLine = (s) => String(s).replace(/[\r\n]+/g, ' ').trim();
/** Betreff als RFC-2047 (UTF-8, Base64), damit Umlaute ankommen */
const encSubject = (s) => `=?UTF-8?B?${Buffer.from(oneLine(s)).toString('base64')}?=`;

export function createMailer(config) {
  if (typeof config.sendMail === 'function') return config.sendMail;
  return ({ to, subject, text }) => new Promise((resolve, reject) => {
    const msg = [
      `From: ${oneLine(config.mail.from)}`, `To: ${oneLine(to)}`, `Subject: ${encSubject(subject)}`,
      'MIME-Version: 1.0', 'Content-Type: text/plain; charset=utf-8', 'Content-Transfer-Encoding: 8bit', '', text, '',
    ].join('\n');
    const p = spawn(config.mail.sendmail, ['-t', '-i'], { stdio: ['pipe', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`sendmail ${code}: ${err.slice(0, 200)}`))));
    p.stdin.end(msg);
  });
}
