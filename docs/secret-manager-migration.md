# Gemini / Secret Manager release

Status on 27 August 2026: the existing-key preflight returned **HTTP 200**, and revision `northstar-vault-gemini0827` now serves **100% production traffic** after no-traffic verification. Source: `e3b9068`. Immediate rollback: `northstar-vault-receipt0827` (working Vertex release).

## Resolved provider preflight

A server-side preflight using existing `gemini-api-key` version **2** previously returned HTTP 429 / `RESOURCE_EXHAUSTED`; after the owner resolved the credit blocker it returned HTTP 200. The key was piped directly into the request header, never printed or placed in the URL. Account-specific diagnostics are retained in the owner's private workspace rather than this public repository.

No payment, top-up or billing change was made by this deployment. Existing service identity, Firebase configuration, region and maximum of three instances were preserved.

## Verified implementation

- `src/ai.js` requires a nonempty server-side `GEMINI_API_KEY` when `GOOGLE_GENAI_USE_VERTEXAI` is not explicitly true/1.
- The SDK receives `{apiKey, vertexai: false}`. Missing keys fail closed.
- Explicit Vertex mode remains available for rollback; its SDK options contain no Gemini API key.
- `/api/config` contains only public Firebase web configuration.
- Upstream errors and secrets are excluded from application logs and user-facing errors.

## Release verification

1. Existing version 2 passed the direct Gemini Developer API preflight with HTTP 200, without exposing the credential.
2. Secret IAM was rechecked: `roles/secretmanager.secretAccessor` is granted **on this secret only** to the existing runtime identity `northstar-vault-sa@tokyo-equator-479712-j3.iam.gserviceaccount.com`. No new grant was made.
3. Runtime inspection confirmed `GOOGLE_GENAI_USE_VERTEXAI=0` and `GEMINI_API_KEY.valueFrom.secretKeyRef` naming `gemini-api-key` with key `2`, not `latest`. No plaintext Gemini key is present in the revision's environment configuration.
4. The no-traffic candidate passed readiness, health 200, private 401/no-store, exact-source asset comparisons and Firebase-only public config checks before promotion. The preceding receipt revision remains available for rollback.
5. Real signed-in Gemini continuation/reload and remaining synthetic-entry deletion results are recorded in [production verification](production-verification.md). Do not substitute emulator checks for live deletion evidence.
6. Public architecture text, LinkedIn post and submitted form now match this runtime. After explicit approval on 28 August, the existing social post was updated and the corrected brief was submitted through attempt 3. The saved content persisted after reload and the portal displayed Submitted; see [submission record](../SUBMISSION.md).

Cloud Run resolves secret-backed environment variables at instance start. This is supported secret retrieval; it does not require exposing the key or fetching it from the browser. See [Google's Secret Manager configuration guide](https://docs.cloud.google.com/run/docs/configuring/services/secrets).

The AI Studio feature-build requirement is separate. After earlier errors, a Gemini 3.7 Flash build generated the Privacy Receipt enhancement. The reviewed module is integrated and locally tested; [provenance](ai-studio/README.md) records its original output and changes. Its deployment verification is tracked separately from this provider migration.

## Rollback

If signed-in model or storage checks fail, restore traffic to the existing working revision:

```bash
gcloud run services update-traffic northstar-vault \
  --project=tokyo-equator-479712-j3 --region=asia-south1 \
  --to-revisions=northstar-vault-receipt0827=100
```

Explicit Vertex mode remains supported for rollback. It is never selected silently when a Gemini key is missing. Do not delete the known-good revision or its required permissions during verification.
