export interface SoilAnalysis {
  id: string
  date: string
  crop: string
  province: string
  nitrogen: number // in mg/kg or ppm
  phosphorus: number // in mg/kg or ppm
  potassium: number // in mg/kg or ppm
  ph: number
  organicMatter: number // percentage
  status: "completed" | "pending"
  recommendation: string
}

export type NPKLevel = "low" | "medium" | "high"
