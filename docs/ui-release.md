# Responsive shell rebuild — 28 August 2026

Status: local verification complete; no-traffic production candidate pending.
The previous Tailwind release (`202dd15`, revision `northstar-vault-tailwind0828`)
was deployed successfully, but the subsequent user screenshot prompted this
deeper shell rebuild.

## What changed

- A bounded CSS Grid shell replaces the previous flex sizing. Header, scrolling
  conversation, and composer are separate rows.
- Tailwind container queries decide when history and Signal Map dock. Signal Map
  waits until 1440px at the default font size, leaving more reading room on laptops.
- A 64px header and 66px empty composer replace the previous 80px header and 138px
  form. New reflection is directly available on compact screens.
- Responsive behavior is isolated in `public/workspace-layout.js`. JavaScript reads
  rendered slots rather than duplicating breakpoints. It measures viewport height
  only for a keyboard-reduced visual viewport, not every desktop resize.
- Larger supporting text, a quieter actions disclosure, bounded errors, and focus
  restoration complete the interaction changes. Styling remains compiled Tailwind;
  icons are self-hosted Lucide. No framework, cloud configuration, or API migration.

## Verified locally

- `npm run check`: Prettier clean, ESLint zero warnings, reproducible asset build,
  **46 unit/HTTP/frontend-contract tests passed**.
- **9 Firebase emulator security tests passed**, including owner isolation, token
  rejection, exact deletion confirmations, and late-write erasure protection.
- `npm audit --audit-level=high`: **0 vulnerabilities**.
- Existing long chat checked at 320×568, 360×640, 390×844, 768×1024, 1024×768,
  1280×800, 1440×900, 1920×1080, 640×360, and 320×360. Every measured document
  width matched the viewport; every send button remained inside it.
- A fresh **non-emulated 1291×691 laptop window** was inspected visually. The
  workspace exactly matched the window, no inline height was pinned, the form
  measured 66px, and the conversation retained 512px of reading height.
- A 3,111-character unbroken draft wraps at 320×360. The textarea stays at 72px,
  the send target remains 48×48px, and the conversation retains 185px.
- A real emulator API failure restored its draft and showed an honest error. At
  320×360, the conversation still retained 141px and the send control was visible.
- History opened as a modal at compact width; resizing to 1024px restored the same
  panel to its slot. Signal Map opens on demand on the laptop layout.
- Reflection deletion was **cancelled**, not confirmed. Focus returned to the
  visible actions trigger; no production reflection was deleted.
- axe-core WCAG A/AA: populated mobile chat passed 26 checks; populated desktop
  with an error state passed 29. Both had zero violations and zero incomplete results.

## Important testing correction

The reported screenshot came from the local emulator preview. A retained testing
viewport reported 1440×900 while the physical browser content area was smaller,
clipping both the right panel and composer. Earlier DOM-only bounds checks did not
detect that mismatch. This release adds real-window visual acceptance, resets
overrides, and closes disposable emulated tabs after testing. Geometry checks alone
are not considered sufficient evidence.

## Scope and limits

Local browser tests use the actual frontend and authenticated Firebase emulator
API with synthetic accounts and deterministic model output. They are not evidence
of a new production Gemini call. Physical iOS/Android keyboard and manual
screen-reader checks remain separate verification; desktop emulation does not
establish full device or accessibility certification.

Production rollout and read-only asset/security verification are recorded after
the no-traffic candidate passes checks. The immediate rollback is
`northstar-vault-tailwind0828`.
