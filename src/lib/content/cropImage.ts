// รูปพืช/ประเภทพืชที่แอดมินอัปโหลดเอง — เก็บใน bucket page-images โฟลเดอร์ crops/
// ใช้ได้ทั้งฝั่ง server และ client (ไม่มี "use server")

export const CROP_IMAGE_BUCKET = "page-images"
export const CROP_IMAGE_FOLDER = "crops"
export const CROP_IMAGE_MAX_BYTES = 2 * 1024 * 1024
export const CROP_IMAGE_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
}

const BUCKET_BASE = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${CROP_IMAGE_BUCKET}/`
const FOLDER_PREFIX = `${BUCKET_BASE}${CROP_IMAGE_FOLDER}/`

/** ใช้เฉพาะ URL ที่ชี้มาโฟลเดอร์ของเราเอง — ค่าอื่น (เช่นแก้ตรงผ่าน API) ถือว่าไม่มีรูป ใช้ไอคอนเดิมแทน */
export function safeCropImage(url: string | null | undefined): string | null {
  return url && url.startsWith(FOLDER_PREFIX) ? url : null
}

/** path ของไฟล์ใน bucket (เช่น "crops/crop-xxx.webp") สำหรับลบไฟล์เก่า */
export function cropImagePath(url: string | null | undefined): string | null {
  const safe = safeCropImage(url)
  return safe ? decodeURIComponent(safe.slice(BUCKET_BASE.length)) : null
}
