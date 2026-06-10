"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapPin, Navigation, Check, X, Plus, Minus, Compass } from "lucide-react"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

interface Props {
  onConfirm: (lat: number, lng: number) => void
  onCancel: () => void
}

export default function MapPicker({ onConfirm, onCancel }: Props) {
  const mapRef = useRef<L.Map | null>(null)
  const markerRef = useRef<L.Marker | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [pinned, setPinned] = useState<{ lat: number; lng: number } | null>(null)
  const [locating, setLocating] = useState(false)
  const [bearing, setBearing] = useState(0)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [13.736717, 100.523186],
      zoom: 6,
      zoomControl: false,
    })

    L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
      attribution: "© OpenStreetMap contributors © CARTO",
      maxZoom: 19,
      subdomains: "abcd",
    }).addTo(map)

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      setPinned({ lat, lng })
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng]).addTo(map)
      }
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
    }
  }, [])

  // Track device compass bearing
  useEffect(() => {
    function handleOrientation(e: DeviceOrientationEvent) {
      const alpha = (e as any).webkitCompassHeading ?? e.alpha
      if (alpha != null) setBearing(Math.round(alpha))
    }
    window.addEventListener("deviceorientationevent" in window ? "deviceorientationabsolute" : "deviceorientation", handleOrientation as EventListener, true)
    return () => window.removeEventListener("deviceorientationabsolute", handleOrientation as EventListener, true)
  }, [])

  function goToMyLocation() {
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        mapRef.current?.setView([latitude, longitude], 15)
        setPinned({ lat: latitude, lng: longitude })
        if (markerRef.current) {
          markerRef.current.setLatLng([latitude, longitude])
        } else if (mapRef.current) {
          markerRef.current = L.marker([latitude, longitude]).addTo(mapRef.current)
        }
        setLocating(false)
      },
      () => setLocating(false),
      { enableHighAccuracy: true }
    )
  }

  function resetNorth() {
    setBearing(0)
  }

  const btnBase = "w-10 h-10 bg-white shadow-md rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors border border-gray-100"

  return (
    <div className="flex flex-col h-[calc(100dvh-64px)] font-thai relative">
      {/* Map */}
      <div ref={containerRef} className="flex-1 w-full" />

      {/* North indicator */}
      <div className="absolute left-3 top-3 z-[1000] w-10 h-10 bg-white/90 shadow-md border border-gray-100 rounded-full flex flex-col items-center justify-center pointer-events-none gap-0">
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
          <polygon points="10,2 12.5,10 10,8.5 7.5,10" fill="#E53E3E"/>
          <polygon points="10,18 12.5,10 10,11.5 7.5,10" fill="#CBD5E0"/>
        </svg>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#E53E3E", lineHeight: 1, marginTop: -2 }}>N</span>
      </div>

      {/* Right-center map controls */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-3 items-center">
        {/* Zoom pill */}
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

        {/* My location */}
        <button
          onClick={goToMyLocation}
          disabled={locating}
          aria-label="ตำแหน่งของฉัน"
          className="w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <Navigation className={`w-5 h-5 ${locating ? "animate-pulse text-[#1A4D2E]" : ""}`} />
        </button>

      </div>

      {/* Info bar */}
      <div className="bg-white border-t border-gray-100 px-4 py-3 shadow-lg z-[1000] flex items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          {pinned ? (
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <MapPin className="w-4 h-4 text-[#1A4D2E] shrink-0" />
              <span className="font-medium truncate">
                {pinned.lat.toFixed(6)}, {pinned.lng.toFixed(6)}
              </span>
            </div>
          ) : (
            <p className="text-sm text-gray-400">แตะบนแผนที่เพื่อปักหมุดพิกัด</p>
          )}
        </div>

        <div className="flex gap-2 shrink-0">
          <button
            onClick={onCancel}
            className="flex items-center justify-center gap-1.5 h-9 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm font-medium transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            ยกเลิก
          </button>

          <button
            onClick={() => pinned && onConfirm(pinned.lat, pinned.lng)}
            disabled={!pinned}
            className="flex items-center justify-center gap-1.5 h-9 px-4 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            ยืนยันพิกัด
          </button>
        </div>
      </div>
    </div>
  )
}
