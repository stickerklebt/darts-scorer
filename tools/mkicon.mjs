// Erzeugt icon.svg (mit eingebetteter Metal-Mania-Schrift) für die PNG-Umwandlung.
import { readFileSync, writeFileSync } from 'node:fs';
import { crest } from '../js/ui/svg.js';
const font = readFileSync(new URL('../fonts/metalmania.woff2', import.meta.url)).toString('base64');
const inner = crest({ size: 200 }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<style>@font-face{font-family:'Metal Mania';src:url(data:font/woff2;base64,${font}) format('woff2')}</style>
<defs><filter id="st" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".006" numOctaves="4" seed="7"/>
<feColorMatrix values="0 0 0 0 .72 0 0 0 0 .8 0 0 0 0 .76 0 0 0 .5 -.18"/></filter></defs>
<rect width="1024" height="1024" fill="#0e1211"/>
<rect width="1024" height="1024" filter="url(#st)"/>
<g fill="#dedcd0" opacity=".28">${Array.from({ length: 16 }, (_, i) => `<rect x="${i * 64 + 8}" y="0" width="32" height="22"/><rect x="${i * 64 + 8}" y="1002" width="32" height="22"/>`).join('')}</g>
<g transform="translate(152 66) scale(3.6)">${inner}</g>
</svg>`;
writeFileSync(process.argv[2], svg);
