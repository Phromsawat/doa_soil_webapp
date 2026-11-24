// ลิงก์รายงานรวม — หลายผลในไฟล์ PDF เดียว (แผ่น A4 ต่อกันผลละหน้า)
// ใช้ทั้งฝั่งที่สร้างลิงก์ (ImportPanel) และหน้ารายงาน (/analyze/result/print?ids=...)

/**
 * จำนวนผลสูงสุดต่อรายงานหนึ่งฉบับ
 * ทุกแผ่นถูกถ่ายเป็นภาพในเบราว์เซอร์ (~0.5–1 วินาที และ ~0.4 MB ต่อหน้า)
 * มากกว่านี้ไฟล์จะช้าและใหญ่เกินไป — เกินแล้วแบ่งเป็นหลายฉบับ
 */
export const REPORT_BUNDLE_MAX = 50

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** อ่านรายการ id จาก query (?ids=a,b,c) — คัดเฉพาะ uuid ไม่ซ้ำ ตามลำดับเดิม ไม่เกิน REPORT_BUNDLE_MAX */
export function parseReportIds(v: string | undefined): string[] {
  if (!v) return []
  const ids = v.split(",").map((s) => s.trim().toLowerCase()).filter((s) => UUID.test(s))
  return [...new Set(ids)].slice(0, REPORT_BUNDLE_MAX)
}

/** แบ่ง id เป็นฉบับละไม่เกิน REPORT_BUNDLE_MAX — คืนลิงก์ของแต่ละฉบับ พร้อมลำดับที่ (เริ่ม 1) */
export function reportBundleLinks(ids: string[]): { href: string; from: number; to: number }[] {
  const out: { href: string; from: number; to: number }[] = []
  for (let i = 0; i < ids.length; i += REPORT_BUNDLE_MAX) {
    const part = ids.slice(i, i + REPORT_BUNDLE_MAX)
    out.push({
      href: `/analyze/result/print?ids=${part.join(",")}`,
      from: i + 1,
      to: i + part.length,
    })
  }
  return out
}
