export async function compressImage(file: File, maxDimension = 1400, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const ratio = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context unavailable for compression.');

    context.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob) throw new Error('Image compression failed.');
    return blob;
  } catch (err) {
    console.warn('compressImage failed, falling back to original file:', err);
    return file;
  }
}

export function createObjectUrl(fileOrBlob: File | Blob): string {
  return URL.createObjectURL(fileOrBlob);
}
