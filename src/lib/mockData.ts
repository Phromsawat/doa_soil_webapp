import { SoilAnalysis } from "@/types"

export const mockAnalyses: SoilAnalysis[] = [
  {
    id: "1",
    date: "2567-01-15",
    crop: "ข้าว",
    province: "นครราชสีมา",
    nitrogen: 45,
    phosphorus: 12,
    potassium: 80,
    ph: 6.2,
    organicMatter: 2.1,
    status: "completed",
    recommendation: "ใส่ปุ๋ยไนโตรเจนเพิ่ม 20 กก./ไร่"
  },
  {
    id: "2",
    date: "2567-01-20",
    crop: "ข้าวโพด",
    province: "เชียงใหม่",
    nitrogen: 30,
    phosphorus: 25,
    potassium: 60,
    ph: 5.8,
    organicMatter: 1.8,
    status: "pending",
    recommendation: ""
  }
]

export const crops = ["ข้าว", "ข้าวโพด", "อ้อย", "มันสำปะหลัง", "ผัก", "ยางพารา"]
