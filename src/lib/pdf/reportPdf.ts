// สร้างไฟล์ PDF ของรายงานผลวิเคราะห์ดิน (ฝั่งเบราว์เซอร์)
//
// ทำไมไม่ใช้ window.print(): บนเว็บการบันทึกเป็น PDF ต้องผ่านกล่องพิมพ์ของเบราว์เซอร์
// ไฟล์นี้สร้าง PDF เองด้วย jsPDF จึงกดแล้วดาวน์โหลดได้เลย ไม่มีกล่องขึ้นมา
// และตัวอักษรเป็นข้อความจริง (คมชัด คัดลอก/ค้นหาได้) ไม่ใช่ภาพ
//
// ฟอนต์: Noto Sans Thai (OFL-1.1) โหลดจาก /fonts ตอนกดปุ่ม ไม่ฝังใน bundle
// ตรวจแล้วว่าสระ/วรรณยุกต์ในฟอนต์นี้กว้าง 0 จึงซ้อนบนพยัญชนะได้ถูกตำแหน่ง
// แม้ jsPDF จะไม่ทำ text shaping ให้

export interface ReportNutrient {
  label: string
  value: number | null
  unit: string
  levelText: string | null
  levelColor: string | null
}

export interface ReportPlan {
  title: string
  unit: string
  rows: { stage: string; grade: string; amount: number }[]
}

export interface ReportData {
  cropName: string
  dateText: string
  area: string
  coords: string | null
  inputModeText: string
  ph: number | null
  nutrients: ReportNutrient[]
  target: { n: number | null; p2o5: number | null; k2o: number | null; unit: string } | null
  plans: ReportPlan[]
  blend: { unitText: string; rows: { name: string; amount: number }[] } | null
  note: { lines: string[]; source: string | null } | null
}

const FONT_URL = "/fonts/NotoSansThai-Regular.ttf"
const FONT_NAME = "NotoSansThai"
const GREEN: [number, number, number] = [26, 77, 46]
const GRAY: [number, number, number] = [102, 102, 102]

let fontBase64Cache: string | null = null

async function loadFontBase64(): Promise<string> {
  if (fontBase64Cache) return fontBase64Cache
  const res = await fetch(FONT_URL)
  if (!res.ok) throw new Error("โหลดฟอนต์สำหรับ PDF ไม่สำเร็จ")
  const buf = await res.arrayBuffer()
  // แปลงเป็น base64 ทีละก้อน กัน call stack ล้นตอนไฟล์ใหญ่
  const bytes = new Uint8Array(buf)
  let bin = ""
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  fontBase64Cache = btoa(bin)
  return fontBase64Cache
}

function hexToRgb(hex: string): [number, number, number] {
  const m = hex.replace("#", "")
  return [
    parseInt(m.slice(0, 2), 16),
    parseInt(m.slice(2, 4), 16),
    parseInt(m.slice(4, 6), 16),
  ]
}

/**
 * ประกอบเอกสาร PDF (ไม่ผูกกับเบราว์เซอร์ จึงทดสอบจาก Node ได้)
 * คืน jsPDF instance ให้ผู้เรียกไปเซฟ/ส่งออกเอง
 */
export async function buildReportPdf(data: ReportData, fontB64: string) {
  const [{ jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ])
  const autoTable = autoTableMod.default

  const doc = new jsPDF({ unit: "mm", format: "a4" })
  doc.addFileToVFS(`${FONT_NAME}.ttf`, fontB64)
  doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, "normal")
  // autoTable ขอสไตล์ bold กับหัวตาราง ถ้าไม่ลงทะเบียนไว้จะตกไปใช้ฟอนต์เริ่มต้น
  // ซึ่งไม่มีอักษรไทย -> หัวตารางกลายเป็นช่องว่าง (ใช้ไฟล์เดิม น้ำหนักปกติ)
  doc.addFont(`${FONT_NAME}.ttf`, FONT_NAME, "bold")
  doc.setFont(FONT_NAME)

  const M = 15                       // ระยะขอบ
  const W = doc.internal.pageSize.getWidth()
  let y = M

  const tableBase = {
    styles: { font: FONT_NAME, fontSize: 9, cellPadding: 2, textColor: [26, 26, 26] as [number, number, number] },
    headStyles: { font: FONT_NAME, fillColor: GREEN, textColor: [255, 255, 255] as [number, number, number], fontSize: 9 },
    alternateRowStyles: { fillColor: [247, 249, 247] as [number, number, number] },
    margin: { left: M, right: M },
  }

  // ---------------------------------------------------------------- หัวรายงาน
  doc.setFontSize(15)
  doc.setTextColor(...GREEN)
  doc.text("ผลวิเคราะห์ดินและคำแนะนำการใช้ปุ๋ย", M, y + 4)
  y += 9
  doc.setFontSize(9)
  doc.setTextColor(...GRAY)
  doc.text("DOA-Soil Test Kit · กรมวิชาการเกษตร", M, y)
  y += 4
  doc.setDrawColor(...GREEN)
  doc.setLineWidth(0.5)
  doc.line(M, y, W - M, y)
  y += 6

  // ---------------------------------------------------------------- ข้อมูลตัวอย่าง
  const meta: string[][] = [
    ["พืชที่ปลูก", data.cropName],
    ["วันที่วิเคราะห์", data.dateText],
    ["พื้นที่เก็บตัวอย่าง", data.area || "ไม่ระบุ"],
    ["วิธีได้มา", data.inputModeText],
  ]
  if (data.coords) meta.push(["พิกัด", data.coords])
  if (data.ph != null) meta.push(["ความเป็นกรด-ด่าง (pH)", String(data.ph)])

  autoTable(doc, {
    ...tableBase,
    startY: y,
    body: meta,
    theme: "plain",
    columnStyles: {
      0: { cellWidth: 45, textColor: GRAY },
      1: { fontStyle: "normal" },
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // ---------------------------------------------------------------- ระดับธาตุอาหาร
  doc.setFontSize(12)
  doc.setTextColor(...GREEN)
  doc.text("ระดับธาตุอาหารในดิน", M, y)
  y += 2

  autoTable(doc, {
    ...tableBase,
    startY: y,
    head: [["ธาตุอาหาร", "ค่าที่วัดได้", "ระดับ"]],
    body: data.nutrients.map((n) => [
      n.label,
      n.value != null ? `${n.value} ${n.unit}` : "–",
      n.levelText ?? "–",
    ]),
    columnStyles: { 1: { halign: "right" }, 2: { halign: "center" } },
    didParseCell: (hook) => {
      if (hook.section === "body" && hook.column.index === 2) {
        const c = data.nutrients[hook.row.index]?.levelColor
        if (c) hook.cell.styles.textColor = hexToRgb(c)
      }
    },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // ---------------------------------------------------------------- ธาตุอาหารที่พืชต้องการ
  if (data.target) {
    doc.setFontSize(12)
    doc.setTextColor(...GREEN)
    doc.text("ปริมาณธาตุอาหารที่พืชต้องการ", M, y)
    y += 2
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["N (ไนโตรเจน)", "P₂O₅ (ฟอสฟอรัส)", "K₂O (โพแทสเซียม)", "หน่วย"]],
      body: [[
        data.target.n ?? "–",
        data.target.p2o5 ?? "–",
        data.target.k2o ?? "–",
        data.target.unit,
      ].map(String)],
      columnStyles: { 0: { halign: "center" }, 1: { halign: "center" }, 2: { halign: "center" }, 3: { halign: "center" } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  // ---------------------------------------------------------------- แผนตามระยะ
  if (data.plans.length > 0) {
    doc.setFontSize(12)
    doc.setTextColor(...GREEN)
    doc.text("แผนการใส่ปุ๋ยตามระยะการเจริญเติบโต", M, y)
    y += 2

    for (const plan of data.plans) {
      doc.setFontSize(10)
      doc.setTextColor(26, 26, 26)
      doc.text(plan.title, M, y + 4)
      y += 6
      autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [["ระยะ", "สูตรปุ๋ย", `ปริมาณ (${plan.unit})`]],
        body: plan.rows.map((r) => [r.stage, r.grade, r.amount.toLocaleString()]),
        columnStyles: { 2: { halign: "right" } },
      })
      y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
    }
    y += 1
  }

  // ---------------------------------------------------------------- ปริมาณปุ๋ยที่ต้องใช้
  if (data.blend) {
    doc.setFontSize(12)
    doc.setTextColor(...GREEN)
    doc.text("ปริมาณปุ๋ยที่ต้องใช้ (จากสูตรที่เลือก)", M, y)
    y += 2
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["สูตรปุ๋ย", `ปริมาณ (${data.blend.unitText})`]],
      body: data.blend.rows.map((r) => [r.name, Math.ceil(r.amount).toLocaleString()]),
      columnStyles: { 1: { halign: "right" } },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6
  }

  // ---------------------------------------------------------------- หมายเหตุ
  if (data.note && data.note.lines.length > 0) {
    if (y > doc.internal.pageSize.getHeight() - 40) { doc.addPage(); y = M }
    doc.setFontSize(11)
    doc.setTextColor(...GREEN)
    doc.text("หมายเหตุ", M, y)
    y += 5
    doc.setFontSize(9)
    doc.setTextColor(26, 26, 26)
    for (const line of data.note.lines) {
      const wrapped = doc.splitTextToSize(line, W - M * 2) as string[]
      doc.text(wrapped, M, y)
      y += wrapped.length * 4.5 + 1
    }
    if (data.note.source) {
      doc.setFontSize(8)
      doc.setTextColor(...GRAY)
      doc.text(`ที่มา: ${data.note.source}`, M, y + 1)
      y += 5
    }
  }

  // ---------------------------------------------------------------- ท้ายทุกหน้า
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    const h = doc.internal.pageSize.getHeight()
    doc.setFontSize(8)
    doc.setTextColor(...GRAY)
    doc.text(`ออกรายงานเมื่อ ${data.dateText}`, M, h - 8)
    doc.text(`หน้า ${i}/${pages}`, W - M, h - 8, { align: "right" })
  }

  return doc
}

/** สร้างและดาวน์โหลดไฟล์ PDF (ฝั่งเบราว์เซอร์) */
export async function downloadReportPdf(data: ReportData, filename: string) {
  const doc = await buildReportPdf(data, await loadFontBase64())
  doc.save(filename)
}
