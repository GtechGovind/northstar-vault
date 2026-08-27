# Ideathon submission package

## Prototype link

`https://northstar-vault-546899882968.asia-south1.run.app`

## Public repository

https://github.com/GtechGovind/northstar-vault

## Social demo post

https://www.linkedin.com/feed/update/urn:li:activity:7498550271413809152/

The public post contains `#AccelerateAIwithCloudRun` and links to the personal `GtechGovind` repository. Its historical Vertex wording needs the approval-ready update in [social-post.md](docs/social-post.md), now filled in the existing post editor with a link to the [blog demo walkthrough](docs/meet-the-builders.md#demo-walkthrough-current-release). Save has not been clicked. The portal submission exists; its Secret Manager declaration is now backed by the verified live Gemini credential path. The updated 1,011-character brief below and all five service declarations are filled in the form draft, not resubmitted. An earlier incomplete evaluation attempt 3 was cancelled, not consumed; final resubmission still requires approval. The genuine AI Studio Privacy Receipt enhancement is live and evidenced in [the original source and review notes](docs/ai-studio/README.md).

## Brief description (under 1,024 characters)

Northstar Vault turns tangled reflections into a Signal Map: facts, possible assumptions, tensions, options, a counterpoint and a testable 48-hour experiment. Firebase Google Sign-In and server-verified tokens protect private APIs; Firestore histories use verified-user paths with owner-only reads and server-only writes. Cloud Run calls the Gemini Developer API using a pinned Secret Manager credential that never reaches the browser. The Privacy Center supports export, confirmed deletion and an AI Studio-generated Privacy Receipt: an exact-file SHA-256 fingerprint computed locally with aggregate counts, never a claim of erasure. Sign-out clears private views and blocks late results; deletion guards stop late AI replies restoring erased content. The responsive app has bounded output, rate limits, a five-zone threat model and 36 automated checks across unit, client and synthetic-identity emulator suites. AI Studio output and reviewed changes are public; multi-turn Gemini replies persist after reload.

## Services to confirm in the form

- User authentication via Firebase
- Multi-turn interaction with the Gemini Developer API
- User-isolated Firestore document storage
- Secure API key retrieval via Google Cloud Secret Manager (pinned version 2, server-side only)
- Others: structured Signal Maps, local Privacy Receipt, data export/erasure, security headers, rate limiting, threat model, health checks

## Evaluation proof

| Criterion | Proof to show judges |
|---|---|
| Authenticity | Signal Map, counterpoint, 48-hour experiment, editorial design, Privacy Center |
| Usability | One-click Google SSO, starter prompts, clear loading/error states, history, mobile layout |
| Stability | `/api/health`, bounded reads, structured-output normalization, rate limits, 27 unit/HTTP/client/receipt tests and 9 emulator security tests |
| Security | Verified ID tokens, UID-derived paths, owner-only reads/server-only writes, pinned Secret Manager credential, CSP, export/erasure, threat model |

## Final validation before submission

- [x] Live Cloud Run public health and signed-out private-API rejection verified
- [x] Required `dev-tutorial=cloud-run-ai-challenge` label is present
- [x] Google Sign-In works on the production domain for two real Google accounts
- [x] Two synthetic-account isolation and deletion tests pass in Auth/Firestore emulators
- [x] Second real account opens its own vault without the first account's entries
- [ ] Remaining production deletion/cleanup checks after browser recovery
- [x] Multi-turn context survives reload (four messages verified on the Gemini/Secret Manager release)
- [x] No AI credential is in source or public configuration; the Gemini key is server-only
- [x] Gemini Developer API successfully called through a pinned Secret Manager credential
- [x] Export/receipt UI works; an actual downloaded-file digest was independently matched on the preceding receipt release
- [ ] Production single-entry deletion and synthetic-only full-vault erasure verified
- [x] Personal public repository contains deployment steps, Firestore rules, threat model and reproducible verification results
- [x] Public social post includes `#AccelerateAIwithCloudRun`
- [ ] Approval and publication of the refreshed social copy matching the Gemini/receipt release
- [x] Genuine AI Studio-generated enhancement integrated in source, tested and evidenced
- [x] New Privacy Receipt production release and browser check, including independently matched downloaded-file SHA-256
- [ ] All three public links work before pressing Submit
- [ ] Final accurate portal resubmission approved and confirmed
