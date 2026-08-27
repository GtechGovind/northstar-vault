import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createPrivacyReceipt, MAX_EXPORT_BYTES } from '../public/privacy-receipt.js';

const timestamp = '2026-08-27T16:00:00.000Z';
const record = () => ({
  id: 'synthetic-private-id', title: 'SYNTHETIC PRIVATE', summary: 'Synthetic summary', tags: ['test'],
  compass: {clarity:3, agency:4, energy:2}, createdAt:timestamp, updatedAt:null,
  messages:[{role:'user',text:'नमस्ते 🌍 決定 Привет',createdAt:null},{role:'assistant',text:'Synthetic reply',createdAt:timestamp}]
});
const exported = (sessions = [record()]) => ({ exportedAt:timestamp, sessions });

test('receipt contains only aggregate metadata and matches independent exact-byte SHA-256', async () => {
  const raw = JSON.stringify(exported([record(), record()]), null, 2);
  const receipt = await createPrivacyReceipt(raw);
  assert.deepEqual(Object.keys(receipt).sort(), ['byteLength','exportedAt','messageCount','reflectionCount','sha256']);
  assert.equal(receipt.reflectionCount, 2);
  assert.equal(receipt.messageCount, 4);
  assert.equal(receipt.byteLength, Buffer.byteLength(raw, 'utf8'));
  assert.equal(receipt.sha256, createHash('sha256').update(raw, 'utf8').digest('hex'));
  assert.doesNotMatch(JSON.stringify(receipt), /synthetic-private-id|SYNTHETIC PRIVATE|नमस्ते/);
});

test('valid empty exports produce zero counts', async () => {
  const receipt = await createPrivacyReceipt(JSON.stringify(exported([])));
  assert.equal(receipt.reflectionCount, 0);
  assert.equal(receipt.messageCount, 0);
});

test('whitespace and key-order changes produce different exact-file hashes', async () => {
  const data = exported();
  const strings = [JSON.stringify(data), JSON.stringify(data, null, 2), JSON.stringify({sessions:data.sessions,exportedAt:timestamp})];
  const receipts = await Promise.all(strings.map(raw => createPrivacyReceipt(raw)));
  assert.equal(new Set(receipts.map(r => r.sha256)).size, 3);
});

test('invalid root, dates and nested records fail without echoing private input', async () => {
  const bad = [null, 1, {}, 'SYNTHETIC PRIVATE malformed', '[]', 'null', '{}'];
  for (const input of bad) await assert.rejects(createPrivacyReceipt(input), error => !error.message.includes('SYNTHETIC PRIVATE'));
  for (const date of ['1', '2026-02-30T00:00:00.000Z', 'SYNTHETIC PRIVATE', null]) {
    await assert.rejects(createPrivacyReceipt(JSON.stringify({...exported(),exportedAt:date})), /timestamp/);
  }
  for (const field of ['id','title','summary','tags','createdAt','updatedAt','compass','messages']) {
    const item = record(); delete item[field];
    await assert.rejects(createPrivacyReceipt(JSON.stringify(exported([item]))), error => !error.message.includes('synthetic-private-id'));
  }
  for (const change of [{role:'system'}, {text:42}, {createdAt:'invalid'}]) {
    const item = record(); Object.assign(item.messages[0], change);
    await assert.rejects(createPrivacyReceipt(JSON.stringify(exported([item]))));
  }
});

test('nullable session and message timestamps match the real API export schema', async () => {
  const item = record(); item.createdAt = null; item.compass = null;
  assert.equal((await createPrivacyReceipt(JSON.stringify(exported([item])))).messageCount, 2);
});

test('receipt workload is bounded before parsing and after UTF-8 encoding', async () => {
  await assert.rejects(createPrivacyReceipt('x'.repeat(MAX_EXPORT_BYTES + 1)), /10 MiB/);
  await assert.rejects(createPrivacyReceipt('界'.repeat(Math.floor(MAX_EXPORT_BYTES / 3) + 1)), /10 MiB/);
});

test('cancellation before and during hashing rejects without returning a receipt', async () => {
  const raw = JSON.stringify(exported());
  const before = new AbortController(); before.abort('SYNTHETIC PRIVATE');
  await assert.rejects(createPrivacyReceipt(raw, {signal:before.signal}), error => error.name === 'AbortError' && !error.message.includes('SYNTHETIC PRIVATE'));
  const during = new AbortController();
  const promise = createPrivacyReceipt(raw, {signal:during.signal});
  during.abort();
  await assert.rejects(promise, {name:'AbortError'});
});

test('digest failures are sanitized rather than reported as a successful receipt', async (t) => {
  t.mock.method(globalThis.crypto.subtle, 'digest', async () => { throw new Error('SYNTHETIC PRIVATE provider failure'); });
  await assert.rejects(createPrivacyReceipt(JSON.stringify(exported())), error => /No receipt/.test(error.message) && !error.message.includes('SYNTHETIC PRIVATE'));
});
