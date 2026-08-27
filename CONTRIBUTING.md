# Developing Northstar Vault

Use Node.js 22.13+ (the production image is Node 22) and Java 21 for Firebase emulators.
Run `npm ci` from the repository root. Development tools are pinned in the lockfile.

## Daily commands

| Command                 | Purpose                                                                   |
| ----------------------- | ------------------------------------------------------------------------- |
| `npm run build`         | Generate the local Lucide sprite and compile Tailwind CSS                 |
| `npm run dev`           | Restart the Express server when backend source changes                    |
| `npm run dev:css`       | Rebuild Tailwind while editing HTML or frontend JavaScript                |
| `npm run format`        | Format maintained code, HTML, JSON, YAML, CSS input, and Markdown         |
| `npm run format:check`  | Check formatting without changing files                                   |
| `npm run lint`          | Run ESLint with no warnings allowed                                       |
| `npm run check`         | Formatting, lint, asset build, and unit/HTTP/UI-contract tests            |
| `npm run test:security` | Verify isolation and erasure against local Auth/Firestore emulators       |
| `npm run test:ui`       | Start the real frontend and API with synthetic emulator data on port 3035 |

The local UI test uses a deliberately synthetic account and deterministic AI replies.
It is for reproducible interaction testing, not proof of a real Gemini response.
Its entrypoint refuses to run outside the exact demo project/emulator hosts, binds to
loopback only, and is **not copied into the production Docker image**. Stop it with
Ctrl+C. Do not run the emulator suites simultaneously on the same ports.

For real-provider development, follow the runtime configuration section in
[README](README.md). A real backend can consume cloud credits and store entries in
your account. Never use customer journal content as test fixtures.

## Code map

| Location                    | Responsibility                                                              |
| --------------------------- | --------------------------------------------------------------------------- |
| `public/index.html`         | Semantic page structure, accessible dialogs, Tailwind utilities             |
| `public/app.js`             | Firebase sign-in, private state, requests, responsive panels, confirmations |
| `public/privacy-receipt.js` | Bounded local SHA-256 receipt computation                                   |
| `ui/tailwind.css`           | Tailwind source declarations and brand tokens only                          |
| `scripts/build-icons.mjs`   | Build self-hosted icons from the licensed Lucide package                    |
| `src/server.js`             | Authenticated API, schemas, limits, storage transactions, safe errors       |
| `src/firebase.js`           | Verified identity and owner-scoped Firestore access                         |
| `src/ai.js`                 | Server-only provider configuration and normalized structured output         |
| `test/`                     | Fast unit, HTTP, private-state, and UI-contract tests                       |
| `security/`                 | Real Firebase emulator token/rules/isolation/deletion tests                 |

## Change checklist

1. Keep private state in memory; do not put drafts or tokens in application-managed
   local storage. Firebase manages its own authentication persistence.
2. Preserve the captured user and `viewEpoch` guards around asynchronous work.
   Changing identity or reflection must invalidate old results.
3. Render journal/model content using `textContent` or `escapeHTML`. Never interpolate
   untrusted HTML, paths, user IDs, or dynamic Tailwind class fragments.
4. Use complete Tailwind utility names and shared theme tokens. Do not edit
   `public/styles.css`, `public/icons.svg`, or the copied icon license by hand.
5. Use the installed library APIs before adding new dependencies. Prefer small
   build-time additions over a new runtime framework for isolated UI behavior.
6. Run `npm run format`, `npm run check`, and `npm run test:security`. Review the
   diff; commit the regenerated public assets with source changes.
7. Test the open chat, long text, small-height viewports, drawers, keyboard focus,
   sign-out, error recovery, export, and deletion cancellation. See the
   [UI design and test guide](docs/ui-design.md).

GitHub Actions repeats formatting, linting, build reproducibility, tests, and the
production dependency audit. It has read-only repository permissions, no cloud
credentials, and **does not deploy**.

Preserve `docs/ai-studio/privacy-receipt.original.js` unchanged as provenance.
Maintained code is formatted by Prettier; the original generated artifact is
intentionally excluded.

## Release discipline

Use the existing Cloud Run project, service identity, secrets, limits, and region.
Publish a no-traffic candidate first. Verify health, unauthenticated rejection,
private response cache headers, compiled assets, and signed-in flows before
changing traffic. Keep the previous revision available for rollback. UI changes
do not justify new IAM grants, billing changes, or secret rotation.
