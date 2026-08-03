"use client"

import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Plus, Minus, Expand } from "lucide-react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"

const pinIcon = L.icon({
  iconUrl: "/img/three.svg",
  iconSize: [36, 42],
  iconAnchor: [18, 38],
})

interface Props {
  lat: number
  lng: number
}

export default function MapPreview({ lat, lng }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const router = useRouter()

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [lat, lng],
      zoom: 14,
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
    })

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors © CARTO",
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map)

    L.marker([lat, lng], { icon: pinIcon }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [lat, lng])

  const btnClass = "w-8 h-8 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50 active:bg-gray-100 transition-colors"

  return (
    <>
      <div ref={containerRef} className="absolute inset-0 w-full h-full" />

      {/* Zoom pill + expand */}
      <div className="absolute right-3 top-3 z-[1000] flex flex-col gap-2 items-center">
        <div className="bg-white shadow-md border border-gray-100 rounded-full flex flex-col items-center overflow-hidden">
          <button
            onClick={() => mapRef.current?.zoomIn()}
            aria-label="ซูมเข้า"
            className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
          <div className="w-6 h-px bg-gray-200" />
          <button
            onClick={() => mapRef.current?.zoomOut()}
            aria-label="ซูมออก"
            className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            <Minus className="w-5 h-5" />
          </button>
        </div>
        <button
          onClick={() => router.push(`/analyze/map?returnTo=/analyze/result&lat=${lat}&lng=${lng}`)}
          className="w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          aria-label="ขยายแผนที่"
        >
          <Expand className="w-5 h-5" />
        </button>
      </div>
    </>
  )
}
