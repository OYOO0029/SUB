export const IMAGE_BUCKET='work-images';
export const MAX_IMAGE_BYTES=2*1024*1024;
export const IMAGE_TYPES=['image/png','image/jpeg','image/webp','image/gif'];
export const isInlineImage=value=>typeof value==='string'&&/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(value);
export function validImageRef(ref){return !!ref&&ref.bucket===IMAGE_BUCKET&&typeof ref.path==='string'&&/^[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\.(png|jpeg|webp|gif)$/.test(ref.path)&&IMAGE_TYPES.includes(ref.mime)&&Number.isInteger(ref.size)&&ref.size>0&&ref.size<=MAX_IMAGE_BYTES;}
export function validMemoPart(part){return !!part&&(typeof part.text==='string'&&Object.keys(part).length===1||isInlineImage(part.image)&&Object.keys(part).length===1||validImageRef(part.asset)&&Object.keys(part).length===1);}
