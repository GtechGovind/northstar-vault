import { readFile, writeFile, copyFile } from 'node:fs/promises';

const names = [
  'arrow-up',
  'arrow-down',
  'arrow-up-right',
  'check',
  'chevron-right',
  'compass',
  'copy',
  'download',
  'file-text',
  'history',
  'lightbulb',
  'loader-circle',
  'lock-keyhole',
  'log-out',
  'menu',
  'message-circle',
  'ellipsis',
  'panel-right',
  'plus',
  'refresh-cw',
  'search',
  'shield-check',
  'sparkles',
  'square-pen',
  'trash-2',
  'wifi-off',
  'x',
];
const symbols = await Promise.all(
  names.map(async (name) => {
    const source = await readFile(
      new URL(`../node_modules/lucide-static/icons/${name}.svg`, import.meta.url),
      'utf8',
    );
    const paths = source.match(/<svg\b[^>]*>([\s\S]*?)<\/svg>/)?.[1];
    if (!paths) throw new Error(`Invalid Lucide icon: ${name}`);
    return `<symbol id="${name}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${paths}</symbol>`;
  }),
);
await writeFile(
  new URL('../public/icons.svg', import.meta.url),
  `<!-- Generated from lucide-static. ISC license: /icons-LICENSE.txt -->\n<svg xmlns="http://www.w3.org/2000/svg"><defs>${symbols.join('\n')}</defs></svg>\n`,
);
await copyFile(
  new URL('../node_modules/lucide-static/LICENSE', import.meta.url),
  new URL('../public/icons-LICENSE.txt', import.meta.url),
);
console.log(`Built ${names.length} self-hosted Lucide icons.`);
