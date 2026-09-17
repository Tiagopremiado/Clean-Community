/**
 * Utilities for client-side image processing and WebP conversion
 * to minimize egress bandwidth and payload size.
 */

export interface WebPConversionResult {
  webpDataUrl: string;
  sizeInBytes: number;
  originalSizeInBytes: number;
  reductionPercentage: number;
  dimensions: { width: number; height: number };
}

/**
 * Converts any browser-supported image file (PNG, JPG, WEBP, AVIF, HEIC/BMP, etc.)
 * into a WebP square avatar with smart center cropping and compression.
 */
export async function convertImageToWebP(
  file: File,
  targetSize = 256,
  quality = 0.82
): Promise<WebPConversionResult> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      return reject(new Error('O arquivo selecionado não é uma imagem válida.'));
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          // Calculate center square crop
          const minDimension = Math.min(img.width, img.height);
          const cropX = (img.width - minDimension) / 2;
          const cropY = (img.height - minDimension) / 2;

          const canvas = document.createElement('canvas');
          canvas.width = targetSize;
          canvas.height = targetSize;

          const ctx = canvas.getContext('2d', { alpha: true });
          if (!ctx) {
            return reject(new Error('Não foi possível inicializar o canvas para conversão WebP.'));
          }

          // Use high quality image smoothing
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';

          // Draw cropped and scaled image onto canvas
          ctx.drawImage(
            img,
            cropX,
            cropY,
            minDimension,
            minDimension,
            0,
            0,
            targetSize,
            targetSize
          );

          // Convert to WebP
          let webpDataUrl = canvas.toDataURL('image/webp', quality);

          // Fallback if browser doesn't support image/webp export in canvas
          if (!webpDataUrl.startsWith('data:image/webp')) {
            webpDataUrl = canvas.toDataURL('image/jpeg', 0.85);
          }

          // Calculate approximate base64 payload size in bytes
          const base64Content = webpDataUrl.split(',')[1] || '';
          const sizeInBytes = Math.round((base64Content.length * 3) / 4);
          const originalSizeInBytes = file.size;
          const reductionPercentage = Math.max(
            0,
            Math.round(((originalSizeInBytes - sizeInBytes) / originalSizeInBytes) * 100)
          );

          resolve({
            webpDataUrl,
            sizeInBytes,
            originalSizeInBytes,
            reductionPercentage,
            dimensions: { width: targetSize, height: targetSize },
          });
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = () => {
        reject(new Error('Erro ao decodificar a imagem selecionada.'));
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler o arquivo de imagem.'));
    };

    reader.readAsDataURL(file);
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
