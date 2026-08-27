# Ideathon submission package

## Prototype link

`https://northstar-vault-546899882968.asia-south1.run.app`

## Public repository

https://github.com/GtechGovind/northstar-vault

## Social demo post

https://www.linkedin.com/feed/update/urn:li:activity:7498550271413809152/

The public post contains `#AccelerateAIwithCloudRun`. Its code link resolves to the personal `GtechGovind` repository. The portal submission exists, but the persisted Secret Manager declaration is not yet backed by the production request path. An unchecked correction was prepared, but confirmation would consume evaluation attempt 3, so it was cancelled while other requirements remain blocked. Correct the declaration in the complete final bundle. The genuine AI Studio Privacy Receipt enhancement is live, locally tested and browser-verified, with [original source and review evidence](docs/ai-studio/README.md). The updated brief below is filled in the open form draft, **not resubmitted**; Secret Manager remains unchecked in that draft.

## Brief description (under 1,024 characters)

Northstar Vault turns tangled reflections into a transparent Signal Map: facts, possible assumptions, competing tensions, options, a counterpoint and a testable 48-hour experiment. Firebase Google Sign-In and server-verified tokens protect every private API; Firestore histories use verified-user paths with owner-only reads and server-only writes. Gemini on Vertex AI provides structured, multi-turn reflection through the keyless Cloud Run identity. The Privacy Center supports export, confirmed deletion and an AI Studio-generated Privacy Receipt: an exact-file SHA-256 fingerprint computed locally with aggregate counts, never a claim of erasure. Sign-out clears private views and blocks late results; deletion guards prevent late AI replies restoring erased content. The responsive app includes bounded output, rate limits, a five-zone threat model and 36 automated checks across unit, client and synthetic-identity emulator suites. Original AI Studio output and reviewed integration changes are documented publicly.

## Services to confirm in the form

- User authentication via Firebase
- Multi-turn interaction with Gemini on Vertex AI
- User-isolated Firestore document storage
- Keyless Vertex AI access through the Cloud Run service identity
- Others: structured Signal Maps, local Privacy Receipt, data export/erasure, security headers, rate limiting, threat model, health checks

## Evaluation proof

| Criterion | Proof to show judges |
|---|---|
| Authenticity | Signal Map, counterpoint, 48-hour experiment, editorial design, Privacy Center |
| Usability | One-click Google SSO, starter prompts, clear loading/error states, history, mobile layout |
| Stability | `/api/health`, bounded reads, structured-output normalization, rate limits, 27 unit/HTTP/client/receipt tests and 9 emulator security tests |
| Security | Verified ID tokens, UID-derived paths, owner-only rules, keyless Vertex AI, CSP, export/erasure, threat model |

## Final validation before submission

- [x] Live Cloud Run public health and signed-out private-API rejection verified
- [x] Required `dev-tutorial=cloud-run-ai-challenge` label is present
- [x] Google Sign-In works on the production domain for two real Google accounts
- [x] Two synthetic-account isolation and deletion tests pass in Auth/Firestore emulators
- [x] Second real account opens its own vault without the first account's entries
- [ ] Remaining production deletion/cleanup checks after browser recovery
- [x] Multi-turn context survives reload (verified in the existing production release)
- [x] No AI credential is in source or public configuration; production currently uses keyless Vertex AI
- [ ] Gemini Developer API successfully called through a pinned Secret Manager credential
- [ ] Export, single-entry deletion, and full-vault erasure work
- [x] Personal public repository contains deployment steps, Firestore rules, threat model and reproducible verification results
- [x] Public social post includes `#AccelerateAIwithCloudRun`
- [x] Genuine AI Studio-generated enhancement integrated in source, tested and evidenced
- [x] New Privacy Receipt production release and browser check, including independently matched downloaded-file SHA-256
- [ ] All three public links work before pressing Submit
