import { detectImageType } from '../../src/utils/image-type.js';

const PNG_HEADER = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d];
const JPEG_HEADER = [0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1];

describe('Identificação do tipo de imagem pelos primeiros bytes', () => {
  test.each([
    ['PNG', Buffer.from(PNG_HEADER), 'image/png'],
    ['JPEG', Buffer.from(JPEG_HEADER), 'image/jpeg'],
    ['WebP', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBPVP8 ')]), 'image/webp'],
  ])('reconhece %s', (_name, buffer, expectedType) => {
    expect(detectImageType(buffer)).toBe(expectedType);
  });

  test.each([
    ['SVG', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"></svg>')],
    ['HTML', Buffer.from('<!doctype html><script>alert(1)</script>')],
    ['GIF', Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(8)])],
    ['RIFF que não é WebP', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVE')])],
    ['arquivo curto demais', Buffer.from(PNG_HEADER.slice(0, 8))],
    ['valor que não é Buffer', 'image/png'],
  ])('rejeita %s', (_name, value) => {
    expect(detectImageType(value)).toBeNull();
  });
});
