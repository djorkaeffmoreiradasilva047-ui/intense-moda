import {readFileSync,writeFileSync} from 'node:fs';
const html=readFileSync(new URL('../netlify/lib/painel.html',import.meta.url),'utf8');
writeFileSync(new URL('../netlify/lib/views.mjs',import.meta.url),'export const panelHTML='+JSON.stringify(html)+';\n');
console.log('Loja e painel preparados para a Netlify.');
