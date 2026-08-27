/* global axe */
// Included only by the loopback emulator preview when ?audit=1 is requested.
const button = document.createElement('button');
button.id = 'audit-trigger';
button.className =
  'fixed right-5 bottom-3 z-50 min-h-12 rounded-full bg-ink px-5 text-xs text-white';
button.textContent = 'Run accessibility check';
const output = document.createElement('output');
output.id = 'audit-results';
output.setAttribute('aria-label', 'Local accessibility results');
output.className = 'block text-xs whitespace-pre-wrap wrap-anywhere';
document.body.append(button, output);
button.addEventListener('click', async () => {
  output.textContent = '';
  button.disabled = true;
  try {
    const results = await axe.run(
      { exclude: [['#audit-trigger'], ['#audit-results']] },
      { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] } },
    );
    output.textContent = JSON.stringify(
      {
        violations: results.violations.map(({ id, impact, help, nodes }) => ({
          id,
          impact,
          help,
          targets: nodes.map((node) => node.target),
        })),
        incomplete: results.incomplete.map(({ id, nodes }) => ({
          id,
          targets: nodes.map((node) => node.target),
        })),
        passedChecks: results.passes.length,
      },
      null,
      2,
    );
  } finally {
    button.disabled = false;
  }
});
