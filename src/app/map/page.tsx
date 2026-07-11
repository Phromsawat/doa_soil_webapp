"use client"

import dynamic from "next/dynamic"

const SoilMaps = dynamic(() => import("./SoilMaps"), { ssr: false })

export default function MapPage() {
  return <SoilMaps />
}
