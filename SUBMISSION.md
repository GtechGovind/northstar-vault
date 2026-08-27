# Ideathon submission package

## Prototype link

`https://northstar-vault-546899882968.asia-south1.run.app`

## Public repository

https://github.com/GtechGovind/northstar-vault

## Social demo post

https://www.linkedin.com/feed/update/urn:li:activity:7498550271413809152/

The public post contains `#AccelerateAIwithCloudRun`. Its code link resolves to the personal `GtechGovind` repository. The portal submission exists, but the checked Secret Manager capability is not yet backed by the production request path. Correct that declaration until the migration in `docs/secret-manager-migration.md` is verified. AI Studio feature-build evidence remains blocked by internal errors, not complete.

## Brief description (under 1,024 characters)

Northstar Vault is a privacy-first decision journal that turns tangled reflections into a transparent Signal Map: observed facts, possible assumptions, competing tensions, reasonable options, an honest counterpoint, and one testable 48-hour experiment. Google Sign-In is handled by Firebase Authentication; every private API verifies the Firebase ID token server-side. Firestore stores multi-turn histories only under `users/{verified uid}`, protected by owner-bound, deny-by-default rules. Gemini on Vertex AI provides structured multi-turn reflection through the keyless Cloud Run service identity, so no AI credential reaches the browser. Beyond the starter journal, Northstar adds visible confidence/agency signals, quick reflection modes, append-only AI history, data export and erasure, rate limits, strict schemas, a judge-visible Privacy Center, and a documented five-zone threat model. The responsive Cloud Run app is built for clarity, stability, and user control—not dependency on the AI.

## Services to confirm in the form

- User authentication via Firebase
- Multi-turn interaction with Gemini on Vertex AI
- User-isolated Firestore document storage
- Keyless Vertex AI access through the Cloud Run service identity
- Others: structured Signal Maps, data export/erasure, security headers, rate limiting, threat model, health checks

## Evaluation proof

| Criterion | Proof to show judges |
|---|---|
| Authenticity | Signal Map, counterpoint, 48-hour experiment, editorial design, Privacy Center |
| Usability | One-click Google SSO, starter prompts, clear loading/error states, history, mobile layout |
| Stability | `/api/health`, bounded reads, structured-output normalization, rate limits, 15 unit/HTTP/client tests and 9 emulator security tests |
| Security | Verified ID tokens, UID-derived paths, owner-only rules, keyless Vertex AI, CSP, export/erasure, threat model |

## Final validation before submission

- [ ] Live Cloud Run URL works in a signed-out/incognito browser
- [ ] Required `dev-tutorial=cloud-run-ai-challenge` label is present
- [ ] Google Sign-In works on the production domain
- [x] Two synthetic-account isolation and deletion tests pass in Auth/Firestore emulators
- [ ] Two real production Google-account smoke test
- [ ] Multi-turn context survives reload
- [x] No AI credential is in source or public configuration; production currently uses keyless Vertex AI
- [ ] Gemini Developer API successfully called through a pinned Secret Manager credential
- [ ] Export, single-entry deletion, and full-vault erasure work
- [ ] Public repository contains deployment steps, Firestore rules, threat model, and test output
- [x] Public social post includes `#AccelerateAIwithCloudRun`
- [ ] Genuine AI Studio-generated enhancement integrated and evidenced (current generation attempts fail)
- [ ] All three public links work before pressing Submit
