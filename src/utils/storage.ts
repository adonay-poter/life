export const INTAKE_IMAGES_BUCKET = 'intake-images';

export function isExternalAttachmentUrl(value?: string) {
  if (!value) return false;
  return value.startsWith('data:') || value.startsWith('http://') || value.startsWith('https://');
}
