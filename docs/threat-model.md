# Northstar Vault threat model

This model follows the five threat zones in the Gen AI Academy production directives. It is intentionally short enough to audit before each release.

| Zone | Representative threat | Control in this repository | Verification |
|---|---|---|---|
| Input surfaces | Oversized/malformed requests, XSS payloads | 32 KB body cap, strict Zod schemas, length bounds, output rendered with `textContent`/escaping | API validation tests and manual payload checks |
| Planning and reasoning | Prompt injection asks Gemini to reveal system instructions or act on user text as commands | Immutable server-side system instruction; untrusted-data boundary; no model-accessible execution tools | Adversarial prompt suite |
| Tool execution | User causes privileged cross-account access | No model tools; every private route verifies a Firebase ID token; database path derives only from verified `uid` | Two-account isolation test |
| Memory and state | Cross-user Firestore leakage or mutable AI history | `users/{uid}/sessions/*`; owner-bound rules; backend recomputes the path from verified identity; assistant messages are append-only in rules | Firestore emulator/rules test and two-account test |
| Inter-system communication | AI credentials leak to browser, logs, Git, or build output | Cloud Run uses its service identity to call Vertex AI; no Gemini API key is required; frontend config exposes only Firebase's public web config | Repository secret scan and browser network inspection |

## Abuse and reliability controls

- Per-IP API rate limit plus a tighter authenticated AI request limit.
- CSP, HSTS, anti-framing, MIME sniffing protection, and no referrer leakage via Helmet.
- Revoked Firebase ID tokens are rejected on every private request.
- Firestore reads are bounded; Gemini receives only the ten most recent messages.
- Structured Gemini output is normalized and size-capped again before persistence.
- User-visible errors never reveal stack traces, credentials, or provider responses.
- Export and deletion make data control testable. Vault deletion requires a typed confirmation phrase.

## Residual risks

- A user can enter highly sensitive information. The interface warns that this is reflection support, not professional advice.
- Gemini can produce inaccurate interpretations. The UI labels output as options and assumptions, never facts unless tied to the user's text.
- Application Default Credentials let the Cloud Run service account use Firestore, verify Firebase users, and call Vertex AI. The deployment guide grants only Datastore User, Firebase Auth Viewer, and Vertex AI User.
- Firestore rules protect direct-client access; Admin SDK access is protected separately by verified authentication and server path construction.
