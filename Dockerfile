# syntax=docker/dockerfile:1
# Darts Scorer: PWA + API in einem kleinen Container. Keine npm-Abhängigkeiten, nur Node-Bordmittel (inkl. node:sqlite).
# Bauen:   docker build -t darts-scorer .
# Starten: docker compose up -d      (siehe docker-compose.yml, Daten im Volume /data)

ARG NODE_VERSION=24
FROM node:${NODE_VERSION}-alpine

ENV NODE_ENV=production \
    PORT=8080 \
    DATA_DIR=/data \
    APP_DIR=/app

WORKDIR /app

# Nur was ausgeliefert bzw. vom Server gebraucht wird (Allowlist, siehe auch .dockerignore)
COPY --chown=root:root index.html manifest.webmanifest sw.js icon-180.png icon-512.png ./
COPY --chown=root:root css ./css
COPY --chown=root:root js ./js
COPY --chown=root:root fonts ./fonts
COPY --chown=root:root bots ./bots
COPY --chown=root:root server ./server

# Datenordner gehört dem unprivilegierten Nutzer „node“ (UID 1000); App-Dateien bleiben schreibgeschützt (root)
RUN mkdir -p /data && chown node:node /data
VOLUME ["/data"]
USER node

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

# exec-Form: Node ist PID 1 und bekommt SIGTERM direkt (sauberes Beenden in server.js)
CMD ["node", "--disable-warning=ExperimentalWarning", "server/src/server.js"]
