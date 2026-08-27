# Adaptive interface and implementation

Northstar keeps its own calm journal identity while applying Google’s principles
for adaptive layouts, accessible targets, and consistent hierarchy. This is a
web implementation, not a claim of Material certification.

## Design foundations

- A 4px spacing base, with 8/16/24/32px groupings and 48px minimum button targets.
- Quiet surfaces, restrained elevation, and a clear distinction between primary,
  secondary, and destructive actions.
- System sans-serif for interface text and a serif accent for reflective headings.
  No remote font service or icon CDN is required.
- The ink, leaf, moss, paper, and muted tokens live in `ui/tailwind.css`.
- Lucide supplies the icons; its ISC license ships with the generated sprite.

References: Google’s [adaptive canonical layouts](https://developer.android.com/develop/ui/compose/layouts/adaptive/canonical-layouts),
[touch-target guidance](https://support.google.com/accessibility/android/answer/7101858?hl=en),
and [responsive macro layouts](https://web.dev/learn/design/macro-layouts).
Web breakpoints are content-driven; Android density-independent units are not
treated as an exact CSS-pixel device classification.

Browser baseline follows [Tailwind v4 compatibility](https://tailwindcss.com/docs/compatibility):
Chrome 111+, Safari 16.4+, and Firefox 128+. This is a support target, not evidence
that every browser/device combination was exercised in this release. The shell
uses the library’s [named container queries](https://tailwindcss.com/docs/responsive-design),
not a third-party device-detection script.

## Layout contract

| Shell width (16px base font) | Persistent content                         | On-demand content                                |
| ---------------------------- | ------------------------------------------ | ------------------------------------------------ |
| Below 1024px                 | Full-width chat                            | History and Signal Map in labelled modal drawers |
| 1024–1439px                  | 256px history + flexible chat              | Signal Map drawer                                |
| 1440px and up                | History + flexible chat + 336px Signal Map | Privacy/confirmation dialogs                     |

The workspace is a bounded, full-window grid, not an unconstrained row of fixed
panels. Tailwind **container queries** at 64rem and 90rem are the only breakpoint
source. `workspace-layout.js` reads the rendered slots and observes the shell;
there is no separate JavaScript pixel breakpoint to drift out of sync. Content
inside the chat uses its own named container queries.

The chat column has `min-w-0` and `min-h-0`, not a fixed minimum width.
Its grid has three explicit rows: header, `minmax(0, 1fr)` conversation, and
composer. Only the conversation scrolls during normal reading. The compact
single-line composer grows up to a bounded height without pushing itself offscreen.
The header is 64px and the empty composer form is 66px at the default font size.
Short-height windows hide optional hints, not the input or send control.
Messages and SHA-256 values wrap even without whitespace. The reading width is
bounded, rather than stretched across an ultrawide display.

The workspace uses dynamic viewport height and safe-area padding. CSS controls
ordinary desktop/browser resizing; JavaScript no longer pins every desktop height
to a pixel measurement. A visual-viewport height override is used only when a
keyboard reduces the visible height at scale 1, and removed when it closes.
Pinch zoom is left to the browser. The textarea is capped by both content height
and available viewport height. These two measured dimensions are the **only
runtime inline styles**; there are no authored custom CSS selectors
or `@apply` component styles. Physical Safari/Android keyboard testing remains a
separate device check; desktop viewport emulation is not a substitute for it.

## State and accessibility

Native HTML dialogs provide modal focus containment and Escape behavior. Each
drawer moves its existing panel instead of duplicating IDs or private content.
Crossing the desktop breakpoint restores the panel to its permanent slot.
Buttons have accessible names, visible keyboard focus, and explicit disabled
states. Loading and errors are announced through live regions. Reduced-motion
preferences disable decorative transitions/spinners.

New reflection is directly accessible in the compact header. Destructive actions
live in a labelled native disclosure, away from the primary send action. Cancelling
the deletion dialog returns focus to the disclosure trigger, not a hidden button.
History and Signal Map use 14px body text; message text uses 16px/28px for reading.

Search filters the loaded reflection titles/tags locally. The current API returns
the newest 50 reflections; this is not an unlimited full-vault search.
Opening history clears the prior conversation immediately while the new one loads.
Unsent drafts are kept per reflection in memory and cleared on account change.
They do not survive reload; exports are the explicit persistence control.

A failed request never fabricates an assistant message or claims a save succeeded.
It restores the draft where possible and asks the user to check history before
retrying, because a network failure can occur after server persistence.
The backend does not yet provide idempotency keys; there is no automatic retry.

Deletion uses an in-page, target-specific confirmation. Full-vault erasure also
requires the exact phrase `ERASE MY VAULT`. The client rechecks identity, selected
reflection, and view generation before the authenticated deletion request. The
server independently enforces its confirmation and anti-replay safeguards.

## Verification checklist

To run the optional local axe-core check, open `http://127.0.0.1:3035/?audit=1`
while `npm run test:ui` is running and choose **Run accessibility check**.
This test-only toolbar and axe-core are excluded from the production image.

Use the local emulator preview for synthetic interaction tests:

- Open chat at 320, 360, 390, 768, 1024, 1280, 1440, and 1920px; include 320×360
  and 640×360 short windows.
- Confirm no document-level horizontal scrolling or clipped send button.
- Test long unbroken strings, multiline drafts, and the 4,000-character limit.
- Open/close each drawer; use Escape and Tab; resize while a drawer is open.
- Check search with zero matches, new-reflection prompts, and draft restoration.
- Test loading and a failed request (`Synthetic failure test` in the local preview).
- Open Privacy center, export, inspect the wrapping receipt, and cancel deletion.
- Sign out while a request is pending; ensure no late private DOM or download.
- Use real authenticated production smoke tests separately; never label emulator
  replies as a successful Gemini/provider check.

Always inspect a **fresh, non-emulated browser tab at the actual window size** as
well as the device-size matrix. A retained browser testing override can report a
larger viewport than the physical content area and create clipped screenshots even
when DOM bounds checks pass. Reset overrides and close disposable emulated tabs
after testing. Do not treat emulated geometry alone as visual acceptance.

Automated tests cover the private-state race boundaries, confirmation targets,
draft recovery, panel ownership, unique IDs, compiled assets, API failures, and
Firebase isolation. Formatting and linting run in CI. Manual assistive-technology
and physical-device testing are still recommended; passing automated tests alone
does not establish complete accessibility.
