/**
 * Responsive shell behavior. Tailwind container queries own the breakpoints;
 * JavaScript reads rendered slots instead of maintaining a second copy.
 * Panels retain one DOM instance between docked and modal views.
 */
export function createWorkspaceLayout({ root, panels, canOpen, onResize, view = window }) {
  const docked = (name) => view.getComputedStyle(panels[name].slot).display !== 'none';
  const restore = (name) => {
    const { slot, panel, trigger } = panels[name];
    if (panel.parentElement !== slot) slot.append(panel);
    trigger.setAttribute('aria-expanded', 'false');
  };
  const close = (name) => {
    panels[name].dialog.close();
    restore(name);
  };
  const open = (name) => {
    if (!canOpen() || docked(name)) return;
    for (const other of Object.keys(panels)) if (other !== name) close(other);
    const { dialog, panel, trigger, dismiss } = panels[name];
    dialog.append(panel);
    trigger.setAttribute('aria-expanded', 'true');
    dialog.showModal();
    dismiss.focus();
  };
  const sync = () => {
    const height = keyboardViewportHeight({
      layoutHeight: view.document.documentElement.clientHeight,
      visualHeight: view.visualViewport?.height,
      scale: view.visualViewport?.scale,
    });
    // CSS owns desktop/browser resizing. Override only when the keyboard reduces
    // the visual viewport. Never freeze a measured desktop height in pixels.
    if (height === null) root.style.removeProperty('height');
    else root.style.height = `${height}px`;
    for (const name of Object.keys(panels)) {
      if (panels[name].dialog.open && docked(name)) {
        close(name);
        // The modal trigger is now hidden. Move focus to a useful docked control.
        panels[name].dockedFocus?.focus();
      }
    }
    onResize();
  };
  for (const [name, { dialog, trigger, dismiss }] of Object.entries(panels)) {
    trigger.addEventListener('click', () => open(name));
    dismiss.addEventListener('click', () => close(name));
    dialog.addEventListener('close', () => {
      if (!dialog.open) restore(name);
    });
  }
  view.addEventListener('resize', sync, { passive: true });
  view.visualViewport?.addEventListener('resize', sync, { passive: true });
  // Container resizing (such as a split view) need not cause a window resize.
  const observer = view.ResizeObserver ? new view.ResizeObserver(sync) : null;
  observer?.observe(root);
  return { open, close, sync };
}

/** Return a keyboard-reduced height, or null to leave native CSS sizing alone. */
export function keyboardViewportHeight({ layoutHeight, visualHeight, scale }) {
  if (
    scale !== 1 ||
    !Number.isFinite(layoutHeight) ||
    !Number.isFinite(visualHeight) ||
    visualHeight <= 0 ||
    visualHeight >= layoutHeight - 1
  )
    return null;
  return visualHeight;
}
