// เนื้อหาหน้าหลักที่แอดมินแก้ได้ — ส่วน "รายละเอียดของโครงการ" และ "ติดต่อเรา"
//
// เก็บเป็นแถว slug = "home" ในตาราง page_contents (คอลัมน์ blocks เป็น jsonb เก็บ object นี้)
// RLS ของตารางให้เขียนได้เฉพาะแอดมิน จึงไม่ต้องมี migration เพิ่ม
//
// ฟอร์มแก้ไขเติมข้อความปัจจุบันไว้ทุกช่องทั้งไทยและอังกฤษ
// ช่องที่ถูกลบจนว่าง = ใช้ข้อความตั้งต้น (ข้อความเดิมใน TH_ENG.ts) หน้าเว็บจึงไม่มีช่องว่าง
// ไฟล์นี้ไม่แตะ Supabase ใช้ได้ทั้งฝั่ง server และ client

import { translations, type Language } from "@/lib/TH_ENG"

export const HOME_SLUG = "home"

export const HOME_TEXT_KEYS = [
  "projectDescription",
  "organizedBy",
  "contactPlace",
  "address",
  "businessHours",
  "phone",
] as const
export type HomeTextKey = (typeof HOME_TEXT_KEYS)[number]
export type HomeTexts = Record<HomeTextKey, string>

/** ค่าที่แอดมินกรอก (ช่องว่างได้) — เก็บลงฐานข้อมูลตามนี้ */
export interface HomeContentInput {
  th: HomeTexts
  en: HomeTexts
  email: string
  mapsUrl: string
  lat: number | null
  lng: number | null
}

/** ค่าที่ใช้แสดงผลจริง — เติมช่องว่างด้วยค่าตั้งต้นแล้ว */
export interface HomeContent {
  th: HomeTexts
  en: HomeTexts
  email: string
  mapsUrl: string
  lat: number
  lng: number
}

function textsFrom(lang: Language): HomeTexts {
  const t = translations[lang]
  return {
    projectDescription: t.projectDescription,
    organizedBy: t.organizedByDesc,
    contactPlace: [t.contactDept1, t.contactDept2, t.contactDept3, t.contactDept4].join("\n"),
    address: t.addressFull,
    businessHours: t.businessHoursFull,
    phone: t.contactPhoneShort,
  }
}

export const HOME_DEFAULTS: HomeContent = {
  th: textsFrom("th"),
  en: textsFrom("en"),
  email: "soilandwatergroup@doa.in.th",
  mapsUrl: "https://maps.app.goo.gl/Fh4E8ChqGUo6fRio6",
  lat: 13.846650240280857,
  lng: 100.57496470153023,
}

const MAX_TEXT = 2000
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const str = (v: unknown) => (typeof v === "string" ? v.trim().slice(0, MAX_TEXT) : "")
const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null)

function textsOf(v: unknown): HomeTexts {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>
  return Object.fromEntries(HOME_TEXT_KEYS.map((k) => [k, str(o[k])])) as HomeTexts
}

/** จัดรูปค่าที่อ่านจากฐานข้อมูล/รับจากฟอร์มให้ถูกชนิด (ค่าผิดชนิดกลายเป็นช่องว่าง) */
export function sanitizeHome(raw: unknown): HomeContentInput {
  const o = (raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>
  return {
    th: textsOf(o.th),
    en: textsOf(o.en),
    email: str(o.email),
    mapsUrl: str(o.mapsUrl),
    lat: num(o.lat),
    lng: num(o.lng),
  }
}

/** ตรวจค่าก่อนบันทึก — คืนข้อความผิดพลาด หรือ null ถ้าผ่าน */
export function validateHome(c: HomeContentInput): string | null {
  if (c.email && !EMAIL_RE.test(c.email)) return "รูปแบบอีเมลไม่ถูกต้อง"
  if (c.mapsUrl && !/^https:\/\//i.test(c.mapsUrl)) return "ลิงก์ Google Maps ต้องขึ้นต้นด้วย https://"
  if ((c.lat === null) !== (c.lng === null)) return "กรอกพิกัดให้ครบทั้งละติจูดและลองจิจูด"
  if (c.lat !== null && (c.lat < -90 || c.lat > 90)) return "ละติจูดต้องอยู่ระหว่าง -90 ถึง 90"
  if (c.lng !== null && (c.lng < -180 || c.lng > 180)) return "ลองจิจูดต้องอยู่ระหว่าง -180 ถึง 180"
  return null
}

/** เติมช่องว่างด้วยค่าตั้งต้น ได้ค่าที่พร้อมแสดงผล (ค่าที่ไม่ผ่านการตรวจก็ใช้ค่าตั้งต้นแทน) */
export function resolveHome(c: HomeContentInput | null): HomeContent {
  if (!c) return HOME_DEFAULTS
  const fill = (lang: Language): HomeTexts =>
    Object.fromEntries(HOME_TEXT_KEYS.map((k) => [k, c[lang][k] || HOME_DEFAULTS[lang][k]])) as HomeTexts
  const coordsOk = c.lat !== null && c.lng !== null && Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180
  return {
    th: fill("th"),
    en: fill("en"),
    email: c.email && EMAIL_RE.test(c.email) ? c.email : HOME_DEFAULTS.email,
    mapsUrl: /^https:\/\//i.test(c.mapsUrl) ? c.mapsUrl : HOME_DEFAULTS.mapsUrl,
    lat: coordsOk ? c.lat! : HOME_DEFAULTS.lat,
    lng: coordsOk ? c.lng! : HOME_DEFAULTS.lng,
  }
}
