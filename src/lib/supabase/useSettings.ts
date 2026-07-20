"use client"

import { useEffect, useState } from "react"
import { getShowSoilMap } from "./settings"

/**
 * อ่านค่าว่าจะโชว์แผนที่ดินไหม (สำหรับ client component เช่น navbar)
 * ค่าเริ่มต้น false = ซ่อนไว้ จนกว่าจะโหลดค่าจริงเสร็จ -> ไม่กระพริบโชว์ก่อน
 */
export function useShowSoilMap(): boolean {
  const [show, setShow] = useState(false)
  useEffect(() => {
    getShowSoilMap()
      .then(setShow)
      .catch(() => setShow(false))
  }, [])
  return show
}
