"use client"

import dynamic from "next/dynamic"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

const MapPicker = dynamic(() => import("./MapPicker"), { ssr: false })

function MapPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("returnTo") || "/analyze/upload"

  function handleConfirm(lat: number, lng: number) {
    sessionStorage.setItem("picked_lat", String(lat))
    sessionStorage.setItem("picked_lng", String(lng))
    router.push(returnTo)
  }

  function handleCancel() {
    router.push(returnTo)
  }

  return <MapPicker onConfirm={handleConfirm} onCancel={handleCancel} />
}

export default function MapPage() {
  return (
    <Suspense>
      <MapPageInner />
    </Suspense>
  )
}
