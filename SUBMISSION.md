# Ideathon submission package

## Prototype link

`https://northstar-vault-546899882968.asia-south1.run.app`

## Public repository

`https://github.com/TO-BE-CREATED/northstar-vault`

## Social demo post

`https://TO-BE-PUBLISHED`

## Brief description (under 1,024 characters)

Northstar Vault is a privacy-first decision journal that turns tangled reflections into a transparent Signal Map: observed facts, possible assumptions, competing tensions, reasonable options, an honest counterpoint, and one testable 48-hour experiment. Google Sign-In is handled by Firebase Authentication; every private API verifies the Firebase ID token server-side. Firestore stores multi-turn histories only under `users/{verified uid}`, protected by owner-bound, deny-by-default rules. Gemini provides structured multi-turn reflection, while its API key is mounted into Cloud Run from Secret Manager and never reaches the browser. Beyond the starter journal, Northstar adds visible confidence/agency signals, quick reflection modes, append-only AI history, data export and erasure, rate limits, strict schemas, a judge-visible Privacy Center, and a documented five-zone threat model. The responsive Cloud Run app is built for clarity, stability, and user control—not dependency on the AI.

## Services to confirm in the form

- User authentication via Firebase
- Multi-turn interaction with the Gemini API
- User-isolated Firestore document storage
- Secure API key retrieval via Google Cloud Secret Manager
- Others: structured Signal Maps, data export/erasure, security headers, rate limiting, threat model, health checks

## Evaluation proof

| Criterion | Proof to show judges |
|---|---|
| Authenticity | Signal Map, counterpoint, 48-hour experiment, editorial design, Privacy Center |
| Usability | One-click Google SSO, starter prompts, clear loading/error states, history, mobile layout |
| Stability | `/api/health`, bounded Firestore reads, structured-output normalization, rate limits, five passing tests |
| Security | Verified ID tokens, UID-derived paths, owner-only rules, Secret Manager, CSP, export/erasure, threat model |

## Final validation before submission

- [ ] Live Cloud Run URL works in a signed-out/incognito browser
- [ ] Required `dev-tutorial=cloud-run-ai-challenge` label is present
- [ ] Google Sign-In works on the production domain
- [ ] Two-account isolation test passes
- [ ] Multi-turn context survives reload
- [ ] Secret does not appear in source, browser network traffic, or Cloud Run environment display
- [ ] Export, single-entry deletion, and full-vault erasure work
- [ ] Public repository contains deployment steps, Firestore rules, threat model, and test output
- [ ] Social video/post includes `#AccelerateAIwithCloudRun`
- [ ] All three public links work before pressing Submit
