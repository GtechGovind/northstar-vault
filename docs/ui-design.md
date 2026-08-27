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

## Layout contract

| Available width | Persistent content                         | On-demand content                                |
| --------------- | ------------------------------------------ | ------------------------------------------------ |
| Below 1024px    | Full-width chat                            | History and Signal Map in labelled modal drawers |
| 1024–1279px     | 256px history + flexible chat              | Signal Map drawer                                |
| 1280px and up   | History + flexible chat + 320px Signal Map | Privacy/confirmation dialogs                     |
| 1536px and up   | Same structure, with 352px Signal Map      | Same dialogs                                     |

The chat column has `min-w-0` and `min-h-0`, not a fixed minimum width.
The conversation scrolls independently; the composer occupies its own flex row.
Messages and SHA-256 values wrap even without whitespace. The reading width is
bounded, rather than stretched across an ultrawide display.

The workspace uses dynamic viewport height, safe-area padding, and the browser’s
visual viewport to accommodate on-screen keyboards. The textarea is capped by
both content height and available viewport height. These two measured dimensions
are the **only runtime inline styles**; there are no authored custom CSS selectors
or `@apply` component styles. Physical Safari/Android keyboard testing remains a
separate device check; desktop viewport emulation is not a substitute for it.

## State and accessibility

Native HTML dialogs provide modal focus containment and Escape behavior. Each
drawer moves its existing panel instead of duplicating IDs or private content.
Crossing the desktop breakpoint restores the panel to its permanent slot.
Buttons have accessible names, visible keyboard focus, and explicit disabled
states. Loading and errors are announced through live regions. Reduced-motion
preferences disable decorative transitions/spinners.

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

- Open chat at 320, 390, 768, 1024, 1280, and 1440px; include a short landscape view.
- Confirm no document-level horizontal scrolling or clipped send button.
- Test long unbroken strings, multiline drafts, and the 4,000-character limit.
- Open/close each drawer; use Escape and Tab; resize while a drawer is open.
- Check search with zero matches, new-reflection prompts, and draft restoration.
- Test loading and a failed request (`Synthetic failure test` in the local preview).
- Open Privacy center, export, inspect the wrapping receipt, and cancel deletion.
- Sign out while a request is pending; ensure no late private DOM or download.
- Use real authenticated production smoke tests separately; never label emulator
  replies as a successful Gemini/provider check.

Automated tests cover the private-state race boundaries, confirmation targets,
draft recovery, panel ownership, unique IDs, compiled assets, API failures, and
Firebase isolation. Formatting and linting run in CI. Manual assistive-technology
and physical-device testing are still recommended; passing automated tests alone
does not establish complete accessibility.
