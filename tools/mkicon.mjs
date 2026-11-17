// Erzeugt icon.svg (mit eingebetteter IM-Fell-Schrift) für die PNG-Umwandlung.
import { readFileSync, writeFileSync } from 'node:fs';
import { crest } from '../js/ui/svg.js';
const font = readFileSync(new URL('../fonts/fell-sc.woff2', import.meta.url)).toString('base64');
const inner = crest({ size: 200 }).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">
<style>@font-face{font-family:'IM Fell English SC';src:url(data:font/woff2;base64,${font}) format('woff2')}</style>
<rect width="1024" height="1024" fill="#0b0a08"/>
<g filter="url(#rough)"><rect x="34" y="34" width="956" height="956" rx="18" fill="none" stroke="#d4a63a" stroke-width="6"/>
<rect x="50" y="50" width="924" height="924" rx="12" fill="none" stroke="#d4a63a" stroke-width="2"/></g>
<filter id="rough" x="-3%" y="-3%" width="106%" height="106%"><feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves="2" seed="4" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="9" xChannelSelector="R" yChannelSelector="G"/></filter>
<g filter="url(#rough)"><g transform="translate(152 70) scale(3.6)">${inner}</g></g>
</svg>`;
writeFileSync(process.argv[2], svg);
