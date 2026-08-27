/**
 * Northstar Vault Privacy Receipt Generator
 * Pure JavaScript ES Module (Zero External Dependencies)
 *
 * Computes a local cryptographic SHA-256 integrity receipt for Northstar Vault exports.
 * Adheres strictly to the Northstar Vault Security Constitution:
 * - Computes export checksum locally using Web Crypto SHA-256 over exact raw bytes
 * - Returns only aggregate metadata: exportedAt, reflectionCount, messageCount, byteLength, sha256
 * - Returns no raw text, user IDs, session IDs, or private reflections
 * - NEVER makes network requests, telemetry, storage, or external API calls
 * - Checks cancellation before and after hashing (digest itself cannot be stopped)
 *
 * @license Apache-2.0
 * Generated in Google AI Studio; reviewed integration changes are documented in
 * docs/ai-studio/README.md. Original output is preserved alongside that note.
 */

export const MAX_EXPORT_BYTES = 10 * 1024 * 1024;

function isTimestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false;
  const date = new Date(value);
  return Number.isFinite(date.valueOf()) && date.toISOString() === value;
}

function nullableTimestamp(value) { return value === null || isTimestamp(value); }

/**
 * Validates a Northstar Vault export string and creates an integrity receipt.
 *
 * @param {string} exportText - The exact raw JSON string exported by Northstar Vault.
 * @param {Object} [options] - Configuration options.
 * @param {AbortSignal} [options.signal] - Optional AbortSignal to cancel execution.
 * @returns {Promise<{exportedAt: string, reflectionCount: number, messageCount: number, byteLength: number, sha256: string}>}
 */
export async function createPrivacyReceipt(exportText, { signal } = {}) {
  // 1. Pre-execution cancellation check
  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  // 2. Validate top-level input type
  if (typeof exportText !== 'string') {
    throw new TypeError('Invalid input: exportText must be a JSON string.');
  }
  if (exportText.length > MAX_EXPORT_BYTES) throw new RangeError('Export is too large for a local receipt (10 MiB limit).');
  const rawBytes = new TextEncoder().encode(exportText);
  if (rawBytes.byteLength > MAX_EXPORT_BYTES) throw new RangeError('Export is too large for a local receipt (10 MiB limit).');

  // 3. Parse JSON string safely
  let parsed;
  try {
    parsed = JSON.parse(exportText);
  } catch {
    // Parser messages can include private source fragments.
    throw new Error('Malformed JSON: Could not read the export.');
  }

  // 4. Validate root container structure
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('Invalid schema: Root export payload must be a JSON object.');
  }

  // 5. Validate exportedAt timestamp
  if (!isTimestamp(parsed.exportedAt)) {
    throw new TypeError('Invalid schema: "exportedAt" must be a valid UTC ISO timestamp.');
  }

  // 6. Validate sessions array
  if (!Array.isArray(parsed.sessions)) {
    throw new TypeError('Invalid schema: "sessions" must be an array.');
  }

  let totalMessages = 0;

  // 7. Validate each session and its nested messages
  for (let sIdx = 0; sIdx < parsed.sessions.length; sIdx++) {
    // Periodic cancellation check during large array traversal
    if (signal?.aborted) {
      throw createAbortError(signal);
    }

    const session = parsed.sessions[sIdx];
    if (typeof session !== 'object' || session === null || Array.isArray(session)) {
      throw new TypeError(`Invalid schema: Session at index [${sIdx}] must be an object.`);
    }

    // Required session fields
    if (typeof session.id !== 'string') {
      throw new TypeError(`Invalid schema: Session at index [${sIdx}] is missing a valid string "id".`);
    }
    if (typeof session.title !== 'string') {
      throw new TypeError(`Invalid schema: Session at index [${sIdx}] needs a string "title".`);
    }
    if (typeof session.summary !== 'string') {
      throw new TypeError(`Invalid schema: Session at index [${sIdx}] needs a string "summary".`);
    }
    if (!Array.isArray(session.tags)) {
      throw new TypeError(`Invalid schema: Session at index [${sIdx}] needs a "tags" array.`);
    }
    for (let tIdx = 0; tIdx < session.tags.length; tIdx++) {
      if (typeof session.tags[tIdx] !== 'string') {
        throw new TypeError(`Invalid schema: Tag at index [${tIdx}] must be a string.`);
      }
    }
    if (!nullableTimestamp(session.createdAt)) {
      throw new TypeError(`Invalid schema: Session at index [${sIdx}] has invalid "createdAt".`);
    }
    if (!nullableTimestamp(session.updatedAt)) {
      throw new TypeError(`Invalid schema: Session at index [${sIdx}] has invalid "updatedAt".`);
    }
    if (session.compass !== null && (typeof session.compass !== 'object' || Array.isArray(session.compass) ||
      !['clarity', 'agency', 'energy'].every(key => Number.isInteger(session.compass?.[key]) && session.compass[key] >= 1 && session.compass[key] <= 5))) {
      throw new TypeError(`Invalid schema: Session at index [${sIdx}] has invalid "compass".`);
    }
    if (!Array.isArray(session.messages)) {
      throw new TypeError(`Invalid schema: Session at index [${sIdx}] needs a "messages" array.`);
    }

    // Validate nested messages
    for (let mIdx = 0; mIdx < session.messages.length; mIdx++) {
      const msg = session.messages[mIdx];
      if (typeof msg !== 'object' || msg === null || Array.isArray(msg)) {
        throw new TypeError(`Invalid schema: Message at index [${mIdx}] must be an object.`);
      }
      if (!['user', 'assistant'].includes(msg.role)) {
        throw new TypeError(`Invalid schema: Message at index [${mIdx}] has invalid "role".`);
      }
      if (typeof msg.text !== 'string') {
        throw new TypeError(`Invalid schema: Message at index [${mIdx}] needs a string "text".`);
      }
      if (!nullableTimestamp(msg.createdAt)) {
        throw new TypeError(`Invalid schema: Message at index [${mIdx}] has invalid "createdAt".`);
      }
    }

    totalMessages += session.messages.length;
  }

  // 8. Pre-digest cancellation check
  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  // 9. Exact-byte UTF-8 encoding over the original un-mutated export string
  // rawBytes was encoded from the untouched input before validation.

  // 10. Web Crypto SHA-256 Digest
  const cryptoObj = getCrypto();
  if (!cryptoObj || !cryptoObj.subtle || typeof cryptoObj.subtle.digest !== 'function') {
    throw new Error('Web Crypto API (crypto.subtle.digest) is unavailable in this runtime.');
  }

  let hashBuffer;
  try {
    hashBuffer = await cryptoObj.subtle.digest('SHA-256', rawBytes);
  } catch {
    throw new Error('Cryptographic digest failed. No receipt was created.');
  }

  // 11. Post-digest cancellation check
  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  // 12. Convert ArrayBuffer to standard hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256Hex = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');

  // 13. Return only the five declared aggregate fields; never include private text or IDs.
  return {
    exportedAt: parsed.exportedAt,
    reflectionCount: parsed.sessions.length,
    messageCount: totalMessages,
    byteLength: rawBytes.byteLength,
    sha256: sha256Hex,
  };
}

/**
 * Safely resolves global Web Crypto object in modern browsers and Node environments.
 * @returns {Crypto|null}
 */
function getCrypto() {
  if (typeof globalThis !== 'undefined' && globalThis.crypto) {
    return globalThis.crypto;
  }
  if (typeof window !== 'undefined' && window.crypto) {
    return window.crypto;
  }
  return null;
}

/**
 * Creates a standard AbortError without leaking a custom signal reason.
 * @param {AbortSignal} signal
 * @returns {Error}
 */
function createAbortError(_signal) {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('The operation was cancelled.', 'AbortError');
  }
  const error = new Error('The operation was cancelled.');
  error.name = 'AbortError';
  return error;
}
