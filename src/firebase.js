import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

if (
  process.env.K_SERVICE &&
  (process.env.FIREBASE_AUTH_EMULATOR_HOST || process.env.FIRESTORE_EMULATOR_HOST)
) {
  throw new Error('Emulator configuration is forbidden on Cloud Run');
}

const app = getApps()[0] || initializeApp({ credential: applicationDefault() });

export const auth = getAuth(app);
export const db = getFirestore(app);

/** Validate signature, expiry, revocation, and disabled-user status on every request. */
export async function verifyFirebaseToken(req, res, next) {
  const header = req.get('authorization') || '';
  const match = header.match(/^Bearer ([A-Za-z0-9._-]+)$/);
  if (!match) return res.status(401).json({ error: 'Sign in is required.' });

  try {
    req.user = await auth.verifyIdToken(match[1], true);
    return next();
  } catch {
    return res
      .status(401)
      .json({ error: 'Your session is invalid or expired. Please sign in again.' });
  }
}

/** Only pass a UID obtained from verified Firebase Admin claims. */
export function userSessions(uid) {
  return db.collection('users').doc(uid).collection('sessions');
}

export async function deleteCollection(collection, batchSize = 100) {
  while (true) {
    const snapshot = await collection.limit(batchSize).get();
    if (snapshot.empty) return;
    const batch = db.batch();
    snapshot.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
}
