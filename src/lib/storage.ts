import { SoilAnalysis } from "@/types"
import { mockAnalyses } from "./mockData"

const STORAGE_KEY = "doa_soil_analyses"

// Helper to check if window is defined (client-side)
const isClient = () => typeof window !== "undefined"

export function getAnalyses(): SoilAnalysis[] {
  if (!isClient()) return mockAnalyses

  const stored = localStorage.getItem(STORAGE_KEY)
  if (!stored) {
    // Initialize with mock data if empty
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mockAnalyses))
    return mockAnalyses
  }

  try {
    return JSON.parse(stored)
  } catch (error) {
    console.error("Failed to parse soil analyses from storage", error)
    return mockAnalyses
  }
}

export function getAnalysisById(id: string): SoilAnalysis | undefined {
  const list = getAnalyses()
  return list.find((item) => item.id === id)
}

export function addAnalysis(analysis: Omit<SoilAnalysis, "id" | "date" | "status" | "recommendation"> & { status?: "completed" | "pending" }): SoilAnalysis {
  const list = getAnalyses()
  
  // Calculate agricultural fertilizer recommendations in Thai
  const recs: string[] = []
  const { nitrogen: n, phosphorus: p, potassium: k, ph, organicMatter: om, crop } = analysis
  
  if (n < 35) {
    recs.push(`[ไนโตรเจน (N) ต่ำ] ควรใส่ปุ๋ยไนโตรเจน เช่น ยูเรีย (สูตร 46-0-0) หรือ แอมโมเนียมซัลเฟต (สูตร 21-0-0) อัตรา 15-20 กิโลกรัมต่อไร่ เพื่อเร่งใบและลำต้นของ${crop}`)
  }
  if (p < 15) {
    recs.push(`[ฟอสฟอรัส (P) ต่ำ] ควรใส่ปุ๋ยดับเบิลซุปเปอร์ฟอสเฟต (สูตร 0-46-0) หรือใช้สูตรปุ๋ยเร่งราก อัตรา 10-15 กิโลกรัมต่อไร่ เพื่อกระตุ้นโครงสร้างรากฝอยและออกรวง`)
  }
  if (k < 50) {
    recs.push(`[โพแทสเซียม (K) ต่ำ] แนะนำให้ใส่ปุ๋ยโพแทสเซียมคลอไรด์ (สูตร 0-0-60) อัตรา 15 กิโลกรัมต่อไร่ เพื่อส่งเสริมการสะสมแป้ง เพิ่มน้ำหนักเมล็ดผลผลิต`)
  }
  
  if (ph < 5.5) {
    recs.push(`[ค่าความเป็นกรด-ด่าง (pH) ต่ำ] ดินมีความเป็นกรดจัด แนะนำให้สาดปูนขาวหรือปูนโดโลไมท์อัตรา 100-200 กก./ไร่ ก่อนไถกลบหน้าดิน 2 สัปดาห์`)
  } else if (ph > 7.0) {
    recs.push(`[ค่าความเป็นกรด-ด่าง (pH) สูง] ดินเป็นด่าง หลีกเลี่ยงปูนขาว ให้เน้นเสริมด้วยการหว่านอินทรียวัตถุบำรุงดิน`)
  }

  if (om < 1.5) {
    recs.push(`[อินทรียวัตถุ (OM) ต่ำ] ดินขาดธาตุอินทรีย์บำรุง แนะนำให้ปรับสภาพหน้าดินโดยการใส่ปุ๋ยหมัก ปุ๋ยคอก หรือไถกลบตอซังฟางแทนการเผาทำลาย`)
  }

  if (recs.length === 0) {
    recs.push("ดินของท่านมีความสมบูรณ์ในเกณฑ์ดีเลิศเป็นพิเศษ แนะนำบำรุงรักษาสภาพดินโดยการทำเกษตรอินทรีย์หรือใส่ปุ๋ยบำรุงตามฤดูกาลปกติ")
  }

  const currentDate = new Date()
  const year = currentDate.getFullYear() + 543 // Thai Buddhist Era year
  const month = String(currentDate.getMonth() + 1).padStart(2, "0")
  const day = String(currentDate.getDate()).padStart(2, "0")
  const dateStr = `${year}-${month}-${day}`

  const newAnalysis: SoilAnalysis = {
    ...analysis,
    id: String(Date.now()),
    date: dateStr,
    status: analysis.status || "completed",
    recommendation: recs.join("\n\n")
  }

  if (isClient()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([newAnalysis, ...list]))
  }

  return newAnalysis
}

export function clearStorage(): void {
  if (isClient()) {
    localStorage.removeItem(STORAGE_KEY)
  }
}
