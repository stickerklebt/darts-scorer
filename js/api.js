/* Verbindung zum Darts-Server (server/). Relative Pfade, damit die App auch unter einem Unterpfad läuft.
   Fehler kommen als ApiError mit deutscher Meldung; status 0 = keine Verbindung. */

export class ApiError extends Error {
  constructor(status, code, message, data = null) { super(message); this.status = status; this.code = code; this.data = data; }
}

/** Demo-Modus („Nutzer simulieren“): nichts geht an den Server */
export const apiGate = { demo: false };

export async function api(method, path, body) {
  if (apiGate.demo) throw new ApiError(0, 'demo', 'Im Demo-Modus nicht verfügbar – melde dich mit einem Konto an.');
  let res;
  try {
    res = await fetch(path.replace(/^\/+/, ''), {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : {},
      body: body !== undefined ? JSON.stringify(body) : undefined,
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch (e) {
    throw new ApiError(0, 'offline', 'Keine Verbindung zum Server.');
  }
  const json = (res.headers.get('content-type') || '').includes('application/json');
  const data = json ? await res.json().catch(() => null) : null;
  if (!json) throw new ApiError(res.status || 0, 'no_server', 'Kein Darts-Server gefunden. Die App muss über den Server laufen, damit Anmelden und Freunde funktionieren.');
  if (!res.ok) throw new ApiError(res.status, data?.error || 'http', data?.message || `Fehler ${res.status}`, data);
  return data;
}
