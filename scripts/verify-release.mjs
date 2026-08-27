import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

// Read-only deployment checks. No tokens, private content, or write requests.
assert.ok(process.argv[2], 'Usage: npm run verify:release -- https://your-service.run.app');
const base = new URL(process.argv[2]);
assert.ok(
  base.protocol === 'https:' ||
    (base.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(base.hostname)),
  'Use HTTPS, or an explicit loopback development server.',
);
assert.ok(!base.username && !base.password, 'Do not pass credentials in the URL.');
const get = (path) => fetch(new URL(path, base), { signal: AbortSignal.timeout(20000) });
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');

const health = await get('/api/health');
assert.equal(health.status, 200);
assert.equal((await health.json()).status, 'ok');
console.log('Health: 200');

for (const path of ['/api/private/sessions', '/api/private/export']) {
  const response = await get(path);
  assert.equal(response.status, 401, 'Anonymous private access must fail closed.');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  console.log(path + ': 401, no-store');
}

const config = await get('/api/config');
assert.equal(config.status, 200);
assert.deepEqual(Object.keys(await config.json()).sort(), [
  'apiKey',
  'appId',
  'authDomain',
  'projectId',
]);
console.log('Public configuration: Firebase fields only (values not printed)');

for (const file of [
  'index.html',
  'app.js',
  'workspace-layout.js',
  'styles.css',
  'icons.svg',
  'privacy-receipt.js',
]) {
  const response = await get(file === 'index.html' ? '/' : '/' + file);
  assert.equal(response.status, 200);
  const deployed = Buffer.from(await response.arrayBuffer());
  const expected = await readFile(new URL('../public/' + file, import.meta.url));
  assert.equal(digest(deployed), digest(expected), file + ' differs from the verified checkout.');
  if (file === 'index.html') {
    assert.equal(response.headers.get('cache-control'), 'no-cache');
    assert.match(response.headers.get('content-security-policy') || '', /default-src 'self'/);
    assert.match(response.headers.get('content-security-policy') || '', /object-src 'none'/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  }
  console.log(file + ': exact asset match');
}
console.log('Read-only release checks passed. Verify signed-in behavior separately.');
