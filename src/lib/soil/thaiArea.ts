// หาตำบล/อำเภอ/จังหวัดของพิกัดผ่าน /api/reverse-geocode (ขอบเขตตำบลของเราเอง) — ใช้ฝั่งเบราว์เซอร์
// ใช้ตัดสินว่าจุดอยู่ในประเทศไทยไหม: ค่าดินจากจุดตัวอย่างใกล้สุดไม่จำกัดระยะ
// แต่ไม่ให้ค่ากับจุดในทะเลหรือประเทศเพื่อนบ้าน

import type { PickedArea } from "@/app/analyze/map/MapPicker"

export type AreaLookup =
  | { status: "inside"; area: PickedArea }
  | { status: "outside" } // API ตอบ 404 = ไม่อยู่ในตำบลใดของไทย
  | { status: "error" } // เครือข่าย/เซิร์ฟเวอร์มีปัญหา — ไม่รู้ว่าอยู่ในไทยไหม

export async function lookupThaiArea(lat: number, lng: number): Promise<AreaLookup> {
  try {
    const res = await fetch(`/api/reverse-geocode?lat=${lat}&lng=${lng}`)
    if (res.status === 404) return { status: "outside" }
    if (!res.ok) return { status: "error" }
    return { status: "inside", area: (await res.json()) as PickedArea }
  } catch {
    return { status: "error" }
  }
}
