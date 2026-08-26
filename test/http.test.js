import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../src/server.js');

async function withServer(run) {
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const { port } = server.address();
  try { await run(`http://127.0.0.1:${port}`); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

test('health endpoint exposes no environment detail', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok', service: 'northstar-vault', version: '1.0.0' });
  });
});

test('private endpoints fail closed without a Firebase token', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/private/sessions`);
    assert.equal(response.status, 401);
    assert.equal((await response.json()).error, 'Sign in is required.');
  });
});

test('security headers are present on the public app', async () => {
  await withServer(async (base) => {
    const response = await fetch(base);
    assert.match(response.headers.get('content-security-policy'), /default-src 'self'/);
    assert.equal(response.headers.get('cross-origin-opener-policy'), 'same-origin-allow-popups');
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  });
});
