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
  nImage?: string // base64 or URL for N color chart crop
  pImage?: string // base64 or URL for P color chart crop
  kImage?: string // base64 or URL for K color chart crop
}

export type NPKLevel = "low" | "medium" | "high"
