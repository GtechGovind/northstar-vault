# Production verification

Gemini/Secret Manager release `northstar-vault-gemini0827` (source `e3b9068`) promoted to **100% production traffic** on 27 August 2026, after no-traffic verification. Immediate rollback revision: `northstar-vault-receipt0827` (receipt source `b263037`, Vertex mode). Earlier security revision: `northstar-vault-privacy0827` (source `ac8c006`).

## Current release evidence

- The existing pinned Secret Manager version passed a real Gemini Developer API preflight with HTTP 200. The earlier HTTP 429 credit blocker is resolved; this does not establish approval of every separate Google account-verification process.
- The Cloud Run revision explicitly uses `GOOGLE_GENAI_USE_VERTEXAI=0` and `GEMINI_API_KEY` references `gemini-api-key:2`. No plaintext key is present in revision configuration or public assets.
- Secret-specific Accessor permission for the existing runtime service account was verified. No new IAM grant or key rotation was needed. The existing region, identity and maximum of three instances were preserved.
- The no-traffic candidate passed health 200, private export 401 with `Cache-Control: no-store`, exact served-source checks and Firebase-only public configuration. The production endpoint was checked after traffic promotion.
- A real signed-in Google account continued its explicitly synthetic conversation through Gemini. The reply correctly recalled the earlier practice experiment and produced a structured Signal Map. All **four messages survived a full reload**.
- The Privacy Center generated a receipt for **one reflection, four messages and 2,607 UTF-8 bytes**, at `2026-08-27T17:35:09.354Z`. Its displayed SHA-256 was `4b753a769938256abd9d50bb67e58bb50928e0d38c33627cd40d90cd0afce9e9`. The current-release UI reported a successful export; the independently verified downloaded-file result below is from the preceding receipt release, not this new file.
- Unit/HTTP/client/receipt checks, emulator security checks and the complete dependency audit were rerun for this release: **27 + 9 checks passed; 0 reported vulnerabilities**.

## Final live checks and submission — 28 August 2026

- After explicit approval, the owner completed the native full-vault confirmation for the synthetic-only account B. The application reported **“Your vault has been permanently erased.”** Its history was empty and remained empty after a full reload and authentication restoration.
- Signing back into account A showed its separate vault with the four existing reflections and the one explicitly labeled synthetic test reflection. B's erasure had not removed A's entries. Only A's synthetic reflection was selected for cleanup; its native single-entry confirmation is awaiting completion/verification after browser-control interruption. No single-entry success is claimed yet.
- The approved replacement text was saved to the existing [LinkedIn demo post](https://www.linkedin.com/feed/update/urn:li:activity:7498550271413809152/). Its published content includes Gemini Developer API, the pinned Secret Manager credential, the blog walkthrough and `#AccelerateAIwithCloudRun`.
- The corrected 1,011-character brief, three public links and all five service declarations were submitted through the portal's **attempt 3** confirmation. Reloading the form retained the corrected content and checked declarations; the Submissions dashboard displayed **Submitted**. No extra attempt was made.
- Submission and post screenshots are retained in the owner's workspace. A saved submission is not an organizer eligibility ruling, assessment result or prize guarantee.

## Earlier receipt and security release evidence

The AI Studio-generated Privacy Receipt was first deployed in `northstar-vault-receipt0827`. [Original output and reviewed changes](ai-studio/README.md) are preserved separately. That release retained Vertex mode, the model, service identity and maximum of three instances; no permission or billing change was made by it.

- The no-traffic candidate and production endpoint returned health 200 and private export 401 with `no-store`. The served app, receipt module and stylesheet matched the tested source exactly.
- A signed-in synthetic-only test vault exported one reflection and two messages. Its receipt reported **1,504 UTF-8 bytes** and the expected five aggregate fields.
- Both files downloaded successfully. An independent Node `crypto` SHA-256 over the actual downloaded export bytes matched the downloaded receipt exactly. No journal text or record identifiers were emitted by this verification.
- Closing and reopening the Privacy Center cleared its receipt and status. The existing synthetic conversation still loaded after the new release.
- The receipt layout was visually inspected in the live Privacy Center. The screenshot retained in the owner's workspace shows synthetic data only; no claim of complete accessibility certification is made.

- Cloud Run container build and readiness succeeded. Health returned 200; signed-out private requests returned 401 with `Cache-Control: no-store`.
- The tested Firestore rules compiled and were successfully released to production.
- The production HTML serves the updated cache-busted privacy client and explains erasure limits.
- That earlier release used `GOOGLE_GENAI_USE_VERTEXAI=1`, model `gemini-3.1-flash-lite`. The current release above supersedes its provider configuration.
- A real signed-in production reflection using explicitly synthetic text generated a structured reply and Signal Map after promotion.
- A second real Google account signed in successfully and initially saw an empty vault, without the first account's existing or synthetic entries. Its own synthetic reflection also produced a real structured response. No project IAM access was granted to that second account.
- The earlier live full-vault confirmation check was interrupted by browser-control failure. At that point the synthetic entry remained present. The completed 28 August verification above supersedes that unresolved result. Existing journal entries were not targeted.
- Public configuration contains only `apiKey`, `authDomain`, `projectId`, and `appId` for Firebase, not a Gemini key.
- No IAM grant, billing change, key rotation, or cloud-region change was made by this security release. Existing scaling was preserved.

## Security repair verification — 27 August 2026

- `npm run check`: **27 passed, 0 failed** (AI configuration, HTTP boundaries, frontend lifecycle and receipt integrity), rerun for the Gemini release.
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

## Earlier Vertex identity and AI evidence

- Google Sign-In, private-session listing, and a complete structured reflection passed in production.
- The earlier release ran Gemini through Vertex AI using the Cloud Run service identity, without an API key in that request path. Current production uses the pinned Secret Manager key described above.
- The dedicated service account has Datastore User, Firebase Auth Viewer and Vertex AI User. The Vertex role is retained for rollback. Secret Accessor is scoped to `gemini-api-key`, and its use by the current runtime is verified. No service-account key file is used.
- The structured response populated facts, assumptions, options, a counterpoint, compass ratings, and a 48-hour experiment.
- A follow-up reflection used prior context, and all four messages survived a full browser reload.
- Private export completed successfully and displayed its success confirmation.

## Remaining manual checks

- Complete/verify only the selected synthetic reflection's native deletion confirmation in account A, preserving its four existing reflections. B's synthetic-only vault erasure is verified. Approval has already been granted; do not repeat an uncertain deletion blindly.
- Separate real-account sign-in and vault display passed; authenticated cross-ID API denial is proven by the guarded emulator suite, not by production token replay.
- Public demo publication and corrected portal submission are complete. The Secret Manager declaration is supported by the verified runtime.
- Prize eligibility, workshop attendance and organizer selection remain unconfirmed; submission receipts alone do not establish them.
