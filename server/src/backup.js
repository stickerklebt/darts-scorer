/* Konsistente Sicherung der Datenbank im laufenden Betrieb (VACUUM INTO), alte Sicherungen aufräumen.
   Im Container:  docker compose exec app node --disable-warning=ExperimentalWarning server/src/backup.js
   Ergebnis:      /data/backups/darts-JJJJ-MM-TT-HHMMSS.db  (die letzten BACKUP_KEEP Stück, Standard 14) */
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { loadConfig } from './config.js';

const config = loadConfig();
const keep = Number(process.env.BACKUP_KEEP || 14);
const dir = join(config.dataDir, 'backups');
mkdirSync(dir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:T]/g, '-').replace(/\..+/, '').replace(/-(\d\d)-(\d\d)-(\d\d)$/, '-$1$2$3');
const file = join(dir, `darts-${stamp}.db`);

const db = new DatabaseSync(join(config.dataDir, 'darts.db'), { readOnly: true });
db.prepare('VACUUM INTO ?').run(file);
db.close();

const old = readdirSync(dir).filter((f) => /^darts-.*\.db$/.test(f)).sort().slice(0, -keep);
for (const f of old) rmSync(join(dir, f));
console.log(JSON.stringify({ backup: file, removed: old.length }));
