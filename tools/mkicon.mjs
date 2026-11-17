// Erzeugt das App-Icon als einfache Zielscheibe (gut erkennbar auf dem Home-Bildschirm):
//   node tools/mkicon.mjs icon.svg && qlmanage -t -s 1024 -o . icon.svg
//   sips -Z 512 icon.svg.png --out icon-512.png && sips -Z 180 icon.svg.png --out icon-180.png
// Füllt das ganze Quadrat (iOS rundet selbst ab), alles Wichtige liegt in der sicheren Mitte (maskable).
import { writeFileSync } from 'node:fs';
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<defs><radialGradient id="bg" cx="50%" cy="42%" r="70%"><stop offset="0" stop-color="#2a2016"/><stop offset="1" stop-color="#0b0a08"/></radialGradient>
<radialGradient id="red" cx="40%" cy="35%" r="75%"><stop offset="0" stop-color="#f05a42"/><stop offset="1" stop-color="#b92f1f"/></radialGradient></defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<g transform="translate(512 512)">
  <circle r="372" fill="none" stroke="#d4a63a" stroke-width="26"/>
  <circle r="318" fill="url(#red)"/>
  <circle r="214" fill="#0b0a08"/>
  <circle r="152" fill="#f3e9d2"/>
  <circle r="64" fill="url(#red)"/>
</g>
</svg>`;
writeFileSync(process.argv[2] || 'icon.svg', svg);
