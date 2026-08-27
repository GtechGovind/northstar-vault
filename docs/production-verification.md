# Production verification

Security release `northstar-vault-privacy0827` (source `ac8c006`) promoted to **100% production traffic** on 27 August 2026, after no-traffic verification. Previous known-good revision: `northstar-vault-00007-fjl`.

## Current release evidence

- Cloud Run container build and readiness succeeded. Health returned 200; signed-out private requests returned 401 with `Cache-Control: no-store`.
- The tested Firestore rules compiled and were successfully released to production.
- The production HTML serves the updated cache-busted privacy client and explains erasure limits.
- The preserved provider is `GOOGLE_GENAI_USE_VERTEXAI=1`, model `gemini-3.1-flash-lite`; no Developer API migration has been claimed.
- A real signed-in production reflection using explicitly synthetic text generated a structured reply and Signal Map after promotion.
- A second real Google account signed in successfully and initially saw an empty vault, without the first account's existing or synthetic entries. Its own synthetic reflection also produced a real structured response. No project IAM access was granted to that second account.
- The live full-vault confirmation check was interrupted by browser-control failure. Its outcome is unverified; do not count the local emulator result as a completed live deletion test. Existing journal entries were not targeted.
- Public configuration contains only `apiKey`, `authDomain`, `projectId`, and `appId` for Firebase, not a Gemini key.
- No IAM grant, billing change, key rotation, or cloud-region change was made by this security release. Existing scaling was preserved.

## Security repair verification — 27 August 2026

- `npm run check`: **15 passed, 0 failed** (AI configuration, HTTP boundaries and frontend lifecycle).
- `npm run test:security`: **9 passed, 0 failed** using Firebase Auth and Firestore emulators with two synthetic identities. Strict demo-project/localhost guards prevent these tests from targeting production.
- `npm audit`: **0 vulnerabilities**, including development dependencies, after a scoped Firebase CLI Pub/Sub override.
- `git diff --check`: passed.
- Owner-bound reads and all direct-client writes denied; server-only mutation checks cannot be bypassed through the Firestore SDK.
- Cross-user read, append, list, export and delete attempts fail; forged/disabled tokens and client-provided owner IDs are rejected.
- Single-entry and full-vault deletion require exact confirmation. Messages are removed, the other account remains intact, and late AI responses cannot recreate erased records.
- Vault erasure retains only an opaque anti-replay epoch marker, not journal contents. Authentication accounts and provider backups are outside its scope.
- Sign-out clears identity, drafts, messages and analysis. Late history, chat and export responses are ignored after sign-out/account changes.
- Provider errors do not leak credentials or private text into response bodies or application logs.

These tests use deterministic in-process model output and are **not** a substitute for a real two-Google-account production smoke test.

## Endpoint

`https://northstar-vault-546899882968.asia-south1.run.app`

## Automated evidence

- Health endpoint returned HTTP 200 with service `northstar-vault`, version `1.0.0`.
- Unauthenticated request to `/api/private/sessions` returned HTTP 401.
- Cloud Run routes 100% of traffic to the verified revision.
- Service label `dev-tutorial=cloud-run-ai-challenge` is present.
- Baseline source tests: 6 passed, 0 failed (the repair suite above supersedes this count).
- Production dependency audit: 0 known vulnerabilities.
- Firestore rules compiled and deployed successfully.
- Firestore database is Native mode in `asia-south1`.
- The production Cloud Run domain is present in Firebase Authentication's authorized-domain list.
- The Google provider is enabled with `govind.csae@gmail.com` as the support email.
- The hardened sign-in client falls back from popup to top-level redirect when a browser blocks popups.

## Response-header evidence

- Content Security Policy limits scripts to the app and Firebase SDK origin.
- Cross-Origin-Opener-Policy is `same-origin-allow-popups`, allowing Firebase sign-in without weakening general isolation.
- HTTP Strict Transport Security is enabled for one year with subdomains.
- MIME sniffing protection is enabled.

## Identity and AI evidence

- Google Sign-In, private-session listing, and a complete structured reflection passed in production.
- Gemini runs through Vertex AI using the Cloud Run service identity; no API key is required by the request path.
- The dedicated service account uses Datastore User, Firebase Auth Viewer and Vertex AI User. A fresh secret-specific IAM check also found Secret Accessor on `gemini-api-key`; that does not establish that the production request path consumes the secret. No service-account key file is used.
- The structured response populated facts, assumptions, options, a counterpoint, compass ratings, and a 48-hour experiment.
- A follow-up reflection used prior context, and all four messages survived a full browser reload.
- Private export completed successfully and displayed its success confirmation.

## Remaining manual checks

- Complete the remaining production isolation/cleanup checks after browser recovery. Separate real-account sign-in and vault display passed; authenticated cross-ID API denial is proven by the guarded emulator suite, not by production token replay.
- Production full-vault erase on an empty/synthetic-only test identity; never erase the owner's real journal for a test.
- Successful Gemini Developer API preflight and pinned Secret Manager runtime migration; current preflight returns HTTP 429.
- Genuine AI Studio-generated enhancement integrated into the app. Custom instructions were saved, but Build and Playground generation returned internal errors.
- Submit only accurate service declarations and refreshed public evidence. Prize eligibility and organizer selection remain unconfirmed.
