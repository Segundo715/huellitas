'use client';

const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 320 * 1024;
const MAX_DIMENSIONS = [1280, 1024, 800, 640];
const QUALITIES = [0.82, 0.72, 0.62, 0.52];

function canvasToWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error('No se pudo procesar la imagen.'));
        return;
      }
      if (blob.type !== 'image/webp') {
        reject(new Error('Este navegador no pudo generar WebP. Usa un navegador actualizado.'));
        return;
      }
      resolve(blob);
    }, 'image/webp', quality);
  });
}

export async function compressImageToWebp(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Selecciona un archivo de imagen.');
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error('La imagen original debe pesar menos de 12 MB.');
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = objectUrl;
    await image.decode();
  } catch {
    URL.revokeObjectURL(objectUrl);
    throw new Error('No se pudo abrir esta imagen. Prueba con JPG, PNG o WebP.');
  }

  try {
    for (const maxDimension of MAX_DIMENSIONS) {
      const scale = Math.min(1, maxDimension / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('No se pudo preparar la imagen.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      for (const quality of QUALITIES) {
        const blob = await canvasToWebp(canvas, quality);
        if (blob.size <= MAX_OUTPUT_BYTES) {
          return await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error('No se pudo leer la imagen procesada.'));
            reader.readAsDataURL(blob);
          });
        }
      }
    }
  } finally {
    URL.revokeObjectURL(objectUrl);
  }

  throw new Error('La imagen sigue siendo demasiado pesada. Prueba con una foto más pequeña.');
}
