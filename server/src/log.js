/* Strukturierte Logs (eine JSON-Zeile pro Ereignis) auf stdout/stderr – im Container von Docker eingesammelt.
   Niemals Passwörter, Tokens oder E-Mail-Adressen loggen. */
export function createLogger({ silent = false } = {}) {
  const write = (level, msg, extra) => {
    if (silent) return;
    const line = JSON.stringify({ t: new Date().toISOString(), level, msg, ...extra });
    (level === 'error' ? process.stderr : process.stdout).write(line + '\n');
  };
  return {
    info: (msg, extra) => write('info', msg, extra),
    warn: (msg, extra) => write('warn', msg, extra),
    error: (msg, extra) => write('error', msg, extra),
  };
}
