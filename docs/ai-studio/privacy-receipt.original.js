/**
 * Northstar Vault Privacy Receipt Generator
 * Pure JavaScript ES Module (Zero External Dependencies)
 *
 * Computes a local cryptographic SHA-256 integrity receipt for Northstar Vault exports.
 * Adheres strictly to the Northstar Vault Security Constitution:
 * - Computes export checksum locally using Web Crypto SHA-256 over exact raw bytes
 * - Returns only aggregate metadata: exportedAt, reflectionCount, messageCount, byteLength, sha256
 * - NEVER retains raw text, user IDs, session IDs, or private reflections
 * - NEVER makes network requests, telemetry, storage, or external API calls
 * - Operates deterministically with complete AbortSignal support
 *
 * @license Apache-2.0
 */

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

  // 3. Parse JSON string safely
  let parsed;
  try {
    parsed = JSON.parse(exportText);
  } catch (err) {
    throw new Error(`Malformed JSON: Failed to parse export data. ${err instanceof Error ? err.message : ''}`);
  }

  // 4. Validate root container structure
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('Invalid schema: Root export payload must be a JSON object.');
  }

  // 5. Validate exportedAt timestamp
  if (typeof parsed.exportedAt !== 'string' || parsed.exportedAt.trim() === '') {
    throw new TypeError('Invalid schema: Missing or invalid "exportedAt" string timestamp.');
  }

  const parsedDate = Date.parse(parsed.exportedAt);
  if (Number.isNaN(parsedDate)) {
    throw new TypeError(`Invalid schema: "exportedAt" is not a valid parseable ISO date timestamp (${parsed.exportedAt}).`);
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
      throw new TypeError(`Invalid schema: Session "${session.id || sIdx}" is missing a valid string "title".`);
    }
    if (typeof session.summary !== 'string') {
      throw new TypeError(`Invalid schema: Session "${session.id || sIdx}" is missing a valid string "summary".`);
    }
    if (!Array.isArray(session.tags)) {
      throw new TypeError(`Invalid schema: Session "${session.id || sIdx}" must contain a "tags" array.`);
    }
    for (let tIdx = 0; tIdx < session.tags.length; tIdx++) {
      if (typeof session.tags[tIdx] !== 'string') {
        throw new TypeError(`Invalid schema: Session "${session.id || sIdx}" tag at index [${tIdx}] must be a string.`);
      }
    }
    if (typeof session.createdAt !== 'string') {
      throw new TypeError(`Invalid schema: Session "${session.id || sIdx}" is missing a valid string "createdAt".`);
    }
    if (typeof session.updatedAt !== 'string') {
      throw new TypeError(`Invalid schema: Session "${session.id || sIdx}" is missing a valid string "updatedAt".`);
    }
    if (!Array.isArray(session.messages)) {
      throw new TypeError(`Invalid schema: Session "${session.id || sIdx}" must contain a "messages" array.`);
    }

    // Validate nested messages
    for (let mIdx = 0; mIdx < session.messages.length; mIdx++) {
      const msg = session.messages[mIdx];
      if (typeof msg !== 'object' || msg === null || Array.isArray(msg)) {
        throw new TypeError(`Invalid schema: Message at index [${mIdx}] in session "${session.id || sIdx}" must be an object.`);
      }
      if (typeof msg.role !== 'string') {
        throw new TypeError(`Invalid schema: Message at index [${mIdx}] in session "${session.id || sIdx}" is missing a valid string "role".`);
      }
      if (typeof msg.text !== 'string') {
        throw new TypeError(`Invalid schema: Message at index [${mIdx}] in session "${session.id || sIdx}" is missing a valid string "text".`);
      }
      if (typeof msg.createdAt !== 'string') {
        throw new TypeError(`Invalid schema: Message at index [${mIdx}] in session "${session.id || sIdx}" is missing a valid string "createdAt".`);
      }
    }

    totalMessages += session.messages.length;
  }

  // 8. Pre-digest cancellation check
  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  // 9. Exact-byte UTF-8 encoding over the original un-mutated export string
  const encoder = new TextEncoder();
  const rawBytes = encoder.encode(exportText);

  // 10. Web Crypto SHA-256 Digest
  const cryptoObj = getCrypto();
  if (!cryptoObj || !cryptoObj.subtle || typeof cryptoObj.subtle.digest !== 'function') {
    throw new Error('Web Crypto API (crypto.subtle.digest) is unavailable in this runtime.');
  }

  let hashBuffer;
  try {
    hashBuffer = await cryptoObj.subtle.digest('SHA-256', rawBytes);
  } catch (err) {
    throw new Error(`Cryptographic digest failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // 11. Post-digest cancellation check
  if (signal?.aborted) {
    throw createAbortError(signal);
  }

  // 12. Convert ArrayBuffer to standard hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const sha256Hex = hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');

  // 13. Return pure aggregate integrity receipt (strictly NO private text, NO IDs, NO metadata leaks)
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
 * Creates a standard DOMException AbortError or preserves custom signal reason.
 * @param {AbortSignal} signal
 * @returns {Error}
 */
function createAbortError(signal) {
  if (signal?.reason instanceof Error) {
    return signal.reason;
  }
  if (typeof DOMException !== 'undefined') {
    return new DOMException(signal?.reason || 'The operation was aborted', 'AbortError');
  }
  const error = new Error(signal?.reason || 'The operation was aborted');
  error.name = 'AbortError';
  return error;
}

