# Production verification

Verified against Cloud Run revision `northstar-vault-00006-sv5` on 27 August 2026.

## Endpoint

`https://northstar-vault-546899882968.asia-south1.run.app`

## Automated evidence

- Health endpoint returned HTTP 200 with service `northstar-vault`, version `1.0.0`.
- Unauthenticated request to `/api/private/sessions` returned HTTP 401.
- Cloud Run routes 100% of traffic to the verified revision.
- Service label `dev-tutorial=cloud-run-ai-challenge` is present.
- Source tests: 6 passed, 0 failed.
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
- The dedicated service account has Datastore User, Firebase Auth Viewer, and Vertex AI User only; no service-account key file exists.
- The structured response populated facts, assumptions, options, a counterpoint, compass ratings, and a 48-hour experiment.

## Remaining manual checks

- history persistence after reload
- second-account isolation
- export and deletion controls
