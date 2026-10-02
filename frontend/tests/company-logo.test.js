import assert from 'node:assert/strict';
import { test } from 'node:test';

import * as backendLimits from '../../backend/src/utils/image-type.js';
import { ALLOWED_LOGO_TYPES, MAX_LOGO_BYTES, fitLogoSize, validateLogoFile } from '../src/utils/company-logo.js';

test('usa os mesmos tipos e o mesmo tamanho máximo do backend', () => {
  assert.deepEqual(ALLOWED_LOGO_TYPES, backendLimits.ALLOWED_LOGO_TYPES);
  assert.equal(MAX_LOGO_BYTES, backendLimits.MAX_LOGO_BYTES);
});

test('reduz proporcionalmente para caber em 256 x 256', () => {
  assert.deepEqual(fitLogoSize(1024, 512), { width: 256, height: 128 });
  assert.deepEqual(fitLogoSize(300, 1200), { width: 64, height: 256 });
});

test('não amplia imagens pequenas', () => {
  assert.deepEqual(fitLogoSize(120, 80), { width: 120, height: 80 });
});

test('aceita PNG, JPEG e WebP e recusa SVG, GIF e arquivos enormes', () => {
  assert.equal(validateLogoFile({ type: 'image/png', size: 1000 }), '');
  assert.equal(validateLogoFile({ type: 'image/jpeg', size: 5 * 1024 * 1024 }), '');
  assert.equal(validateLogoFile({ type: 'image/webp', size: 1000 }), '');
  assert.match(validateLogoFile({ type: 'image/svg+xml', size: 1000 }), /PNG, JPEG ou WebP/);
  assert.match(validateLogoFile({ type: 'image/gif', size: 1000 }), /PNG, JPEG ou WebP/);
  assert.match(validateLogoFile(null), /PNG, JPEG ou WebP/);
  assert.match(validateLogoFile({ type: 'image/png', size: 11 * 1024 * 1024 }), /10 MB/);
});
