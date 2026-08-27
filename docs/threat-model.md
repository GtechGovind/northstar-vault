# Northstar Vault threat model

This model follows the five threat zones in the Gen AI Academy production directives. It is intentionally short enough to audit before each release.

| Zone                       | Representative threat                                                                      | Control in this repository                                                                                                                                                                        | Verification                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Input surfaces             | Oversized/malformed requests, XSS payloads                                                 | 32 KB body cap, strict Zod schemas, length bounds, output rendered with `textContent`/escaping                                                                                                    | API validation tests and manual payload checks                                                              |
| Planning and reasoning     | Prompt injection asks Gemini to reveal system instructions or act on user text as commands | Immutable server-side system instruction; untrusted-data boundary; no model-accessible execution tools                                                                                            | Adversarial prompt suite                                                                                    |
| Tool execution             | User causes privileged cross-account access                                                | No model tools; every private route verifies a Firebase ID token; database path derives only from verified `uid`                                                                                  | Two-account isolation test                                                                                  |
| Memory and state           | Cross-user leakage, forged AI history, late replies restoring deleted data                 | UID-derived paths; owner reads; all direct client writes denied; server transactions check deletion markers and an opaque vault epoch; sign-out clears private DOM and invalidates late responses | Two synthetic-identity Auth/Firestore emulator tests, concurrent-erasure tests and frontend lifecycle tests |
| Inter-system communication | AI credentials leak to browser, logs, Git, or build output                                 | Cloud Run resolves a pinned Gemini API key from Secret Manager at startup; only the server calls Gemini; frontend config exposes only Firebase's public web config                                | Secret-version/runtime inspection, repository secret scan and public-config checks                          |

## Abuse and reliability controls

- Per-IP API rate limit plus a tighter authenticated AI request limit.
- CSP, HSTS, anti-framing, MIME sniffing protection, and no referrer leakage via Helmet.
- Revoked Firebase ID tokens are rejected on every private request.
- Firestore reads are bounded; Gemini receives only the ten most recent messages.
- Structured Gemini output is normalized and size-capped again before persistence.
- User-visible errors never reveal stack traces, credentials, or provider responses.
- Export and deletion make data control testable. Vault deletion requires a typed confirmation phrase.
- The single-reflection API also requires an exact confirmation body; direct SDK writes cannot bypass it.
- Error logs contain only a request ID, route template and generic error class, not upstream messages, stacks, text or credentials.
- Cloud Run refuses to start with Firebase emulator environment variables.

## Residual risks

### Receipt enhancement

- The exact authenticated export string is hashed locally with Web Crypto SHA-256 and downloaded without reserialization. The module has no network or storage calls.
- Receipt work is capped at 10 MiB; oversized exports remain downloadable without a receipt. A failed receipt calculation is never displayed as verified.
- The UI renders only five declared aggregate fields with `textContent`, clears them on close/sign-out, and discards late results after cancellation or identity changes.
- The checksum is not a signature, an anonymity guarantee or proof of erasure. Downloaded files remain on the device; clearing the panel cannot remove them. Web Crypto itself is not interruptible, although pending results are discarded.
- Exact-byte/Unicode hashing, malformed schema, cancellation, digest errors and frontend lifecycle are covered by automated tests. See [review provenance](ai-studio/README.md).

### Application boundaries

- A user can enter highly sensitive information. The interface warns that this is reflection support, not professional advice.
- Gemini can produce inaccurate interpretations. The UI labels output as options and assumptions, never facts unless tied to the user's text.
- The Cloud Run identity can use Firestore, verify Firebase users and read the one Gemini secret. The existing Vertex AI User role is retained for the explicit known-good rollback revision; it is not the current model request path. No new project-wide secret grant was made.
- Firestore rules protect direct-client access; Admin SDK access is protected separately by verified authentication and server path construction.
- Erasure retains only an opaque epoch marker to reject pre-erasure work; it does not delete the authentication account or certify cloud-provider backup deletion.
- Secret Manager-backed Gemini Developer API is now the production request path. A pinned secret still requires careful rotation, restricted access and provider billing/quota monitoring; see `secret-manager-migration.md`.
- Local emulator tests do not establish the outcome of a production two-Google-account smoke test. The deterministic model stub is test-only and is never exposed through a request parameter.
