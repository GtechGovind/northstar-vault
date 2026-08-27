import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createPrivacyReceipt } from '../public/privacy-receipt.js';

// Unit harness only: execute the real frontend with inert DOM/Firebase doubles.
// Browser sign-in itself is verified separately against the live deployment.
const source = (await readFile(new URL('../public/app.js', import.meta.url), 'utf8'))
  .replace(/^import[\s\S]*?;\n/gm, '')
  .replace(/\nboot\(\);\s*$/, '');

function harness(fetchImpl, makeReceipt = createPrivacyReceipt) {
  const nodes = new Map();
  const downloads = [];
  function node() {
    const classes = new Set();
    return {
      textContent: '',
      innerHTML: '',
      value: '',
      children: [],
      style: {
        removeProperty(name) {
          delete this[name];
        },
      },
      dataset: {},
      disabled: false,
      scrollHeight: 100,
      scrollTop: 0,
      clientHeight: 100,
      classList: {
        add: (...values) => values.forEach((v) => classes.add(v)),
        remove: (...values) => values.forEach((v) => classes.delete(v)),
        contains: (v) => classes.has(v),
        toggle: (v, force) => {
          if (force ?? !classes.has(v)) classes.add(v);
          else classes.delete(v);
        },
      },
      replaceChildren(...children) {
        this.children = children;
        this.textContent = '';
        this.innerHTML = '';
      },
      append(...children) {
        children.forEach((child) => {
          child.remove();
          child.parent = this;
          this.children.push(child);
        });
      },
      addEventListener() {},
      removeAttribute(name) {
        delete this[name];
      },
      setAttribute(name, value) {
        this[name] = value;
      },
      getAttribute(name) {
        return this[name];
      },
      focus() {},
      close() {
        this.open = false;
      },
      showModal() {
        this.open = true;
      },
      remove() {
        if (this.parent)
          this.parent.children = this.parent.children.filter((child) => child !== this);
      },
      scrollTo({ top }) {
        this.scrollTop = top;
      },
      click() {},
    };
  }
  const select = (id) => {
    if (!nodes.has(id)) nodes.set(id, node());
    return nodes.get(id);
  };
  const context = vm.createContext({
    document: {
      querySelector: select,
      querySelectorAll: () => [],
      createElement: node,
      body: node(),
    },
    Headers,
    DOMException,
    Blob,
    AbortController,
    window: {
      matchMedia: () => ({ matches: false, addEventListener() {} }),
      addEventListener() {},
    },
    navigator: { onLine: true, clipboard: { writeText: async () => {} } },
    URL: {
      createObjectURL: (blob) => {
        downloads.push(blob);
        return 'blob:synthetic';
      },
      revokeObjectURL() {},
    },
    fetch: fetchImpl,
    createPrivacyReceipt: makeReceipt,
    console,
    setTimeout: () => 1,
    clearTimeout() {},
    confirm: () => true,
    prompt: () => 'ERASE MY VAULT',
  });
  vm.runInContext(source, context);
  vm.runInContext("state.user = { uid: 'alice', getIdToken: async () => 'test-token' }", context);
  return { run: (code) => vm.runInContext(code, context), select, downloads };
}

test('sign-out clears private DOM, composer, identity and in-memory session state', () => {
  const app = harness();
  app.run(
    "state.sessions = [{id:'private-id'}]; state.sessionId = 'private-id'; state.busy = true;",
  );
  for (const id of ['#messages', '#signal-content', '#profile-name', '#profile-email'])
    app.select(id).textContent = 'SYNTHETIC PRIVATE';
  app.select('#message-input').value = 'Unsent private draft';
  app.select('#profile-photo').src = 'private-photo';
  app.run('state.user = null; showLanding()');
  assert.equal(app.run('state.sessions.length'), 0);
  assert.equal(app.run('state.sessionId'), null);
  assert.equal(app.run('state.busy'), false);
  assert.equal(app.select('#message-input').value, '');
  assert.equal(app.select('#profile-photo').src, undefined);
  for (const id of ['#messages', '#signal-content', '#profile-name', '#profile-email'])
    assert.equal(app.select(id).textContent, '');
});

for (const operation of [
  'loadSessions()',
  "openSession('synthetic-session')",
  "sendReflection('Synthetic reflection')",
  'exportData()',
]) {
  test(`late ${operation} result cannot repopulate or export after sign-out`, async () => {
    let resolveFetch;
    let requested;
    const started = new Promise((resolve) => {
      requested = resolve;
    });
    const pending = new Promise((resolve) => {
      resolveFetch = resolve;
    });
    const app = harness(() => {
      requested();
      return pending;
    });
    const operationResult = app.run(operation);
    await started;
    app.run('state.user = null; showLanding()');
    resolveFetch({
      ok: true,
      status: 200,
      json: async () => ({
        sessions: [{ id: 'private-id' }],
        messages: [{ role: 'user', text: 'PRIVATE' }],
        sessionId: 'private-id',
        analysis: { reply: 'PRIVATE' },
      }),
      text: async () => 'SYNTHETIC PRIVATE',
    });
    await operationResult;
    assert.equal(app.run('state.sessionId'), null);
    assert.equal(app.run('state.sessions.length'), 0);
    assert.equal(app.select('#messages').children.length, 0);
    assert.equal(app.select('#toast').textContent, '');
    assert.equal(app.downloads.length, 0);
  });
}

test('switching accounts while obtaining a token prevents sending the old request', async () => {
  let calls = 0;
  const app = harness(() => {
    calls += 1;
  });
  app.run('state.user.getIdToken = () => new Promise(resolve => { tokenReady = resolve; })');
  const request = app.run("api('/api/private/sessions')");
  app.run("state.user = {uid: 'bob'}; tokenReady('alice-token')");
  await assert.rejects(request, { name: 'AbortError' });
  assert.equal(calls, 0);
});

const emptyExport = '{"exportedAt":"2026-08-27T16:00:00.000Z","sessions":[]}';

test('export and receipt hash the exact same downloaded bytes', async () => {
  const app = harness(async () => ({ ok: true, status: 200, text: async () => emptyExport }));
  await app.run('exportData()');
  assert.equal(app.downloads.length, 1);
  assert.equal(await app.downloads[0].text(), emptyExport);
  assert.equal(app.run('state.receipt.sha256'), (await createPrivacyReceipt(emptyExport)).sha256);
  assert.equal(app.select('#privacy-receipt').classList.contains('hidden'), false);
  app.run('showLanding()');
  assert.equal(app.run('state.receipt'), null);
  assert.equal(app.select('#receipt-sha256').textContent, '');
});

test('a receipt failure does not block data export or falsely display a checksum', async () => {
  const app = harness(
    async () => ({ ok: true, status: 200, text: async () => emptyExport }),
    async () => {
      throw new Error('failure');
    },
  );
  await app.run('exportData()');
  assert.equal(app.downloads.length, 1);
  assert.equal(app.run('state.receipt'), null);
  assert.match(app.select('#receipt-status').textContent, /no integrity receipt/);
  assert.equal(app.select('#privacy-receipt').classList.contains('hidden'), true);
});

test('cancelling while hashing prevents both the download and a late receipt', async () => {
  let release;
  let started;
  const hashing = new Promise((resolve) => {
    started = resolve;
  });
  const app = harness(
    async () => ({ ok: true, status: 200, text: async () => emptyExport }),
    () => {
      started();
      return new Promise((resolve) => {
        release = resolve;
      });
    },
  );
  const work = app.run('exportData()');
  await hashing;
  app.run('clearReceipt()');
  release(await createPrivacyReceipt(emptyExport));
  await work;
  assert.equal(app.downloads.length, 0);
  assert.equal(app.run('state.receipt'), null);
  assert.equal(app.select('#export-data').disabled, false);
});

test('a failed authenticated export starts no download and creates no receipt', async () => {
  const app = harness(async () => ({
    ok: false,
    status: 500,
    json: async () => ({ error: 'failure' }),
  }));
  await app.run('exportData()');
  assert.equal(app.downloads.length, 0);
  assert.equal(app.run('state.receipt'), null);
  assert.match(app.select('#receipt-status').textContent, /Export failed/);
});

test('failed chat restores its draft without inventing an assistant response', async () => {
  const app = harness(async () => ({
    ok: false,
    status: 503,
    json: async () => ({ error: 'unavailable' }),
  }));
  await app.run("sendReflection('Keep this unsent reflection')");
  assert.equal(app.select('#message-input').value, 'Keep this unsent reflection');
  assert.equal(app.select('#messages').children.length, 0);
  assert.match(app.select('#composer-feedback').textContent, /draft has been restored/);
  assert.equal(app.run('state.busy'), false);
  assert.equal(app.select('#send-button').disabled, false);
});

test('offline and empty drafts cannot make a chat request', async () => {
  let calls = 0;
  const app = harness(() => {
    calls++;
  });
  await app.run("sendReflection('   ')");
  app.run('navigator.onLine = false');
  await app.run("sendReflection('An offline draft')");
  assert.equal(calls, 0);
  assert.match(app.select('#composer-feedback').textContent, /offline/);
});

test('mobile drawers move one panel, restore it, and report their expanded state', () => {
  const app = harness();
  app.run("openDrawer('history')");
  assert.equal(app.select('#history-dialog').open, true);
  assert.equal(app.select('#sidebar').parent, app.select('#history-dialog'));
  assert.equal(app.select('#open-history')['aria-expanded'], 'true');
  app.run("closeDrawer('history')");
  assert.equal(app.select('#history-dialog').open, false);
  assert.equal(app.select('#sidebar').parent, app.select('#history-slot'));
  assert.equal(app.select('#open-history')['aria-expanded'], 'false');
});

test('a confirmation alone cannot delete data; cancel clears its target', async () => {
  let calls = 0;
  const app = harness(() => {
    calls++;
  });
  app.run("state.sessionId = 'synthetic-one'");
  await app.run('deleteCurrentSession()');
  assert.equal(app.select('#confirm-dialog').open, true);
  assert.equal(calls, 0);
  app.run('cancelConfirmation()');
  assert.equal(app.run('state.confirmation'), null);
  assert.equal(app.select('#confirm-dialog').open, false);
  assert.equal(app.select('#confirm-target').textContent, '');
});

test('a changed reflection invalidates an earlier deletion confirmation', async () => {
  let calls = 0;
  const app = harness(() => {
    calls++;
  });
  app.run(
    "state.sessionId = 'synthetic-one'; showConfirmation('reflection'); state.sessionId = 'synthetic-two'; state.viewEpoch++",
  );
  await app.run('confirmDeletion()');
  assert.equal(calls, 0);
  assert.equal(app.run('state.confirmation'), null);
  assert.match(app.select('#toast').textContent, /Nothing was deleted/);
});

test('vault erasure requires the exact phrase and uses the authenticated API', async () => {
  const requests = [];
  const app = harness(async (path, options) => {
    requests.push({ path, options });
    return {
      ok: true,
      status: options?.method === 'DELETE' ? 204 : 200,
      json: async () => ({ sessions: [] }),
    };
  });
  app.run("showConfirmation('vault')");
  app.select('#confirm-phrase').value = 'erase my vault';
  await app.run('confirmDeletion()');
  assert.equal(requests.length, 0);
  app.select('#confirm-phrase').value = 'ERASE MY VAULT';
  await app.run('confirmDeletion()');
  assert.equal(requests[0].path, '/api/private/data');
  assert.equal(requests[0].options.body, '{"confirmation":"ERASE MY VAULT"}');
  assert.equal(app.select('#confirm-dialog').open, false);
});

test('sign-out clears drafts and private confirmation contents across every panel', () => {
  const app = harness();
  app.run(
    "state.drafts.set('private', 'Private draft'); showConfirmation('vault'); openDrawer('signal'); state.user = null; showLanding()",
  );
  assert.equal(app.run('state.drafts.size'), 0);
  assert.equal(app.run('state.confirmation'), null);
  assert.equal(app.select('#confirm-target').textContent, '');
  assert.equal(app.select('#signal-dialog').open, false);
  assert.equal(app.select('#confirm-dialog').open, false);
});

test('switching between reflections preserves unsent drafts only in memory', async () => {
  const app = harness(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ messages: [] }),
  }));
  app.select('#message-input').value = 'My new reflection draft';
  await app.run("openSession('synthetic-one')");
  app.select('#message-input').value = 'Follow-up draft';
  app.run('beginNewReflection()');
  assert.equal(app.select('#message-input').value, 'My new reflection draft');
  assert.equal(app.run("state.drafts.get('synthetic-one')"), 'Follow-up draft');
});

test('a direct Firebase account switch clears the previous account before loading', async () => {
  const app = harness(async () => ({
    ok: true,
    status: 200,
    json: async () => ({ sessions: [] }),
  }));
  app.run(
    "state.drafts.set('new', 'Account A private draft'); state.sessions = [{id: 'alice-private'}]",
  );
  await app.run(
    "handleAuthChange({uid: 'bob', displayName: 'Bob', email: 'bob@northstar.invalid', getIdToken: async () => 'bob-token'})",
  );
  assert.equal(app.run('state.drafts.size'), 0);
  assert.equal(app.run('state.sessions.length'), 0);
  assert.equal(app.select('#message-input').value, '');
  assert.equal(app.select('#profile-name').textContent, 'Bob');
});
