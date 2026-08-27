# AI Studio feature provenance: Privacy Receipt

On 27 August 2026, Google AI Studio generated a standalone Privacy Receipt enhancement for Northstar Vault. The successful build is labeled **Gemini 3.7 Flash · Ran for 141s**. Earlier attempts failed; the subsequent successful output, not the failed attempts or saved instructions alone, is the source of this feature.

- [Original AI Studio app](https://aistudio.google.com/u/1/apps/749c6834-9e4d-4c52-8733-590c3d9c0f38?source=start&showPreview=true&showAssistant=true) (owner access may be required; no public sharing is claimed).
- [Code-view screenshot](generated-module.png), showing the actual generated module and successful generation history.
- [Original generated module](privacy-receipt.original.js), copied from the AI Studio editor before integration. SHA-256: `722ba591bd6736d12518d7ab86c4b7fc7ba8dffeee2bbcccd830dee8672cda0a`.
- [Reviewed runtime module](../../public/privacy-receipt.js) and [integration](../../public/app.js).
- [Saved custom instructions](../AI_STUDIO_CUSTOM_INSTRUCTIONS.md).

The original output also included a React preview, synthetic fixtures, a browser test runner and a five-zone threat model. Only the reviewed reusable receipt module is integrated into the existing vanilla frontend. This is **not** a claim that AI Studio built the entire journal, its backend or its deployment. The separate generated React preview is not part of the production release or a verified deliverable.

## Generation brief

Create a pure JavaScript `createPrivacyReceipt(exportText, {signal})` module for the existing export schema. Validate JSON and nested records, hash the exact original UTF-8 bytes with Web Crypto SHA-256, and return only `exportedAt`, `reflectionCount`, `messageCount`, `byteLength` and `sha256`. No model calls, external requests, storage, analytics or authentication belong in the module. Support cancellation and honest failure states; a checksum is not proof of erasure, encryption or authenticity. Use synthetic data only.

## Review and integration changes

- Replaced permissive date parsing with canonical UTC ISO timestamp validation. Nullable record timestamps match the real API schema.
- Validate message roles and compass ratings; cap receipt input at 10 MiB before parsing and after UTF-8 encoding. Larger exports remain downloadable without a receipt.
- Sanitize parse, digest and abort errors so they cannot echo private text or an arbitrary abort reason.
- Preserve the exact original export string for both its downloaded UTF-8 file and its checksum; never hash reserialized JSON.
- Add cancel/clear actions, aggregate-only receipt download and accessible status messages to the existing Privacy Center.
- Clear the receipt on panel close, session reset and sign-out; discard late results after cancellation or identity changes. Downloaded files are not deleted by clearing the panel.
- Port focused tests to the repository's Node test runner, with an independent `node:crypto` digest comparison and frontend lifecycle tests.

## Boundaries

The module has no network or storage calls. The surrounding app still makes its normal authenticated export request, then starts a user-requested local file download. SHA-256 is a fingerprint for comparing exact files; it is not a signature, an anonymity guarantee, or a deletion certificate. A receipt exposes its stated timestamp, counts, byte length and digest, so it should not automatically be treated as safe to publish. Cancellation discards pending results; it cannot stop Web Crypto internally or undo a completed download.

Run `npm run check` and `npm run test:security`. Production verification and remaining contest gates are recorded in [production-verification.md](../production-verification.md).
