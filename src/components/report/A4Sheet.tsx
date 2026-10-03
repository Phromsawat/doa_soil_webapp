"use client"

import { useLayoutEffect, useRef, useState } from "react"

/**
 * แผ่นรายงานขนาด A4 (210×297 มม.) ตายตัว — ไฟล์ PDF ถ่ายจากแผ่นนี้ จึงหน้าตาเหมือนบนจอทุกอย่าง
 *
 * - เนื้อหายาวเกินหนึ่งหน้า -> ย่อทั้งแผ่นลงให้พอดี A4 หน้าเดียว (ย่อเฉพาะเท่าที่จำเป็น)
 * - จอแคบกว่า A4 (มือถือ) -> ย่อการแสดงผลทั้งแผ่นเหมือนดูไฟล์ PDF แต่เลย์เอาต์ยังเป็น A4
 *   การย่อนี้อยู่บนกรอบรอบนอก ไม่ติดไปกับแผ่นตอนถ่ายเป็น PDF
 */
export default function A4Sheet({ id, children }: { id?: string; children: React.ReactNode }) {
  const frameRef = useRef<HTMLDivElement>(null)
  const sheetRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(1)
  const [view, setView] = useState({ scale: 1, height: 0 })

  // ย่อเนื้อหาให้พอดีหนึ่งหน้า — ย่อแล้วเนื้อหากว้างขึ้น (บรรทัดตัดน้อยลง) ความสูงจึงเปลี่ยนตามอัตราย่อ
  // คิดสูตรตรง ๆ ไม่ได้ จึงค้นแบบแบ่งครึ่งหาอัตราย่อที่มากที่สุดที่ยังพอดีหน้า (ตัวอักษรใหญ่ที่สุดที่ทำได้)
  useLayoutEffect(() => {
    const sheet = sheetRef.current
    const content = contentRef.current
    if (!sheet || !content) return
    const cs = getComputedStyle(sheet)
    const avail = sheet.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
    const fits = (f: number) => {
      content.style.width = `${100 / f}%`
      return content.scrollHeight * f <= avail + 0.5
    }
    let f = 1
    if (!fits(1)) {
      let lo = 0.3 // เล็กสุดที่ยอม — เนื้อหายาวกว่านี้คงล้น แต่ไม่เกิดกับรายงานหน้าเดียว
      let hi = 1
      for (let i = 0; i < 10; i++) {
        const mid = (lo + hi) / 2
        if (fits(mid)) lo = mid
        else hi = mid
      }
      f = lo
    }
    content.style.width = `${100 / f}%`
    setFit(f)
  }, [children])

  // ย่อการแสดงผลบนจอแคบ (กรอบนอกเท่านั้น)
  useLayoutEffect(() => {
    const frame = frameRef.current
    const sheet = sheetRef.current
    if (!frame || !sheet) return
    const update = () => {
      const scale = Math.min(1, frame.clientWidth / sheet.offsetWidth)
      setView({ scale, height: sheet.offsetHeight * scale })
    }
    update()
    const ro = new ResizeObserver(update)
    ro.observe(frame)
    return () => ro.disconnect()
  }, [])

  return (
    <div ref={frameRef} className="sheet-frame" style={{ height: view.height || undefined }}>
      <div
        className="sheet-scaler"
        style={{ transform: `scale(${view.scale})`, transformOrigin: "top left" }}
      >
        <div id={id} ref={sheetRef} className="sheet">
          <div
            ref={contentRef}
            className="sheet-content"
            style={{ transform: fit < 1 ? `scale(${fit})` : undefined, width: `${100 / fit}%` }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}
