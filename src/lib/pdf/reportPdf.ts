// สร้างไฟล์ PDF ของรายงานผลวิเคราะห์ดิน (ฝั่งเบราว์เซอร์)
//
// ทำไมไม่ใช้ window.print(): บนเว็บการบันทึกเป็น PDF ต้องผ่านกล่องพิมพ์ของเบราว์เซอร์
// ไฟล์นี้สร้าง PDF เองด้วย jsPDF จึงกดแล้วดาวน์โหลดได้เลย ไม่มีกล่องขึ้นมา
// และตัวอักษรเป็นข้อความจริง (คมชัด คัดลอก/ค้นหาได้) ไม่ใช่ภาพ
//
// เลย์เอาต์วาดให้ตรงกับหน้ารายงานบนจอ (.report-root ใน globals.css):
// แถบเขียวหน้าหัวข้อ, แถบสีระดับธาตุอาหาร, การ์ด N-P-K, ตารางหัวเขียวอ่อน,
// กล่องหมายเหตุสีเหลือง
//
// ฟอนต์: Noto Sans Thai (OFL-1.1) โหลดจาก /fonts ตอนกดปุ่ม ไม่ฝังใน bundle
// ตรวจแล้วว่าสระ/วรรณยุกต์ในฟอนต์นี้กว้าง 0 จึงซ้อนบนพยัญชนะได้ถูกตำแหน่ง
// แม้ jsPDF จะไม่ทำ text shaping

export interface ReportNutrient {
  label: string
  value: number | null
  unit: string
  levelText: string | null
  levelColor: string | null
  /** 0-100 ความยาวแถบ */
  levelPct: number | null
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
// โลโก้กรมฯ แปลงจาก doa-logo.svg เป็น JPEG ไว้ล่วงหน้า (jsPDF ฝัง SVG ไม่ได้
// และไฟล์ SVG ต้นฉบับใหญ่เกือบ 1 MB) — ไฟล์นี้ 17 KB พอสำหรับพิมพ์ขนาด ~14 มม.
const LOGO_URL = "/img/doa-logo-print.jpg"

// สีชุดเดียวกับ globals.css
type RGB = [number, number, number]
const BRAND: RGB = [26, 77, 46]        // --brand #1a4d2e
const INK: RGB = [26, 26, 26]          // --ink
const MUTED: RGB = [107, 114, 128]     // --muted
const LINE: RGB = [229, 231, 235]      // --line
const TINT: RGB = [241, 247, 242]      // --tint
const TINT_BORDER: RGB = [219, 232, 222]
const BAR_BG: RGB = [243, 244, 246]
const NOTE_BG: RGB = [255, 248, 230]
const NOTE_BORDER: RGB = [251, 225, 146]
const NOTE_INK: RGB = [138, 109, 59]
const STAGE_BG: RGB = [250, 250, 250]

let fontBase64Cache: string | null = null

async function loadFontBase64(): Promise<string> {
  if (fontBase64Cache) return fontBase64Cache
  const res = await fetch(FONT_URL)
  if (!res.ok) throw new Error("โหลดฟอนต์สำหรับ PDF ไม่สำเร็จ")
  const bytes = new Uint8Array(await res.arrayBuffer())
  let bin = ""
  const CHUNK = 0x8000
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
  }
  fontBase64Cache = btoa(bin)
  return fontBase64Cache
}

function hexToRgb(hex: string): RGB {
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
export async function buildReportPdf(
  data: ReportData,
  fontB64: string,
  logoDataUrl?: string | null
) {
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

  const M = 14                                  // ขอบกระดาษ (mm) เท่ากับ .sheet
  const W = doc.internal.pageSize.getWidth()
  const H = doc.internal.pageSize.getHeight()
  const CW = W - M * 2                          // ความกว้างเนื้อหา
  let y = 16

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY

  /** ขึ้นหน้าใหม่ถ้าที่เหลือไม่พอ */
  function ensure(space: number) {
    if (y + space > H - 18) {
      doc.addPage()
      y = 16
    }
  }

  /** หัวข้อใหญ่ + แถบเขียวด้านหน้า (.h2) */
  function sectionTitle(text: string) {
    ensure(14)
    doc.setFillColor(...BRAND)
    doc.rect(M, y - 3.4, 1.4, 5.2, "F")
    doc.setFontSize(11.5)
    doc.setTextColor(...BRAND)
    doc.text(text, M + 4, y)
    y += 6
  }

  const tableBase = {
    styles: {
      font: FONT_NAME, fontSize: 9, cellPadding: { top: 1.8, right: 3, bottom: 1.8, left: 3 },
      textColor: INK, lineColor: LINE, lineWidth: 0.2,
    },
    headStyles: {
      font: FONT_NAME, fillColor: TINT, textColor: BRAND, fontSize: 8.5,
      lineColor: TINT_BORDER, lineWidth: 0.2,
    },
    margin: { left: M, right: M },
    theme: "grid" as const,
  }

  // ---------------------------------------------------------------- หัวรายงาน
  const LOGO_W = 13
  const textX = logoDataUrl ? M + LOGO_W + 4 : M
  if (logoDataUrl) {
    try {
      // สัดส่วนเดิมของโลโก้ 300x333.3
      doc.addImage(logoDataUrl, "JPEG", M, y - 5.5, LOGO_W, LOGO_W * (333.3 / 300))
    } catch {
      /* ฝังโลโก้ไม่ได้ก็ออกรายงานต่อโดยไม่มีโลโก้ */
    }
  }
  doc.setFontSize(15)
  doc.setTextColor(...BRAND)
  doc.text("ผลวิเคราะห์ดินและคำแนะนำการใช้ปุ๋ย", textX, y)
  y += 5
  doc.setFontSize(8.5)
  doc.setTextColor(...MUTED)
  doc.text("DOA-Soil Test Kit · กรมวิชาการเกษตร", textX, y)
  y += 4.5
  doc.setDrawColor(...BRAND)
  doc.setLineWidth(0.9)
  doc.line(M, y, W - M, y)
  y += 7

  // ---------------------------------------------------------------- ข้อมูลตัวอย่าง (2 คอลัมน์)
  const metaPairs: [string, string][] = [
    ["พืชที่ปลูก", data.cropName],
    ["วันที่วิเคราะห์", data.dateText],
    ["พื้นที่เก็บตัวอย่าง", data.area || "ไม่ระบุ"],
    ["วิธีได้มา", data.inputModeText],
  ]
  if (data.coords) metaPairs.push(["พิกัด", data.coords])
  if (data.ph != null) metaPairs.push(["ความเป็นกรด-ด่าง (pH)", String(data.ph)])

  const colW = (CW - 8) / 2
  doc.setFontSize(9)
  for (let i = 0; i < metaPairs.length; i += 2) {
    ensure(8)
    for (let c = 0; c < 2; c++) {
      const pair = metaPairs[i + c]
      if (!pair) continue
      const x = M + c * (colW + 8)
      doc.setTextColor(...MUTED)
      doc.text(pair[0], x, y)
      doc.setTextColor(...INK)
      doc.text(pair[1], x + colW, y, { align: "right" })
      doc.setDrawColor(...LINE)
      doc.setLineWidth(0.15)
      doc.line(x, y + 1.6, x + colW, y + 1.6)
    }
    y += 6
  }
  y += 3

  // ---------------------------------------------------------------- ระดับธาตุอาหาร (มีแถบสี)
  sectionTitle("ระดับธาตุอาหารในดิน")
  for (const n of data.nutrients) {
    ensure(11)
    doc.setFontSize(9)
    doc.setTextColor(55, 65, 81)
    doc.text(n.label, M, y)

    const valTxt = n.value != null ? `${n.value} ${n.unit}` : "–"
    const lvTxt = n.levelText ? ` (${n.levelText})` : ""
    const lvW = lvTxt ? doc.getTextWidth(lvTxt) : 0
    doc.setTextColor(...INK)
    doc.text(valTxt, W - M - lvW, y, { align: "right" })
    if (lvTxt && n.levelColor) {
      doc.setTextColor(...hexToRgb(n.levelColor))
      doc.text(lvTxt, W - M, y, { align: "right" })
    }

    // แถบพื้น + แถบสีตามระดับ
    const barY = y + 1.6
    doc.setFillColor(...BAR_BG)
    doc.roundedRect(M, barY, CW, 2.2, 1.1, 1.1, "F")
    if (n.levelPct != null && n.levelColor) {
      doc.setFillColor(...hexToRgb(n.levelColor))
      doc.roundedRect(M, barY, (CW * n.levelPct) / 100, 2.2, 1.1, 1.1, "F")
    }
    y += 8
  }
  y += 2

  // ---------------------------------------------------------------- การ์ด N-P-K
  if (data.target) {
    sectionTitle("ปริมาณธาตุอาหารที่พืชต้องการ")
    ensure(24)
    const cards: [string, number | null][] = [
      ["N (ไนโตรเจน)", data.target.n],
      ["P₂O₅ (ฟอสฟอรัส)", data.target.p2o5],
      ["K₂O (โพแทสเซียม)", data.target.k2o],
    ]
    const gap = 4
    const cw = (CW - gap * 2) / 3
    const ch = 17
    cards.forEach(([label, v], i) => {
      const x = M + i * (cw + gap)
      doc.setFillColor(...TINT)
      doc.setDrawColor(...TINT_BORDER)
      doc.setLineWidth(0.2)
      doc.roundedRect(x, y, cw, ch, 2, 2, "FD")
      doc.setFontSize(7.5)
      doc.setTextColor(...MUTED)
      doc.text(label, x + cw / 2, y + 5.5, { align: "center" })
      doc.setFontSize(15)
      doc.setTextColor(...BRAND)
      doc.text(v != null ? String(v) : "–", x + cw / 2, y + 13, { align: "center" })
    })
    y += ch + 4
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTED)
    doc.text(`หน่วย: ${data.target.unit}`, W / 2, y, { align: "center" })
    y += 6
  }

  // ---------------------------------------------------------------- แผนตามระยะ
  if (data.plans.length > 0) {
    sectionTitle("แผนการใส่ปุ๋ยตามระยะการเจริญเติบโต")
    for (const plan of data.plans) {
      ensure(18)
      doc.setFontSize(9.5)
      doc.setTextColor(55, 65, 81)
      doc.text(plan.title, M, y)
      y += 3

      // รวมชื่อระยะที่ซ้ำกันให้แสดงครั้งเดียว (เหมือน rowSpan บนหน้าจอ)
      let prevStage = ""
      const body = plan.rows.map((r) => {
        const cell = r.stage === prevStage ? "" : r.stage
        prevStage = r.stage
        return [cell, r.grade, r.amount.toLocaleString()]
      })

      autoTable(doc, {
        ...tableBase,
        startY: y,
        head: [["ระยะ", "สูตรปุ๋ย", `ปริมาณ (${plan.unit})`]],
        body,
        columnStyles: {
          0: { cellWidth: CW * 0.34, fillColor: STAGE_BG },
          2: { halign: "right" },
        },
      })
      y = lastY() + 5
    }
  }

  // ---------------------------------------------------------------- ปริมาณปุ๋ยที่ต้องใช้
  if (data.blend) {
    sectionTitle("ปริมาณปุ๋ยที่ต้องใช้ (จากสูตรที่เลือก)")
    autoTable(doc, {
      ...tableBase,
      startY: y,
      head: [["สูตรปุ๋ย", `ปริมาณ (${data.blend.unitText})`]],
      body: data.blend.rows.map((r) => [r.name, Math.ceil(r.amount).toLocaleString()]),
      columnStyles: { 1: { halign: "right", cellWidth: CW * 0.3 } },
    })
    y = lastY() + 6
  }

  // ---------------------------------------------------------------- กล่องหมายเหตุ
  if (data.note && data.note.lines.length > 0) {
    doc.setFontSize(8.5)
    const wrapped = data.note.lines.map((l) => doc.splitTextToSize(l, CW - 8) as string[])
    const bodyH = wrapped.reduce((s, w) => s + w.length * 4 + 1.5, 0)
    const boxH = bodyH + (data.note.source ? 6 : 0) + 11
    ensure(boxH + 4)

    doc.setFillColor(...NOTE_BG)
    doc.setDrawColor(...NOTE_BORDER)
    doc.setLineWidth(0.2)
    doc.roundedRect(M, y, CW, boxH, 2, 2, "FD")

    let ty = y + 6
    doc.setFontSize(9.5)
    doc.setTextColor(...NOTE_INK)
    doc.text("หมายเหตุ", M + 4, ty)
    ty += 5
    doc.setFontSize(8.5)
    for (const w of wrapped) {
      doc.text(w, M + 4, ty)
      ty += w.length * 4 + 1.5
    }
    if (data.note.source) {
      doc.setFontSize(7.5)
      doc.setTextColor(150, 125, 80)
      doc.text(`ที่มา: ${data.note.source}`, M + 4, ty + 1)
    }
    y += boxH + 4
  }

  // ---------------------------------------------------------------- ท้ายทุกหน้า
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.15)
    doc.line(M, H - 12, W - M, H - 12)
    doc.setFontSize(7.5)
    doc.setTextColor(...MUTED)
    doc.text(`ออกรายงานเมื่อ ${data.dateText}`, M, H - 8)
    doc.text(`DOA-Soil Test Kit · หน้า ${i}/${pages}`, W - M, H - 8, { align: "right" })
  }

  return doc
}

let logoCache: string | null | undefined

/** โหลดโลโก้เป็น data URL — โหลดไม่ได้ก็ออกรายงานต่อโดยไม่มีโลโก้ */
async function loadLogoDataUrl(): Promise<string | null> {
  if (logoCache !== undefined) return logoCache
  try {
    const res = await fetch(LOGO_URL)
    if (!res.ok) throw new Error("not found")
    const bytes = new Uint8Array(await res.arrayBuffer())
    let bin = ""
    const CHUNK = 0x8000
    for (let i = 0; i < bytes.length; i += CHUNK) {
      bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK))
    }
    logoCache = `data:image/jpeg;base64,${btoa(bin)}`
  } catch {
    logoCache = null
  }
  return logoCache
}

/** สร้างและดาวน์โหลดไฟล์ PDF (ฝั่งเบราว์เซอร์) */
export async function downloadReportPdf(data: ReportData, filename: string) {
  const [fontB64, logo] = await Promise.all([loadFontBase64(), loadLogoDataUrl()])
  const doc = await buildReportPdf(data, fontB64, logo)
  doc.save(filename)
}
