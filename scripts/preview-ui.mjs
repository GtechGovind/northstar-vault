// Local-only browser QA: real frontend + authenticated emulator API.
// Never imported by the application or copied into its Docker image.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import express from 'express';

assert.equal(process.env.GCLOUD_PROJECT, 'demo-northstar-security');
assert.equal(process.env.FIRESTORE_EMULATOR_HOST, '127.0.0.1:8086');
assert.equal(process.env.FIREBASE_AUTH_EMULATOR_HOST, '127.0.0.1:9096');
assert.ok(!process.env.K_SERVICE, 'Local QA must not run on Cloud Run');
process.env.NODE_ENV = 'test';
const { createApp } = await import('../src/server.js');
const { auth, db } = await import('../src/firebase.js');
const { normalize } = await import('../src/ai.js');
const email = 'layout-check@northstar.invalid';
const password = 'emulator-only-not-a-real-password';
const user = await auth.createUser({
  uid: 'synthetic-layout-user',
  email,
  password,
  displayName: 'Layout Test',
});
const analysis = normalize({
  title: 'Making room for a focused first release',
  reply:
    'There are two things here: what the first release needs to do, and how much certainty you need before sharing it. They don’t have to be solved at the same time.\n\nYour three testers completed the core journey. That’s useful evidence. It doesn’t promise that everything will work for everyone, but it gives you a starting point.\n\nYou could invite five people to a small, time-limited beta. Ask each person to complete one meaningful task without your help, then write down where they hesitate.\n\nWhat would you need to learn from those five people to feel ready for the next step?',
  signals: {
    facts: ['Three people completed the core flow.', 'The release date has moved twice.'],
    assumptions: ['Every rough edge must be fixed before anyone can try it.'],
    tensions: ['Quality matters, and so does learning from real use.'],
    options: [
      'Invite five people to a private beta.',
      'Fix the one issue most likely to block their task.',
    ],
    counterpoint:
      'Another week of polishing may be less informative than one carefully observed session.',
    nextExperiment: {
      action: 'Run a 48-hour beta with five people.',
      why: 'Observe the real friction before choosing what to polish next.',
      checkIn: 'How many finish the core task without help?',
    },
  },
  compass: { clarity: 4, agency: 3, energy: 3 },
  tags: ['launch', 'decision'],
});
const session = db
  .collection('users')
  .doc(user.uid)
  .collection('sessions')
  .doc('synthetic-layout-session');
await session.set({
  title: analysis.title,
  tags: analysis.tags,
  createdAt: new Date(),
  updatedAt: new Date(),
});
for (let index = 0; index < 8; index++) {
  await session
    .collection('messages')
    .doc('message-' + index)
    .set({
      role: index % 2 ? 'assistant' : 'user',
      text:
        index % 2
          ? analysis.reply
          : 'Synthetic layout test: I have a small product ready, but I keep postponing the first release. I want to separate what needs improving from what needs testing.',
      ...(index % 2 && { analysis }),
      createdAt: new Date(Date.now() + index),
    });
}
const preview = express();
preview.get('/', async (req, res, next) => {
  if (req.query.audit !== '1') return next();
  const html = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
  res
    .type('html')
    .send(
      html.replace(
        '</body>',
        '<script src="/__test/axe.js"></script><script src="/__test/audit-ui.js"></script></body>',
      ),
    );
});
preview.get('/__test/axe.js', async (_req, res) =>
  res
    .type('js')
    .send(await readFile(new URL('../node_modules/axe-core/axe.min.js', import.meta.url), 'utf8')),
);
preview.get('/__test/audit-ui.js', async (_req, res) =>
  res.type('js').send(await readFile(new URL('./audit-ui.js', import.meta.url), 'utf8')),
);
preview.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  const setHeader = res.setHeader.bind(res);
  res.setHeader = (name, value) =>
    setHeader(
      name,
      name.toLowerCase() === 'content-security-policy'
        ? String(value)
            .replace('connect-src ', 'connect-src http://127.0.0.1:9096 ')
            .replace('upgrade-insecure-requests', '')
        : value,
    );
  next();
});
preview.get('/api/config', (_req, res) =>
  res.json({
    apiKey: 'emulator-only',
    projectId: 'demo-northstar-security',
    authDomain: 'localhost',
    appId: 'emulator-only',
  }),
);
preview.get('/app.js', async (_req, res) => {
  const source = await readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  res
    .type('js')
    .send(
      source.replace(
        'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js',
        '/__test/auth.js',
      ),
    );
});
preview.get('/__test/auth.js', (_req, res) =>
  res.type('js').send(`
  import { getAuth as firebaseAuth, connectAuthEmulator, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
  export { GoogleAuthProvider, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/11.0.2/firebase-auth.js';
  export function getAuth(app) { const auth = firebaseAuth(app); connectAuthEmulator(auth, 'http://127.0.0.1:9096', { disableWarnings: true }); return auth; }
  export async function getRedirectResult() { return null; }
  export function signInWithPopup(auth) { return signInWithEmailAndPassword(auth, '${email}', '${password}'); }
  export const signInWithRedirect = signInWithPopup;
`),
);
preview.use(
  createApp({
    generateReflection: async ({ message }) => {
      await new Promise((resolve) => setTimeout(resolve, 1800));
      if (message === 'Synthetic failure test') throw new Error('Synthetic emulator failure');
      return analysis;
    },
  }),
);
preview.listen(3035, '127.0.0.1', () =>
  console.log(
    'LOCAL EMULATOR QA ONLY: http://127.0.0.1:3035 — synthetic identity; no real cloud or AI calls.',
  ),
);
