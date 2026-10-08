// หน้าอัปโหลดรูปเรียกแบบจำลองทำนายค่าดิน (predictAnalysis) ผ่าน server action ของหน้านี้
// คำขอแรกหลังเครื่องของแบบจำลองหยุดพักอาจรอ 1–2 นาที — ขยายเวลาสูงสุดของฟังก์ชันบน Vercel
// (timeout ในโค้ดอย่างเดียวไม่ช่วย ถ้าฟังก์ชันถูกตัดก่อน)
export const maxDuration = 300

export default function AnalyzeUploadLayout({ children }: { children: React.ReactNode }) {
  return children
}
