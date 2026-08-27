import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';

// Unit harness only: execute the real frontend with inert DOM/Firebase doubles.
// Browser sign-in itself is verified separately against the live deployment.
const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8'))
  .replace(/^import .*;\n/gm, '').replace(/\nboot\(\);\s*$/, '');

function harness(fetchImpl) {
  const nodes = new Map();
  function node() {
    const classes = new Set();
    return {
      textContent: '', innerHTML: '', value: '', children: [], style: {}, disabled: false,
      classList: { add: (v) => classes.add(v), remove: (v) => classes.delete(v), contains: (v) => classes.has(v) },
      replaceChildren(...children) { this.children = children; this.textContent = ''; this.innerHTML = ''; },
      append(...children) { this.children.push(...children); },
      addEventListener() {}, removeAttribute(name) { delete this[name]; },
      focus() {}, close() {}, remove() {}, scrollIntoView() {}, click() {}
    };
  }
  const select = (id) => { if (!nodes.has(id)) nodes.set(id, node()); return nodes.get(id); };
  const context = vm.createContext({
    document: { querySelector: select, querySelectorAll: () => [], createElement: node },
    Headers, DOMException, URL, fetch: fetchImpl, console,
    setTimeout: () => 1, clearTimeout() {}, confirm: () => true, prompt: () => 'ERASE MY VAULT'
  });
  vm.runInContext(source, context);
  vm.runInContext("state.user = { uid: 'alice', getIdToken: async () => 'test-token' }", context);
  return { run: (code) => vm.runInContext(code, context), select };
}

test('sign-out clears private DOM, composer, identity and in-memory session state', () => {
  const app = harness();
  app.run("state.sessions = [{id:'private-id'}]; state.sessionId = 'private-id'; state.busy = true;");
  for (const id of ['#messages', '#signal-content', '#profile-name', '#profile-email']) app.select(id).textContent = 'SYNTHETIC PRIVATE';
  app.select('#message-input').value = 'Unsent private draft';
  app.select('#profile-photo').src = 'private-photo';
  app.run('state.user = null; showLanding()');
  assert.equal(app.run('state.sessions.length'), 0);
  assert.equal(app.run('state.sessionId'), null);
  assert.equal(app.run('state.busy'), false);
  assert.equal(app.select('#message-input').value, '');
  assert.equal(app.select('#profile-photo').src, undefined);
  for (const id of ['#messages', '#signal-content', '#profile-name', '#profile-email']) assert.equal(app.select(id).textContent, '');
});

for (const operation of ['loadSessions()', "openSession('synthetic-session')", "sendReflection('Synthetic reflection')", 'exportData()']) {
  test(`late ${operation} result cannot repopulate or export after sign-out`, async () => {
    let resolveFetch;
    let requested;
    const started = new Promise((resolve) => { requested = resolve; });
    const pending = new Promise((resolve) => { resolveFetch = resolve; });
    const app = harness(() => { requested(); return pending; });
    const operationResult = app.run(operation);
    await started;
    app.run('state.user = null; showLanding()');
    resolveFetch({
      ok: true, status: 200,
      json: async () => ({ sessions: [{ id: 'private-id' }], messages: [{role: 'user', text: 'PRIVATE'}], sessionId: 'private-id', analysis: {reply: 'PRIVATE'} }),
      blob: async () => ({}) // URL.createObjectURL would throw if the guard failed.
    });
    await operationResult;
    assert.equal(app.run('state.sessionId'), null);
    assert.equal(app.run('state.sessions.length'), 0);
    assert.equal(app.select('#messages').children.length, 0);
    assert.equal(app.select('#toast').textContent, '');
  });
}

test('switching accounts while obtaining a token prevents sending the old request', async () => {
  let calls = 0;
  const app = harness(() => { calls += 1; });
  app.run("state.user.getIdToken = () => new Promise(resolve => { tokenReady = resolve; })");
  const request = app.run("api('/api/private/sessions')");
  app.run("state.user = {uid: 'bob'}; tokenReady('alice-token')");
  await assert.rejects(request, { name: 'AbortError' });
  assert.equal(calls, 0);
});
