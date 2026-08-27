# Staged Gemini / Secret Manager migration

Status on 27 August 2026: **prepared, not enabled in production**. The working deployment uses Vertex AI. Do not claim that an unused or merely existing secret satisfies the application's Gemini credential requirement.

## Observed blocker

A server-side preflight using existing `gemini-api-key` version **2** returned HTTP 429 / `RESOURCE_EXHAUSTED`. The key was piped directly into the request header, never printed or placed in the URL. Account-specific diagnostics are retained in the owner's private workspace rather than this public repository.

The project owner must resolve the provider preflight before switching traffic. No payment, top-up or billing change was made by this repair.

## Prepared implementation

- `src/ai.js` requires a nonempty server-side `GEMINI_API_KEY` when `GOOGLE_GENAI_USE_VERTEXAI` is not explicitly true/1.
- The SDK receives `{apiKey, vertexai: false}`. Missing keys fail closed.
- Explicit Vertex mode remains available for rollback; its SDK options contain no Gemini API key.
- `/api/config` contains only public Firebase web configuration.
- Upstream errors and secrets are excluded from application logs and user-facing errors.

## Release gates after credits are available

1. Repeat a minimal direct Gemini Developer API preflight with version 2. Require HTTP 200. Do not read or paste the secret into browser code, a terminal command argument or a document.
2. Recheck the secret's IAM policy. The 27 August inspection already found `roles/secretmanager.secretAccessor` **on this secret only** for the existing runtime identity `northstar-vault-sa@tokyo-equator-479712-j3.iam.gserviceaccount.com`; no new IAM grant was made. Preserve that scope.
3. Create a no-traffic Cloud Run candidate from the tested source, preserve existing Firebase configuration and limits, set `GOOGLE_GENAI_USE_VERTEXAI=0`, and bind `GEMINI_API_KEY=gemini-api-key:2` with `--update-secrets`. Pin version 2, not `latest`.
4. Verify readiness, public health, signed-out 401 responses, and absence of AI credentials from public assets/config. Promote the candidate only with a known-good rollback revision recorded.
5. Complete a real signed-in Gemini reflection, multi-turn reload and synthetic-entry deletion. Roll back if any check fails.
6. Update the production architecture text, LinkedIn post, screenshots and submitted form to match the verified runtime. Only then restore the Secret Manager checkbox.

Cloud Run resolves secret-backed environment variables at instance start. This is supported secret retrieval; it does not require exposing the key or fetching it from the browser. See [Google's Secret Manager configuration guide](https://docs.cloud.google.com/run/docs/configuring/services/secrets).

The AI Studio feature-build requirement is separate. After earlier errors, a Gemini 3.7 Flash build generated the Privacy Receipt enhancement. The reviewed module is integrated and locally tested; [provenance](ai-studio/README.md) records its original output and changes. Its deployment verification is tracked separately from this provider migration.
