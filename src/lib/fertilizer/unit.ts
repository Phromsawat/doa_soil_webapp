// หน่วยของปริมาณธาตุอาหารที่พืชต้องการ (fertilizer_recommendations.target_unit)
// ฐานข้อมูลเก็บเป็นภาษาอังกฤษ ("g/tree/year", "kg/rai") ซึ่งตรรกะการคำนวณใช้อยู่
// ฟังก์ชันนี้แปลงเฉพาะตอนแสดงผล — อย่าส่งค่าที่แปลงแล้วกลับไปคำนวณ

const WORD_TH: Record<string, string> = {
  g: "กรัม",
  kg: "กก.",
  tree: "ต้น",
  rai: "ไร่",
  year: "ปี",
}

/** "g/tree/year" -> "กรัม/ต้น/ปี", "kg/rai" -> "กก./ไร่" (คำที่ไม่รู้จักคงไว้ตามเดิม) */
export function unitTh(unit: string | null | undefined): string {
  if (!unit) return ""
  return unit
    .split("/")
    .map((w) => WORD_TH[w.trim().toLowerCase()] ?? w.trim())
    .join("/")
}
