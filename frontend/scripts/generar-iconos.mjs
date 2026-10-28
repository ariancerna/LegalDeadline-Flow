// Genera src/app/shared/iconos.generados.ts a partir de lucide-static (licencia ISC).
// Uso: node scripts/generar-iconos.mjs  (agrega el nombre del icono a ICONOS y vuelve a ejecutar)
import { readFileSync, writeFileSync } from 'node:fs';

const ICONOS = [
  'layout-dashboard', 'folder-open', 'folder', 'list-checks', 'calendar-clock', 'calendar', 'clock',
  'scale', 'shield-check', 'history', 'users', 'user', 'user-plus', 'user-check', 'search', 'bell',
  'sun', 'moon', 'monitor', 'log-out', 'chevron-left', 'chevron-right', 'chevron-down', 'plus', 'x',
  'pencil', 'ban', 'check', 'circle-check', 'triangle-alert', 'circle-alert', 'info', 'arrow-right',
  'arrow-left', 'arrow-up-right', 'sliders-horizontal', 'refresh-cw', 'ellipsis', 'square-kanban',
  'list', 'gavel', 'briefcase', 'file-text', 'archive', 'lock', 'mail', 'eye', 'eye-off', 'command',
  'corner-down-left', 'sparkles', 'activity', 'flag', 'hourglass', 'inbox', 'arrow-right-left',
  'menu', 'panel-left-close', 'panel-left-open', 'loader-circle', 'key-round', 'timer', 'scroll-text',
  'landmark', 'clipboard-list', 'calendar-x', 'calendar-check', 'octagon-alert', 'circle-slash',
  'gauge', 'target', 'grip-vertical', 'circle', 'circle-dot', 'trending-up', 'zap',
];

const salida = {};
for (const nombre of ICONOS) {
  const svg = readFileSync(new URL(`../node_modules/lucide-static/icons/${nombre}.svg`, import.meta.url), 'utf8');
  const cuerpo = svg.slice(svg.indexOf('>', svg.indexOf('<svg')) + 1, svg.lastIndexOf('</svg>'));
  const elementos = [...cuerpo.matchAll(/<(\w+)([^>]*?)\/?>/g)].map(([, etiqueta, attrs]) => {
    const atributos = Object.fromEntries([...attrs.matchAll(/([\w-]+)="([^"]*)"/g)].map(([, k, v]) => [k, v]));
    return [etiqueta, atributos];
  });
  salida[nombre] = elementos;
}

const ts = `// Archivo generado por scripts/generar-iconos.mjs. No editar a mano.
// Iconos de Lucide (https://lucide.dev), licencia ISC.
export type ElementoSvg = [string, Record<string, string>];
export const ICONOS: Record<string, ElementoSvg[]> = ${JSON.stringify(salida, null, 0)};
export type NombreIcono = ${ICONOS.map((n) => `'${n}'`).join(' | ')};
`;
writeFileSync(new URL('../src/app/shared/iconos.generados.ts', import.meta.url), ts);
console.log(`${ICONOS.length} iconos generados`);
