# Production verification

Verified against Cloud Run revision `northstar-vault-00003-667` on 27 August 2026.

## Endpoint

`https://northstar-vault-546899882968.asia-south1.run.app`

## Automated evidence

- Health endpoint returned HTTP 200 with service `northstar-vault`, version `1.0.0`.
- Unauthenticated request to `/api/private/sessions` returned HTTP 401.
- Cloud Run routes 100% of traffic to the verified revision.
- Service label `dev-tutorial=cloud-run-ai-challenge` is present.
- Source tests: 5 passed, 0 failed.
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

## Credential evidence

- The original restricted Gemini key was rotated after its creation output appeared in Cloud Shell.
- Secret Manager version 2 contains the replacement key.
- The replacement key is restricted to `generativelanguage.googleapis.com`.
- The exposed original key was deleted.
- The Cloud Run service account has Firestore data access and secret access only; no service-account key file exists.

## Remaining manual checks

- Google Sign-In and first authenticated reflection
- history persistence after reload
- second-account isolation
- export and deletion controls
