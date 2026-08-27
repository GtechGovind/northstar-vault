import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL('../' + path, import.meta.url), 'utf8');

test('HTML has unique identifiers and labelled native dialogs', async () => {
  const html = await read('public/index.html');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(ids.length, new Set(ids).size, 'Duplicate DOM IDs break panel ownership');
  for (const id of ['history-dialog', 'signal-dialog', 'privacy-dialog', 'confirm-dialog']) {
    assert.match(html, new RegExp('<dialog\\s+[^>]*id="' + id + '"[^>]*aria-label(?:ledby)?='));
  }
  assert.match(html, /interactive-widget=resizes-content/);
  assert.match(html, /fixed inset-0 hidden h-dvh/);
  assert.match(html, /@container\/workspace/);
  assert.match(html, /grid-rows-\[auto_minmax\(0,1fr\)_auto\]/);
  assert.match(html, /wrap-anywhere/);
  assert.match(html, /motion-reduce:/);
});

test('visual styling is compiled Tailwind, with self-hosted library icons', async () => {
  const input = await read('ui/tailwind.css');
  assert.match(input, /@import ['"]tailwindcss['"]/);
  assert.match(input, /@theme/);
  assert.doesNotMatch(input, /@apply|\.(?:workspace|message|sidebar)\s*\{/);
  const html = await read('public/index.html');
  assert.doesNotMatch(html, /<style|style=|cdn\.tailwindcss/);
  assert.match(await read('public/styles.css'), /tailwindcss v4/);
  const sprite = await read('public/icons.svg');
  for (const name of ['compass', 'menu', 'panel-right', 'trash-2', 'arrow-up']) {
    assert.ok(sprite.includes('id="' + name + '"'));
  }
});

test('native blocking JS prompts and test auth never enter the production frontend', async () => {
  const source = await read('public/app.js');
  assert.doesNotMatch(source, /\b(?:confirm|prompt)\s*\(/);
  assert.doesNotMatch(source, /connectAuthEmulator|__test\/|synthetic-layout-user/);
  const docker = await read('Dockerfile');
  assert.doesNotMatch(docker, /COPY scripts \.\/scripts/);
  assert.match(docker, /npm run build/);
  assert.match(docker, /npm prune --omit=dev/);
  assert.match(docker, /USER app/);
});

test('layout uses one CSS breakpoint source and only measures the on-screen keyboard', async () => {
  const source = await read('public/workspace-layout.js');
  assert.doesNotMatch(source, /matchMedia/);
  assert.match(source, /getComputedStyle/);
  assert.match(source, /keyboardViewportHeight/);
  const html = await read('public/index.html');
  assert.match(html, /@min-\[64rem\]\/workspace/);
  assert.match(html, /@min-\[90rem\]\/workspace/);
});
