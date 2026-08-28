"use client"

// readSheet.ts — อ่านไฟล์ .xlsx / .csv ให้เป็นตาราง string[][] โดย "ไม่พึ่งไลบรารีภายนอก"
//
// ทำไมไม่ใช้ SheetJS: เวอร์ชันบน npm ค้างที่ 0.18.5 (2022) และมีช่องโหว่ที่แก้เฉพาะ
// บน CDN ของผู้พัฒนาเอง ไม่ใช่ของที่ควรใส่ในระบบของหน่วยงานรัฐ อีกทั้งหนัก ~400 KB
// ขณะที่เราต้องอ่านแค่ตารางสี่เหลี่ยมตามเทมเพลตที่เรากำหนดเอง จึงเขียนเองคุ้มกว่า
//
// .xlsx = ไฟล์ ZIP ที่ข้างในเป็น XML — ใช้ DecompressionStream('deflate-raw') ของเบราว์เซอร์
// คลายบีบอัดได้เลย ไม่ต้องมี zip library

/** แถวของชีต (แถวแรกคือหัวตาราง) */
export type SheetRows = string[][]

// ---------------------------------------------------------------- CSV

/**
 * Excel ภาษาไทยเวลา Save as CSV มักได้ CP874 (windows-874) ไม่ใช่ UTF-8
 * ถ้าถอดเป็น UTF-8 แล้วเจอตัวแทนที่ (U+FFFD) แปลว่าเดาผิด ให้ถอยไปใช้ windows-874
 */
function decodeText(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  // BOM ของ UTF-8 -> มั่นใจได้เลยว่าเป็น UTF-8
  if (bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) {
    return new TextDecoder("utf-8").decode(bytes.subarray(3))
  }
  const utf8 = new TextDecoder("utf-8", { fatal: false }).decode(bytes)
  if (!utf8.includes("�")) return utf8
  try {
    return new TextDecoder("windows-874").decode(bytes)
  } catch {
    return utf8
  }
}

/** แยก CSV ให้รองรับเครื่องหมายคำพูดและลูกน้ำในเซลล์ */
function parseCsv(text: string): SheetRows {
  const rows: SheetRows = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++ } else quoted = false
      } else cell += ch
      continue
    }
    if (ch === '"') { quoted = true; continue }
    if (ch === ",") { row.push(cell); cell = ""; continue }
    if (ch === "\r") continue
    if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; continue }
    cell += ch
  }
  if (cell !== "" || row.length > 0) { row.push(cell); rows.push(row) }
  return rows
}

// ---------------------------------------------------------------- XLSX

interface ZipEntry {
  name: string
  offset: number
  method: number
  /** ขนาดข้อมูลที่ยังบีบอัดอยู่ — ตัวที่ใช้ตัดไบต์จริง (คนละตัวกับขนาดหลังคลาย) */
  compressedSize: number
}

/** อ่านสารบัญกลางของ ZIP (End of Central Directory -> Central Directory) */
function readZipIndex(buf: ArrayBuffer): ZipEntry[] {
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)

  // มองหา EOCD (0x06054b50) จากท้ายไฟล์ — comment ท้ายไฟล์ยาวได้ถึง 65535 ไบต์
  let eocd = -1
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65558); i--) {
    if (view.getUint32(i, true) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error("ไฟล์ .xlsx เสียหาย (ไม่พบสารบัญ ZIP)")

  const count = view.getUint16(eocd + 10, true)
  let p = view.getUint32(eocd + 16, true)
  const entries: ZipEntry[] = []

  for (let i = 0; i < count; i++) {
    if (view.getUint32(p, true) !== 0x02014b50) break
    const method = view.getUint16(p + 10, true)
    // +20 = compressed size, +24 = uncompressed size — ต้องใช้ตัวแรกตอนตัดไบต์
    const compressedSize = view.getUint32(p + 20, true)
    const nameLen = view.getUint16(p + 28, true)
    const extraLen = view.getUint16(p + 30, true)
    const commentLen = view.getUint16(p + 32, true)
    const offset = view.getUint32(p + 42, true)
    const name = new TextDecoder("utf-8").decode(bytes.subarray(p + 46, p + 46 + nameLen))
    entries.push({ name, offset, method, compressedSize })
    p += 46 + nameLen + extraLen + commentLen
  }
  return entries
}

async function readZipEntry(buf: ArrayBuffer, entry: ZipEntry): Promise<string> {
  const view = new DataView(buf)
  const bytes = new Uint8Array(buf)
  if (view.getUint32(entry.offset, true) !== 0x04034b50) throw new Error("ไฟล์ .xlsx เสียหาย")

  const nameLen = view.getUint16(entry.offset + 26, true)
  const extraLen = view.getUint16(entry.offset + 28, true)
  const start = entry.offset + 30 + nameLen + extraLen
  const raw = bytes.subarray(start, start + entry.compressedSize)

  if (entry.method === 0) return new TextDecoder("utf-8").decode(raw)
  if (entry.method !== 8) throw new Error("ไฟล์ .xlsx ใช้วิธีบีบอัดที่ยังไม่รองรับ")

  if (typeof DecompressionStream === "undefined") {
    throw new Error("เบราว์เซอร์นี้อ่าน .xlsx ไม่ได้ กรุณาบันทึกไฟล์เป็น .csv แล้วลองใหม่")
  }
  try {
    const stream = new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
    return new TextDecoder("utf-8").decode(await new Response(stream).arrayBuffer())
  } catch {
    // ปล่อย error ดิบของ stream ออกไปจะได้ข้อความว่า "Failed to fetch" ซึ่งไม่สื่ออะไร
    throw new Error("อ่านไฟล์ .xlsx ไม่สำเร็จ (ไฟล์อาจเสียหาย) — ลองบันทึกใหม่เป็น .xlsx หรือ .csv")
  }
}

/** "BC7" -> คอลัมน์ที่ 55 (เริ่มที่ 1) */
function columnIndex(ref: string): number {
  let n = 0
  for (const ch of ref) {
    const code = ch.charCodeAt(0)
    if (code < 65 || code > 90) break
    n = n * 26 + (code - 64)
  }
  return n
}

/**
 * ถอด XML entity ทั้งชนิดชื่อและชนิดตัวเลข
 * openpyxl (และเครื่องมืออื่นหลายตัว) เขียนภาษาไทยเป็น &#3614; ไม่ใช่ UTF-8 ดิบ
 * ถ้าไม่ถอดตรงนี้ ข้อความไทยจะออกมาเป็นโค้ดดิบทั้งแถว
 * ถอด &amp; เป็นตัวสุดท้ายเสมอ กัน "&amp;#3614;" ถูกถอดซ้ำจนเพี้ยน
 */
function decodeEntities(s: string): string {
  return s
    .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
}

/** ดึงข้อความในแท็ก <t> ทั้งหมด (สตริงที่ Excel แบ่งเป็นหลาย run จะถูกต่อกลับ) */
function textOf(xml: string): string {
  const parts = xml.match(/<t[^>]*>([\s\S]*?)<\/t>/g)
  if (!parts) return ""
  return decodeEntities(parts.map((p) => p.replace(/<t[^>]*>|<\/t>/g, "")).join(""))
}

async function parseXlsx(buf: ArrayBuffer): Promise<SheetRows> {
  const entries = readZipIndex(buf)
  const find = (name: string) => entries.find((e) => e.name === name)

  // ชีตแรกตามลำดับในไฟล์ — เทมเพลตของเรามีชีตเดียวอยู่แล้ว
  const sheetEntry =
    find("xl/worksheets/sheet1.xml") ??
    entries.filter((e) => /^xl\/worksheets\/sheet\d+\.xml$/.test(e.name))
      .sort((a, b) => a.name.localeCompare(b.name))[0]
  if (!sheetEntry) throw new Error("ไม่พบชีตในไฟล์ .xlsx")

  const sharedEntry = find("xl/sharedStrings.xml")
  const shared: string[] = []
  if (sharedEntry) {
    const xml = await readZipEntry(buf, sharedEntry)
    for (const si of xml.match(/<si>[\s\S]*?<\/si>/g) ?? []) shared.push(textOf(si))
  }

  const sheetXml = await readZipEntry(buf, sheetEntry)
  const rows: SheetRows = []

  for (const rowXml of sheetXml.match(/<row[\s\S]*?(?:\/>|<\/row>)/g) ?? []) {
    const cells: string[] = []
    for (const cellXml of rowXml.match(/<c[\s\S]*?(?:\/>|<\/c>)/g) ?? []) {
      const ref = /r="([A-Z]+)\d+"/.exec(cellXml)?.[1]
      const type = /t="([^"]+)"/.exec(cellXml)?.[1]
      const col = ref ? columnIndex(ref) : cells.length + 1

      let value = ""
      if (type === "s") {
        const idx = Number(/<v>([\s\S]*?)<\/v>/.exec(cellXml)?.[1] ?? "-1")
        value = shared[idx] ?? ""
      } else if (type === "inlineStr") {
        value = textOf(cellXml)
      } else {
        // ตัวเลขปกติ หรือ t="str" (ผลลัพธ์สูตรที่เป็นข้อความ) — ถอด entity เผื่อไว้
        value = decodeEntities(/<v>([\s\S]*?)<\/v>/.exec(cellXml)?.[1] ?? "")
      }

      while (cells.length < col - 1) cells.push("")
      cells[col - 1] = value
    }
    rows.push(cells)
  }
  return rows
}

// ---------------------------------------------------------------- ทางเข้า

/**
 * อ่านไฟล์ที่ผู้ใช้เลือก -> ตาราง แถวแรกคือหัวตาราง
 * รองรับ .xlsx และ .csv (เดา encoding ให้เองสำหรับ CSV ที่ Excel ไทยบันทึกมา)
 */
export async function readSheetFile(file: File): Promise<SheetRows> {
  const buf = await file.arrayBuffer()
  const isXlsx =
    file.name.toLowerCase().endsWith(".xlsx") ||
    new Uint8Array(buf, 0, 2).every((b, i) => b === [0x50, 0x4b][i])

  if (file.name.toLowerCase().endsWith(".xls") && !isXlsx) {
    throw new Error("ไฟล์ .xls แบบเก่ายังไม่รองรับ กรุณาบันทึกใหม่เป็น .xlsx หรือ .csv")
  }

  const rows = isXlsx ? await parseXlsx(buf) : parseCsv(decodeText(buf))
  // ตัดแถวว่างท้ายไฟล์ที่ Excel มักแถมมา
  while (rows.length > 0 && rows[rows.length - 1].every((c) => !c.trim())) rows.pop()
  return rows
}
