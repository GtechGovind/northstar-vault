# Responsive Tailwind UI — 28 August 2026

Status: local verification complete; production rollout pending.

## Verified locally

- Prettier checks all maintained source, HTML, CSS input, JSON/YAML, and documentation.
  The Tailwind formatter plugin sorts utility classes. ESLint finishes with zero warnings.
- 39 unit/HTTP/frontend-contract tests and 9 Firebase emulator security tests pass.
- Dependency audit reports no vulnerabilities in the installed dependency tree.
- Real browser checks at 320×568, 390×844, 768×1024, 1024×768, 1280×800,
  1440×900, and 640×360: no document horizontal overflow; composer inside viewport.
- A 3,145-character unbroken draft wraps on a 320px screen. A multiline draft
  respects the 90px input-height cap in a 360px-high viewport.
- Mobile history/search and Signal Map remain reachable. Resizing an open history
  drawer to 1024px closes the modal and restores the existing sidebar.
- Short-screen navigation can scroll to Privacy center. Export produces a receipt;
  the exact erase phrase enables confirmation, and cancellation returns safely.
- A real emulator API failure restores the draft without a fabricated AI response.
  A subsequent successful request renders the response and Signal Map.
- Native HTML deletion dialogs cancel with Escape and restore keyboard focus.
- axe-core WCAG A/AA checks report zero violations and zero incomplete checks on
  the tested landing screen (18 checks), authenticated mobile empty state (24),
  and populated three-column desktop chat (28). The audit caught and led to fixes
  for tinted-surface contrast and keyboard access to the Signal Map scroll region.

## Scope and limits

The browser checks use the real frontend and authenticated local Firebase API with
synthetic accounts and deterministic model output. They do not demonstrate a new
production Gemini call. No real user reflections were erased during this UI work.

The test suite does not replace manual screen-reader testing or physical iOS/
Android keyboard verification. Production authentication and runtime asset checks
are recorded after deployment, below.
