"use server"

import { createClient, createAdminClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"

export interface MapPinRow {
  id: string
  lat: number
  lng: number
  name: string
  sampleId: string | null
  om: number | null
  phosphorus: number | null
  potassium: number | null
  createdAt: string
  isOwn?: boolean
}

export async function saveMapPin(data: {
  lat: number
  lng: number
  name: string
  sampleId?: string
  om?: number | null
  phosphorus?: number | null
  potassium?: number | null
}): Promise<MapPinRow> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Not authenticated")

  const notes = data.sampleId
    ? `${data.name}|||${data.sampleId}`
    : data.name

  const { data: row, error } = await supabase
    .from("analyses")
    .insert({
      user_id: user.id,
      input_mode: "map_pin",
      status: "completed",
      latitude: data.lat,
      longitude: data.lng,
      notes,
      om_value: data.om ?? null,
      p_value: data.phosphorus ?? null,
      k_value: data.potassium ?? null,
    })
    .select("id, latitude, longitude, notes, om_value, p_value, k_value, created_at")
    .single()

  if (error) throw new Error(error.message)

  revalidatePath("/history")

  return parseRow(row, true)
}

export async function fetchMapPins(): Promise<MapPinRow[]> {
  const adminClient = createAdminClient()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data, error } = await adminClient
    .from("analyses")
    .select("id, latitude, longitude, notes, om_value, p_value, k_value, created_at, user_id")
    .not("latitude", "is", null)
    .not("longitude", "is", null)
    .order("created_at", { ascending: false })

  if (error) return []
  return (data ?? []).map(row => parseRow(row, row.user_id === user?.id))
}

function parseRow(row: {
  id: string
  latitude: number | null
  longitude: number | null
  notes: string | null
  om_value: number | null
  p_value: number | null
  k_value: number | null
  created_at: string
}, isOwn = false): MapPinRow {
  const parts = row.notes?.split("|||") ?? []
  return {
    id: row.id,
    lat: row.latitude!,
    lng: row.longitude!,
    name: parts[0] ?? "ไม่ระบุชื่อ",
    sampleId: parts[1] ?? null,
    om: row.om_value,
    phosphorus: row.p_value,
    potassium: row.k_value,
    createdAt: row.created_at,
    isOwn,
  }
}
