/* Minimaler Router: Pfade mit :parametern, Methoden, Option { public: true } für Routen ohne Anmeldung. */
export function createRouter() {
  const routes = [];
  const add = (method) => (path, handler, opts = {}) => {
    const keys = [];
    const re = new RegExp(`^${path.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
    routes.push({ method, re, keys, handler, opts });
  };
  return {
    get: add('GET'), post: add('POST'), patch: add('PATCH'), put: add('PUT'), delete: add('DELETE'),
    /** → { route, params } · 'method' (Pfad passt, Methode nicht) · null */
    match(method, pathname) {
      let pathHit = false;
      for (const r of routes) {
        const m = r.re.exec(pathname);
        if (!m) continue;
        if (r.method !== method && !(method === 'HEAD' && r.method === 'GET')) { pathHit = true; continue; }
        const params = {};
        r.keys.forEach((k, i) => { try { params[k] = decodeURIComponent(m[i + 1]); } catch { params[k] = m[i + 1]; } });
        return { route: r, params };
      }
      return pathHit ? 'method' : null;
    },
  };
}
