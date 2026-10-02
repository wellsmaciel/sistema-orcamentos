// Mesmos limites do backend (backend/src/utils/image-type.js).
const MAX_LOGO_BYTES = 200 * 1024;
const ALLOWED_LOGO_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
const MAX_LOGO_SIDE = 256;
// Arquivo original maior que isso nem é aberto: evita travar o navegador com fotos enormes.
const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

function validateLogoFile(file) {
  if (!file || !ALLOWED_LOGO_TYPES.includes(file.type)) {
    return 'Escolha uma imagem PNG, JPEG ou WebP.';
  }

  if (file.size > MAX_SOURCE_BYTES) {
    return 'A imagem escolhida é grande demais. Use um arquivo de até 10 MB.';
  }

  return '';
}

// Reduz proporcionalmente para caber em 256 x 256, sem nunca ampliar.
function fitLogoSize(width, height, maxSide = MAX_LOGO_SIDE) {
  const scale = Math.min(1, maxSide / Math.max(width, height));

  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

// Redimensiona no navegador e envia em WebP; se o navegador não gerar WebP, usa PNG.
// O logo fica leve para o link do cliente, mesmo quando a foto original é grande.
async function prepareLogo(file) {
  const image = await createImageBitmap(file);
  const { width, height } = fitLogoSize(image.width, image.height);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  canvas.getContext('2d').drawImage(image, 0, 0, width, height);
  image.close();

  for (const quality of [0.9, 0.75, 0.6]) {
    const blob = await canvasToBlob(canvas, 'image/webp', quality);

    if (blob?.type !== 'image/webp') {
      break;
    }

    if (blob.size <= MAX_LOGO_BYTES) {
      return blob;
    }
  }

  const pngBlob = await canvasToBlob(canvas, 'image/png');

  if (!pngBlob || pngBlob.size > MAX_LOGO_BYTES) {
    throw new Error('Não foi possível reduzir a imagem para até 200 KB. Tente outra imagem.');
  }

  return pngBlob;
}

export { ALLOWED_LOGO_TYPES, MAX_LOGO_BYTES, fitLogoSize, prepareLogo, validateLogoFile };
