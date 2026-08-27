# Northstar Vault threat model

This model follows the five threat zones in the Gen AI Academy production directives. It is intentionally short enough to audit before each release.

| Zone | Representative threat | Control in this repository | Verification |
|---|---|---|---|
| Input surfaces | Oversized/malformed requests, XSS payloads | 32 KB body cap, strict Zod schemas, length bounds, output rendered with `textContent`/escaping | API validation tests and manual payload checks |
| Planning and reasoning | Prompt injection asks Gemini to reveal system instructions or act on user text as commands | Immutable server-side system instruction; untrusted-data boundary; no model-accessible execution tools | Adversarial prompt suite |
| Tool execution | User causes privileged cross-account access | No model tools; every private route verifies a Firebase ID token; database path derives only from verified `uid` | Two-account isolation test |
| Memory and state | Cross-user leakage, forged AI history, late replies restoring deleted data | UID-derived paths; owner reads; all direct client writes denied; server transactions check deletion markers and an opaque vault epoch; sign-out clears private DOM and invalidates late responses | Two synthetic-identity Auth/Firestore emulator tests, concurrent-erasure tests and frontend lifecycle tests |
| Inter-system communication | AI credentials leak to browser, logs, Git, or build output | Cloud Run uses its service identity to call Vertex AI; no Gemini API key is required; frontend config exposes only Firebase's public web config | Repository secret scan and browser network inspection |

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

- A user can enter highly sensitive information. The interface warns that this is reflection support, not professional advice.
- Gemini can produce inaccurate interpretations. The UI labels output as options and assumptions, never facts unless tied to the user's text.
- Application Default Credentials let the Cloud Run service account use Firestore, verify Firebase users, and call Vertex AI. The deployment guide grants only Datastore User, Firebase Auth Viewer, and Vertex AI User.
- Firestore rules protect direct-client access; Admin SDK access is protected separately by verified authentication and server path construction.
- Erasure retains only an opaque epoch marker to reject pre-erasure work; it does not delete the authentication account or certify cloud-provider backup deletion.
- Secret Manager-backed Gemini Developer API integration exists in code but is not the current production request path. It awaits a successful prepaid-credit preflight; see `secret-manager-migration.md`.
- Local emulator tests do not establish the outcome of a production two-Google-account smoke test. The deterministic model stub is test-only and is never exposed through a request parameter.
