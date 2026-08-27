import test, { after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

const projectId = 'demo-northstar-security';
// This suite must never authenticate to or erase a real project.
assert.equal(process.env.GCLOUD_PROJECT, projectId);
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8086');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9096');
process.env.NODE_ENV = 'test';
const { createApp } = await import('../src/server.js');
const { db } = await import('../src/firebase.js');
const { normalize } = await import('../src/ai.js');
let rules;
let alice;
let bob;
const analysis = normalize({ reply: 'Deterministic test reply', title: 'Synthetic test' });

async function account(label) {
  const response = await fetch('http://127.0.0.1:9096/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-only', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: `${label}-${Date.now()}@northstar.invalid`, password: 'emulator-only-not-a-secret', returnSecureToken: true })
  });
  assert.equal(response.status, 200);
  const { localId: uid, idToken: token } = await response.json();
  return { uid, token };
}

async function withServer(run, generateReflection = async () => analysis) {
  const server = createApp({ generateReflection }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (user, path, method = 'GET', body) => fetch(base + path, {
    method, headers: { Authorization: `Bearer ${user.token}`, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    ...(body ? { body: JSON.stringify(body) } : {})
  });
  try { await run(request); }
  finally { await new Promise((resolve) => server.close(resolve)); }
}

async function seed(user, id) {
  const ref = db.collection('users').doc(user.uid).collection('sessions').doc(id);
  await ref.set({ title: `Synthetic ${id}`, createdAt: new Date(), updatedAt: new Date() });
  await ref.collection('messages').doc('synthetic-message').set({ role: 'user', text: 'Synthetic test data only', createdAt: new Date() });
  return ref;
}

before(async () => {
  rules = await initializeTestEnvironment({ projectId, firestore: { host: '127.0.0.1', port: 8086, rules: await readFile('firestore.rules', 'utf8') } });
  alice = await account('alice');
  bob = await account('bob');
});
after(async () => { await rules?.cleanup(); await db.terminate(); });

test('Firestore rules isolate two identities for reads, writes and deletion', async () => {
  const a = rules.authenticatedContext(alice.uid).firestore();
  const b = rules.authenticatedContext(bob.uid).firestore();
  const anonymous = rules.unauthenticatedContext().firestore();
  const path = `users/${alice.uid}/sessions/rules-only-session`;
  await seed(alice, 'rules-only-session');
  await assertSucceeds(getDoc(doc(a, path)));
  await assertFails(getDoc(doc(b, path)));
  await assertFails(setDoc(doc(b, path), { title: 'Not allowed' }));
  await assertFails(deleteDoc(doc(b, path)));
  await assertFails(getDoc(doc(anonymous, path)));
  await assertFails(setDoc(doc(a, 'unmatched/denied'), { value: true }));
});

test('direct client writes cannot bypass server validation, confirmation or erasure locks', async () => {
  const a = rules.authenticatedContext(alice.uid).firestore();
  const message = doc(a, `users/${alice.uid}/sessions/rules-only-session/messages/append-only`);
  await db.doc(message.path).set({ role: 'assistant', text: 'Original' });
  await assertFails(setDoc(message, { role: 'assistant', text: 'Forged' }));
  await assertFails(updateDoc(message, { text: 'Changed' }));
  await assertFails(deleteDoc(message));
  await assertFails(setDoc(doc(a, `users/${alice.uid}`), { erasing: false, dataEpoch: 'bypass' }));
  await assertFails(deleteDoc(doc(a, `users/${alice.uid}/sessions/rules-only-session`)));
});

test('real verified emulator tokens cannot read, append to or delete another user session', async () => {
  const id = 'alice-private-session';
  await seed(alice, id);
  await withServer(async (request) => {
    assert.equal((await request(alice, `/api/private/sessions/${id}`)).status, 200);
    assert.equal((await request(bob, `/api/private/sessions/${id}`)).status, 404);
    assert.equal((await request(bob, '/api/private/chat', 'POST', { sessionId: id, message: 'Unauthorized append attempt' })).status, 404);
    assert.equal((await request(bob, `/api/private/sessions/${id}`, 'DELETE', { confirmation: 'DELETE REFLECTION' })).status, 404);
    const list = await (await request(bob, '/api/private/sessions')).json();
    assert.ok(!list.sessions.some((session) => session.id === id));
    const exported = await (await request(bob, '/api/private/export')).json();
    assert.ok(!exported.sessions.some((session) => session.id === id));
  });
});

test('forged or revoked tokens and client-supplied user IDs are rejected', async () => {
  const { auth } = await import('../src/firebase.js');
  await withServer(async (request) => {
    assert.equal((await request({ token: 'not.a.valid.token' }, '/api/private/sessions')).status, 401);
    assert.equal((await request(alice, '/api/private/chat', 'POST', { message: 'Synthetic', uid: bob.uid })).status, 400);
    const revoked = await account('revoked');
    await auth.updateUser(revoked.uid, { disabled: true });
    assert.equal((await request(revoked, '/api/private/sessions')).status, 401);
  });
});

test('single deletion requires confirmation and removes messages without affecting another account', async () => {
  const id = 'deletion-proof-session';
  const a = await seed(alice, id);
  const b = await seed(bob, id);
  await withServer(async (request) => {
    assert.equal((await request(alice, `/api/private/sessions/${id}`, 'DELETE')).status, 400);
    assert.equal((await request(alice, `/api/private/sessions/${id}`, 'DELETE', { confirmation: 'NO' })).status, 400);
    assert.equal((await request(alice, `/api/private/sessions/${id}`, 'DELETE', { confirmation: 'DELETE REFLECTION' })).status, 204);
    assert.equal((await request(alice, `/api/private/sessions/${id}`)).status, 404);
  });
  assert.equal((await a.get()).exists, false);
  assert.equal((await a.collection('messages').get()).empty, true);
  assert.equal((await b.get()).exists, true);
  assert.equal((await b.collection('messages').get()).size, 1);
});

test('whole-vault erasure requires the exact phrase and erases only that user', async () => {
  const a1 = await seed(alice, 'erase-vault-session-one');
  const a2 = await seed(alice, 'erase-vault-session-two');
  const b = await seed(bob, 'bob-survives-erasure');
  await withServer(async (request) => {
    assert.equal((await request(alice, '/api/private/data', 'DELETE')).status, 400);
    assert.equal((await request(alice, '/api/private/data', 'DELETE', { confirmation: 'erase my vault' })).status, 400);
    assert.equal((await request(alice, '/api/private/data', 'DELETE', { confirmation: 'ERASE MY VAULT' })).status, 204);
    assert.deepEqual((await (await request(alice, '/api/private/export')).json()).sessions, []);
    assert.deepEqual((await (await request(alice, '/api/private/sessions')).json()).sessions, []);
  });
  for (const ref of [a1, a2]) {
    assert.equal((await ref.get()).exists, false);
    assert.equal((await ref.collection('messages').get()).empty, true);
  }
  assert.equal((await b.get()).exists, true);
  assert.equal((await b.collection('messages').get()).size, 1);
  const marker = (await db.collection('users').doc(alice.uid).get()).data();
  assert.deepEqual(Object.keys(marker).sort(), ['dataEpoch', 'erasing']);
});

for (const target of ['reflection', 'vault']) {
  test(`late AI output cannot recreate an erased ${target}`, async () => {
    const id = `concurrent-${target}-session`;
    const ref = await seed(alice, id);
    let signalStarted;
    let release;
    const started = new Promise((resolve) => { signalStarted = resolve; });
    const pending = new Promise((resolve) => { release = resolve; });
    await withServer(async (request) => {
      const reply = request(alice, '/api/private/chat', 'POST', { sessionId: id, message: 'Synthetic in-flight reflection' });
      await started;
      const endpoint = target === 'vault' ? '/api/private/data' : `/api/private/sessions/${id}`;
      const confirmation = target === 'vault' ? 'ERASE MY VAULT' : 'DELETE REFLECTION';
      assert.equal((await request(alice, endpoint, 'DELETE', { confirmation })).status, 204);
      release();
      assert.equal((await reply).status, 409);
    }, async () => { signalStarted(); await pending; return analysis; });
    assert.equal((await ref.get()).exists, false);
    assert.equal((await ref.collection('messages').get()).empty, true);
  });
}

test('upstream errors cannot leak credentials or journal text to logs or responses', async () => {
  const logs = [];
  const original = console.error;
  console.error = (line) => logs.push(line);
  try {
    await withServer(async (request) => {
      const response = await request(bob, '/api/private/chat', 'POST', { message: 'Synthetic private text' });
      assert.equal(response.status, 500);
      assert.doesNotMatch(await response.text(), /DUMMY_SENSITIVE_VALUE|Synthetic private text/);
    }, async () => { throw new Error('DUMMY_SENSITIVE_VALUE Synthetic private text'); });
  } finally { console.error = original; }
  assert.equal(logs.length, 1);
  assert.doesNotMatch(logs.join(''), /DUMMY_SENSITIVE_VALUE|Synthetic private text/);
});
