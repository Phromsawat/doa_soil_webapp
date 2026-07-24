"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

const SHOW_SOIL_MAP = "show_soil_map"
const POLL_MS = 3000

export function useShowSoilMap(): boolean {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const fetch = () =>
      supabase
        .from("app_settings")
        .select("value")
        .eq("key", SHOW_SOIL_MAP)
        .maybeSingle()
        .then(({ data }) => setShow(data?.value === true))
        .catch(() => {})

    fetch()
    const timer = setInterval(fetch, POLL_MS)

    // Realtime bonus — ถ้า table เปิด replication ไว้ จะ update เร็วกว่า poll
    const channel = supabase
      .channel("app_settings_soil_map")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "app_settings", filter: `key=eq.${SHOW_SOIL_MAP}` },
        (payload) => setShow((payload.new as { value?: boolean })?.value === true)
      )
      .subscribe()

    return () => {
      clearInterval(timer)
      supabase.removeChannel(channel)
    }
  }, [])

  return show
}
