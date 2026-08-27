import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import helmet from 'helmet';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { reflect } from './ai.js';
import { db, deleteCollection, userSessions, verifyFirebaseToken } from './firebase.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const authScriptOrigins = [
  "'self'",
  'https://www.gstatic.com',
  'https://apis.google.com',
  'https://accounts.google.com',
];
class RequestConflict extends Error {}

/**
 * Compose the API without opening a port, so tests can use an isolated server.
 * Model injection is a server-side test seam, never a request-controlled option.
 * All private routes verify identity before deriving owner-scoped storage paths.
 */
export function createApp({ generateReflection = reflect } = {}) {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(
    helmet({
      crossOriginEmbedderPolicy: false,
      crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: authScriptOrigins,
          scriptSrcElem: authScriptOrigins,
          connectSrc: [
            "'self'",
            'https://www.gstatic.com',
            'https://apis.google.com',
            'https://accounts.google.com',
            'https://*.googleapis.com',
            'https://*.firebaseapp.com',
            'https://securetoken.googleapis.com',
          ],
          frameSrc: ["'self'", 'https://*.firebaseapp.com', 'https://accounts.google.com'],
          imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
          styleSrc: ["'self'", "'unsafe-inline'"],
          fontSrc: ["'self'", 'data:'],
          objectSrc: ["'none'"],
          baseUri: ["'none'"],
          formAction: ["'self'"],
        },
      },
      referrerPolicy: { policy: 'no-referrer' },
    }),
  );
  app.use(express.json({ limit: '32kb', type: 'application/json' }));
  app.use(
    express.static(path.join(__dirname, '..', 'public'), {
      etag: true,
      maxAge: process.env.NODE_ENV === 'production' ? '1h' : 0,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-cache');
      },
    }),
  );

  const apiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 60,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: 'Too many requests. Please pause for a moment.' },
  });
  const aiLimiter = rateLimit({
    windowMs: 60_000,
    limit: 10,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    keyGenerator: (req) => req.user?.uid || ipKeyGenerator(req.ip),
    message: { error: 'Reflection limit reached. Try again in a minute.' },
  });
  app.use('/api', apiLimiter);

  const idSchema = z.string().regex(/^[A-Za-z0-9_-]{8,80}$/);
  const chatSchema = z
    .object({
      message: z.string().trim().min(1).max(4000),
      sessionId: idSchema.optional(),
    })
    .strict();

  function toISO(timestamp) {
    return timestamp?.toDate ? timestamp.toDate().toISOString() : null;
  }

  function sessionJSON(doc) {
    const data = doc.data();
    return {
      id: doc.id,
      title: data.title || 'Untitled reflection',
      summary: data.summary || '',
      tags: data.tags || [],
      compass: data.compass || null,
      updatedAt: toISO(data.updatedAt),
      createdAt: toISO(data.createdAt),
    };
  }

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'northstar-vault', version: '1.0.0' });
  });

  app.get('/api/config', (_req, res) => {
    const config = {
      apiKey: process.env.FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT,
      appId: process.env.FIREBASE_APP_ID,
    };
    if (Object.values(config).some((value) => !value)) {
      return res.status(503).json({ error: 'Firebase web configuration is incomplete.' });
    }
    res.set('Cache-Control', 'public, max-age=300');
    return res.json(config);
  });

  app.use('/api/private', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use('/api/private', verifyFirebaseToken);

  app.get('/api/private/sessions', async (req, res, next) => {
    try {
      const snapshot = await userSessions(req.user.uid)
        .orderBy('updatedAt', 'desc')
        .limit(50)
        .get();
      res.json({ sessions: snapshot.docs.map(sessionJSON) });
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/private/sessions/:id', async (req, res, next) => {
    try {
      const id = idSchema.parse(req.params.id);
      const sessionRef = userSessions(req.user.uid).doc(id);
      const [session, messages] = await Promise.all([
        sessionRef.get(),
        sessionRef.collection('messages').orderBy('createdAt', 'asc').limit(100).get(),
      ]);
      if (!session.exists || session.get('deleting'))
        return res.status(404).json({ error: 'Reflection not found.' });
      return res.json({
        session: sessionJSON(session),
        messages: messages.docs.map((doc) => ({
          id: doc.id,
          role: doc.get('role'),
          text: doc.get('text'),
          analysis: doc.get('analysis') || null,
          createdAt: toISO(doc.get('createdAt')),
        })),
      });
    } catch (error) {
      next(error);
    }
  });

  app.post('/api/private/chat', aiLimiter, async (req, res, next) => {
    try {
      const input = chatSchema.parse(req.body);
      const sessions = userSessions(req.user.uid);
      const sessionRef = input.sessionId
        ? sessions.doc(input.sessionId)
        : sessions.doc(crypto.randomUUID());
      const userRef = db.collection('users').doc(req.user.uid);
      const prepared = await db.runTransaction(async (transaction) => {
        const user = await transaction.get(userRef);
        const existing = await transaction.get(sessionRef);
        if (user.get('erasing') || existing.get('deleting'))
          throw new RequestConflict('A deletion is in progress. Please retry afterwards.');
        if (input.sessionId && !existing.exists) return null;
        const historySnapshot = await transaction.get(
          sessionRef.collection('messages').orderBy('createdAt', 'desc').limit(10),
        );
        const epoch = user.get('dataEpoch') || crypto.randomUUID();
        transaction.set(userRef, { dataEpoch: epoch }, { merge: true });
        transaction.set(
          sessionRef,
          {
            title: existing.get('title') || 'Untitled reflection',
            createdAt: existing.get('createdAt') || FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
        transaction.create(sessionRef.collection('messages').doc(), {
          role: 'user',
          text: input.message,
          createdAt: FieldValue.serverTimestamp(),
        });
        return {
          epoch,
          history: historySnapshot.docs
            .reverse()
            .map((doc) => ({ role: doc.get('role'), text: doc.get('text') })),
        };
      });
      if (!prepared) return res.status(404).json({ error: 'Reflection not found.' });

      const analysis = await generateReflection({
        message: input.message,
        history: prepared.history,
      });
      await db.runTransaction(async (transaction) => {
        const user = await transaction.get(userRef);
        const current = await transaction.get(sessionRef);
        if (
          user.get('erasing') ||
          user.get('dataEpoch') !== prepared.epoch ||
          !current.exists ||
          current.get('deleting')
        ) {
          throw new RequestConflict(
            'This reflection was deleted while the reply was being generated. No reply was saved.',
          );
        }
        transaction.create(sessionRef.collection('messages').doc(), {
          role: 'assistant',
          text: analysis.reply,
          analysis,
          createdAt: FieldValue.serverTimestamp(),
        });
        transaction.set(
          sessionRef,
          {
            title: analysis.title,
            summary: analysis.summary,
            tags: analysis.tags,
            compass: analysis.compass,
            safetyEscalation: analysis.safetyEscalation,
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true },
        );
      });

      return res.json({ sessionId: sessionRef.id, analysis });
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/private/sessions/:id', async (req, res, next) => {
    try {
      z.object({ confirmation: z.literal('DELETE REFLECTION') })
        .strict()
        .parse(req.body);
      const id = idSchema.parse(req.params.id);
      const ref = userSessions(req.user.uid).doc(id);
      const exists = await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(ref);
        if (!doc.exists) return false;
        transaction.update(ref, { deleting: true });
        return true;
      });
      if (!exists) return res.status(404).json({ error: 'Reflection not found.' });
      await deleteCollection(ref.collection('messages'));
      await ref.delete();
      return res.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  app.get('/api/private/export', async (req, res, next) => {
    try {
      const snapshot = await userSessions(req.user.uid).orderBy('updatedAt', 'desc').get();
      const sessions = await Promise.all(
        snapshot.docs.map(async (doc) => {
          const messages = await doc.ref.collection('messages').orderBy('createdAt', 'asc').get();
          return {
            ...sessionJSON(doc),
            messages: messages.docs.map((item) => ({
              role: item.get('role'),
              text: item.get('text'),
              createdAt: toISO(item.get('createdAt')),
            })),
          };
        }),
      );
      res.set({
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="northstar-vault-export.json"',
        'Cache-Control': 'no-store',
      });
      return res.send(JSON.stringify({ exportedAt: new Date().toISOString(), sessions }, null, 2));
    } catch (error) {
      next(error);
    }
  });

  app.delete('/api/private/data', async (req, res, next) => {
    let erasureEpoch;
    const userRef = db.collection('users').doc(req.user.uid);
    try {
      z.object({ confirmation: z.literal('ERASE MY VAULT') })
        .strict()
        .parse(req.body);
      erasureEpoch = await db.runTransaction(async (transaction) => {
        const user = await transaction.get(userRef);
        if (user.get('erasing')) throw new RequestConflict('Vault erasure is already in progress.');
        const epoch = crypto.randomUUID();
        transaction.set(userRef, { dataEpoch: epoch, erasing: true }, { merge: true });
        return epoch;
      });
      const snapshot = await userSessions(req.user.uid).get();
      for (const session of snapshot.docs) {
        await deleteCollection(session.ref.collection('messages'));
        await session.ref.delete();
      }
      // Retain only an opaque epoch marker, not journal content. A late model
      // reply from before erasure must never recreate the user's deleted data.
      await userRef.set({ dataEpoch: erasureEpoch, erasing: false });
      return res.status(204).end();
    } catch (error) {
      if (erasureEpoch) {
        await userRef
          .set({ dataEpoch: erasureEpoch, erasing: false }, { merge: true })
          .catch(() => {});
      }
      next(error);
    }
  });

  app.use((error, req, res, _next) => {
    const requestId = crypto.randomUUID();
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Please check the submitted information.', requestId });
    }
    if (error instanceof RequestConflict)
      return res.status(409).json({ error: error.message, requestId });
    // Upstream error messages can contain request bodies or credential material.
    // Log neither message, stack, cause nor the user's URL parameters.
    console.error(
      JSON.stringify({
        severity: 'ERROR',
        requestId,
        route: req.route?.path || 'unmatched',
        error: 'REQUEST_FAILED',
      }),
    );
    const status = /not configured|invalid structured/.test(error.message) ? 503 : 500;
    return res.status(status).json({
      error:
        status === 503
          ? 'The reflection engine is temporarily unavailable.'
          : 'The request could not be completed. Refresh to check your saved data before retrying.',
      requestId,
    });
  });

  app.get('*splat', (_req, res) =>
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html')),
  );
  return app;
}

const app = createApp();
const port = Number(process.env.PORT || 8080);
if (process.env.NODE_ENV !== 'test') {
  app.listen(port, '0.0.0.0', () => console.log(`Northstar Vault listening on ${port}`));
}

export default app;
