// ชื่อประเภทของรายการวิเคราะห์ (analyses.input_mode) ที่แสดงในฝั่งแอดมินและไฟล์ Excel
// ตั้งตามที่มาของค่าดิน — ฝั่งผู้ใช้ (หน้าผล/ประวัติ) ใช้คำสั้นของตัวเองอยู่แล้ว
import type { InputMode } from "@/types/database"

export const INPUT_MODE_LABEL: Record<InputMode, string> = {
  image_upload: "วิเคราะห์ด้วย AI",            // หน้าอัปโหลดรูป — ค่าดินจากแบบจำลอง
  manual_form: "กรอกค่าด้วยตนเอง",             // หน้าคำนวณปุ๋ย — ผู้ใช้กรอก/นำเข้าค่าดินเอง
  map_pin: "ปักหมุดแผนที่",
}

export const inputModeLabel = (mode: string | null | undefined) =>
  (mode && INPUT_MODE_LABEL[mode as InputMode]) || mode || ""
