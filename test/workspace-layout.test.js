import test from 'node:test';
import assert from 'node:assert/strict';
import { keyboardViewportHeight } from '../public/workspace-layout.js';

test('desktop and ordinary browser resizing stay under CSS control', () => {
  assert.equal(keyboardViewportHeight({ layoutHeight: 900, visualHeight: 900, scale: 1 }), null);
  assert.equal(keyboardViewportHeight({ layoutHeight: 900, visualHeight: 899.5, scale: 1 }), null);
});

test('a keyboard-reduced visual viewport receives an exact shell height', () => {
  assert.equal(keyboardViewportHeight({ layoutHeight: 844, visualHeight: 496, scale: 1 }), 496);
});

test('pinch zoom never freezes the workspace at a measured height', () => {
  assert.equal(keyboardViewportHeight({ layoutHeight: 844, visualHeight: 496, scale: 1.5 }), null);
  assert.equal(
    keyboardViewportHeight({ layoutHeight: 844, visualHeight: undefined, scale: 1 }),
    null,
  );
});
