/* Konsistente Sicherung der Datenbank im laufenden Betrieb (VACUUM INTO), alte Sicherungen aufräumen.
   Aufruf über deploy/backup.sh (läuft nachts per Cron). Ergebnis: $DATA_DIR/backups/darts-JJJJ-MM-TT-HHMMSS.db (die letzten 14). */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config.js';

const config = loadConfig();
const keep = 14;
const dir = join(config.dataDir, 'backups');
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '').replace(/-(\d\d)-(\d\d)-(\d\d)$/, '-$1$2$3');
const file = join(dir, `darts-${stamp}.db`);

const db = new DatabaseSync(join(config.dataDir, 'darts.db'), { readOnly: true });
db.prepare('VACUUM INTO ?').run(file);
db.close();

const old = readdirSync(dir).filter((f) => /^darts-.*\.db$/.test(f)).sort().slice(0, -keep);
for (const f of old) rmSync(join(dir, f));
console.log(JSON.stringify({ t: new Date().toISOString(), level: 'info', msg: 'backup', file, removed: old.length }));
