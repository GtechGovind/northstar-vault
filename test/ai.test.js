import test from 'node:test';
import assert from 'node:assert/strict';
import { aiClientOptions, normalize, vertexEnabled } from '../src/ai.js';

test('normalizes and caps AI-controlled fields', () => {
  const result = normalize({
    reply: 'Useful reflection',
    title: 'A decision',
    summary: 'A useful summary',
    signals: {
      facts: ['one', 'two', 'three', 'four'],
      assumptions: ['maybe'],
      tensions: [],
      options: ['wait'],
      counterpoint: 'Try another frame',
      nextExperiment: { action: 'Ask one user', why: 'Get evidence', checkIn: 'A concrete answer' },
    },
    compass: { clarity: 99, agency: -2, energy: 3.4 },
    tags: ['Launch', 'Evidence'],
    safetyEscalation: false,
  });
  assert.deepEqual(result.signals.facts, ['one', 'two', 'three']);
  assert.deepEqual(result.compass, { clarity: 5, agency: 1, energy: 3 });
  assert.deepEqual(result.tags, ['launch', 'evidence']);
});

test('uses safe defaults for malformed structured output', () => {
  const result = normalize({});
  assert.equal(result.title, 'Untitled reflection');
  assert.equal(result.compass.clarity, 1);
  assert.equal(result.safetyEscalation, false);
});

test('recognizes explicit Vertex AI configuration', () => {
  const previous = process.env.GOOGLE_GENAI_USE_VERTEXAI;
  process.env.GOOGLE_GENAI_USE_VERTEXAI = 'true';
  assert.equal(vertexEnabled(), true);
  process.env.GOOGLE_GENAI_USE_VERTEXAI = '0';
  assert.equal(vertexEnabled(), false);
  if (previous === undefined) delete process.env.GOOGLE_GENAI_USE_VERTEXAI;
  else process.env.GOOGLE_GENAI_USE_VERTEXAI = previous;
});

test('Gemini uses only the server-injected key and explicitly disables Vertex AI', () => {
  assert.deepEqual(
    aiClientOptions({ GEMINI_API_KEY: ' dummy-test-secret ', GOOGLE_GENAI_USE_VERTEXAI: '0' }),
    {
      apiKey: 'dummy-test-secret',
      vertexai: false,
    },
  );
});

test('missing or blank Gemini secret fails closed', () => {
  assert.throws(() => aiClientOptions({}), /not configured/);
  assert.throws(() => aiClientOptions({ GEMINI_API_KEY: ' ' }), /not configured/);
});

test('explicit rollback mode does not send the Gemini key to Vertex AI', () => {
  assert.deepEqual(
    aiClientOptions({
      GOOGLE_GENAI_USE_VERTEXAI: '1',
      GOOGLE_CLOUD_PROJECT: 'test-project',
      GEMINI_API_KEY: 'dummy-test-secret',
    }),
    {
      vertexai: true,
      project: 'test-project',
      location: 'global',
    },
  );
});
