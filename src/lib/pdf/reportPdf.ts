// สร้างไฟล์ PDF ของรายงานผลวิเคราะห์ดิน (ฝั่งเบราว์เซอร์)
//
// ถ่ายภาพแผ่นรายงานบนจอ (A4Sheet ขนาด A4 พอดี) แล้ววางเต็มหน้า A4 หนึ่งหน้า
// ไฟล์จึงหน้าตาเหมือนหน้าตัวอย่างทุกอย่าง — เดิมวาดใหม่ด้วยคำสั่ง jsPDF ทีละส่วน
// ผลออกมาไม่ตรงกับหน้าจอ (ฟอนต์เล็ก ตัวห้อย ₂ ₅ หาย ตารางไม่รวมช่อง และยาวเกินหน้า)
//
// ใช้ html-to-image (วาดผ่าน SVG foreignObject) เบราว์เซอร์จัดตัวอักษรไทยเองจึงไม่เพี้ยน
// และรองรับสีแบบ lab()/oklch() ของ Tailwind v4 ที่ html2canvas อ่านไม่ได้
// ข้อแลก: ข้อความในไฟล์เป็นภาพ คัดลอก/ค้นหาไม่ได้
//
// ทั้งสองไลบรารี import แบบ dynamic ตอนกดปุ่ม จึงไม่ถ่วง bundle ของหน้าอื่น

const A4_MM = { w: 210, h: 297 }

export async function downloadSheetPdf(sheet: HTMLElement, filename: string) {
  const [{ toJpeg }, { jsPDF }] = await Promise.all([import("html-to-image"), import("jspdf")])

  const options = {
    pixelRatio: 2, // ~190 dpi บน A4 — คมพอสำหรับพิมพ์ ไฟล์ไม่ใหญ่
    quality: 0.92,
    backgroundColor: "#ffffff",
    // ค่าของแผ่นบนจอที่ไม่ควรติดไปในไฟล์ (ระยะห่างรอบแผ่น/เงา)
    style: { margin: "0", boxShadow: "none" },
  }
  // Safari บางรุ่นวาดรูปโลโก้ไม่ทันในรอบแรก — ถ่ายทิ้งหนึ่งรอบก่อนแล้วใช้รอบที่สอง
  await toJpeg(sheet, options).catch(() => null)
  const image = await toJpeg(sheet, options)

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })
  doc.addImage(image, "JPEG", 0, 0, A4_MM.w, A4_MM.h, undefined, "FAST")
  doc.save(filename)
}
