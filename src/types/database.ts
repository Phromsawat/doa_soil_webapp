// =============================================================================
// Database types — mirrors supabase/migrations/001_initial_schema.sql
// Regenerate later with: supabase gen types typescript --project-id <ref>
// =============================================================================

export type UserRole = "user" | "admin"
export type CropTypeUnit = "per_tree" | "per_rai"
export type RecommendationMode = "100%" | "70%"
export type TargetUnit = "g/tree/year" | "kg/rai"
export type InputMode = "image_upload" | "manual_form"
export type AnalysisStatus = "pending" | "completed" | "failed"
export type NutrientCode = "OM" | "P" | "K"

// -----------------------------------------------------------------------------
// PROFILES
// -----------------------------------------------------------------------------
export interface Profile {
  id: string
  phone: string | null
  email: string | null
  full_name: string | null
  nickname: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// CROP TYPES
// -----------------------------------------------------------------------------
export interface CropType {
  id: string
  name: string                // 'ไม้ผล', 'พืชไร่', 'พืชผัก', 'ข้าว'
  name_en: string | null
  unit_basis: CropTypeUnit
  order_by: number
  is_active: boolean
  created_at: string
}

// -----------------------------------------------------------------------------
// CROPS
// -----------------------------------------------------------------------------
export interface Crop {
  id: string
  name: string                // 'ทุเรียน', 'ข้าวโพดเลี้ยงสัตว์', ...
  name_en: string | null
  crop_type_id: string
  description: string | null
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// NUTRIENTS (lookup)
// -----------------------------------------------------------------------------
export interface Nutrient {
  code: NutrientCode
  name_th: string
  name_en: string | null
  unit: string                // '%' for OM, 'mg/kg' for P, K
  description: string | null
  order_by: number
}

// -----------------------------------------------------------------------------
// FERTILIZER RECOMMENDATIONS
// -----------------------------------------------------------------------------
export interface FertilizerRecommendation {
  id: string
  crop_id: string
  mode: RecommendationMode
  // Ranges (NULL = ignore that nutrient)
  om_min: number | null
  om_max: number | null
  p_min: number | null
  p_max: number | null
  k_min: number | null
  k_max: number | null
  // Targets
  target_n: number | null
  target_p2o5: number | null
  target_k2o: number | null
  target_unit: TargetUnit
  notes: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// FERTILIZER APPLICATIONS — concrete application rounds (พืชไร่ only)
// -----------------------------------------------------------------------------
export interface FertilizerApplication {
  id: string
  recommendation_id: string
  round_number: number             // 1, 2, 3, ...
  stage_name: string | null        // 'รองพื้น', 'แต่งหน้า', ...
  formula: string                  // '46-0-0', '18-46-0', ...
  amount: number
  unit: string                     // 'kg/rai'
  order_by: number
  created_at: string
}

// -----------------------------------------------------------------------------
// ANALYSES — user soil-analysis history
// -----------------------------------------------------------------------------
export interface Analysis {
  id: string
  user_id: string
  crop_id: string | null
  input_mode: InputMode
  status: AnalysisStatus
  om_value: number | null
  p_value: number | null
  k_value: number | null
  ph_value: number | null
  province: string | null
  amphur: string | null
  district: string | null
  latitude: number | null
  longitude: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// -----------------------------------------------------------------------------
// ANALYSIS IMAGES
// -----------------------------------------------------------------------------
export interface AnalysisImage {
  id: string
  analysis_id: string
  nutrient_code: NutrientCode
  storage_path: string             // /{user_id}/{analysis_id}/om.jpg
  public_url: string | null
  file_size_bytes: number | null
  width: number | null
  height: number | null
  created_at: string
}

// -----------------------------------------------------------------------------
// ANALYSIS RESULTS — fertilizer plan for each analysis
// -----------------------------------------------------------------------------
export interface FertilizerPlanRound {
  round_number: number
  stage_name: string | null
  items: Array<{
    formula: string
    amount: number
    unit: string
  }>
}

export interface AnalysisResult {
  id: string
  analysis_id: string
  recommendation_id: string | null
  recommended_n: number | null
  recommended_p2o5: number | null
  recommended_k2o: number | null
  unit: string | null
  fertilizer_plan: FertilizerPlanRound[] | null
  created_at: string
}

// -----------------------------------------------------------------------------
// Insert / Update helpers (omit auto-generated fields)
// -----------------------------------------------------------------------------
export type ProfileInsert = Omit<Profile, "created_at" | "updated_at">
export type ProfileUpdate = Partial<Omit<Profile, "id" | "created_at" | "updated_at">>

export type CropInsert = Omit<Crop, "id" | "created_at" | "updated_at">
export type CropUpdate = Partial<CropInsert>

export type FertilizerRecommendationInsert = Omit<FertilizerRecommendation, "id" | "created_at" | "updated_at">
export type FertilizerRecommendationUpdate = Partial<FertilizerRecommendationInsert>

export type AnalysisInsert = Omit<Analysis, "id" | "created_at" | "updated_at" | "status"> & {
  status?: AnalysisStatus
}
export type AnalysisUpdate = Partial<Omit<Analysis, "id" | "user_id" | "created_at" | "updated_at">>

export type AnalysisImageInsert = Omit<AnalysisImage, "id" | "created_at">
export type AnalysisResultInsert = Omit<AnalysisResult, "id" | "created_at">
