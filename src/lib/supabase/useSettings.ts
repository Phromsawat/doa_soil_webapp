"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const SHOW_SOIL_MAP = "show_soil_map"

/**
 * ธงเปิด/ปิดเมนูแผนที่ดิน (ตั้งค่าจาก /admin/settings)
 *
 * เดิมหน้านี้ poll ทุก 3 วินาทีตลอดเวลา = 20 คำขอ/นาที ต่อแท็บที่เปิดค้างไว้
 * ทั้งที่มี realtime subscription อยู่แล้ว จึงตัด poll ทิ้ง แล้วใช้ 3 ทางนี้แทน:
 *   1) อ่านครั้งแรกตอน mount
 *   2) realtime — ถ้า table เปิด replication ไว้ จะเห็นผลทันทีที่แอดมินกดสลับ
 *   3) อ่านซ้ำตอนผู้ใช้กลับมาที่แท็บ — กันกรณี realtime ใช้ไม่ได้ ให้ค่าอัปเดตเองรอบหน้าที่เปิดดู
 */
export function useShowSoilMap(): boolean {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false

    const fetchFlag = async () => {
      try {
        const { data } = await supabase
          .from("app_settings")
          .select("value")
          .eq("key", SHOW_SOIL_MAP)
          .maybeSingle()
        if (!cancelled) setShow(data?.value === true)
      } catch {
        /* เงียบไว้ — ถ้าอ่านไม่ได้ถือว่าซ่อน */
      }
    }

    fetchFlag()

    const onVisible = () => {
      if (document.visibilityState === "visible") fetchFlag()
    }
    document.addEventListener("visibilitychange", onVisible)

    const channel = supabase
      .channel("app_settings_soil_map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: `key=eq.${SHOW_SOIL_MAP}` },
        (payload) => setShow((payload.new as { value?: boolean })?.value === true)
      )
      .subscribe()

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", onVisible)
      supabase.removeChannel(channel)
    }
  }, [])

  return show
}
