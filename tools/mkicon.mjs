// Erzeugt icon.svg (mit eingebetteter Cinzel-Schrift) für die PNG-Umwandlung.
import { readFileSync, writeFileSync } from 'node:fs';
import { crest } from '../js/ui/svg.js';
const font = readFileSync(new URL('../fonts/cinzel.woff2', import.meta.url)).toString('base64');
const inner = crest({ size: 200 }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<style>@font-face{font-family:Cinzel;src:url(data:font/woff2;base64,${font}) format('woff2');font-weight:900}</style>
<rect width="1024" height="1024" fill="#0b0a08"/>
<rect x="34" y="34" width="956" height="956" fill="none" stroke="#d4a63a" stroke-width="6"/>
<rect x="50" y="50" width="924" height="924" fill="none" stroke="#d4a63a" stroke-width="2"/>
<g transform="translate(152 70) scale(3.6)">${inner}</g>
</svg>`;
writeFileSync(process.argv[2], svg);
