"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { MapPin, Check, X, Plus, Minus, Map } from "lucide-react"
import SearchBar from "@/app/map/SearchBar"

const BASE_MAPS = [
  { id: "google_road",      label: "Google Maps",    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", subdomains: "0123", preview: "https://mt0.google.com/vt/lyrs=m&x=24&y=14&z=5" },
  { id: "google_satellite", label: "Google Satellite", url: "https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}", subdomains: "0123", preview: "https://mt0.google.com/vt/lyrs=s&x=24&y=14&z=5" },
  { id: "bing",             label: "Bing Map",       url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", subdomains: undefined, preview: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/5/14/24" },
  { id: "osm",              label: "OpenStreetMap",  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", subdomains: "abc", preview: "https://tile.openstreetmap.org/5/24/14.png" },
] as const
type BaseMapId = typeof BASE_MAPS[number]["id"]

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:13px;height:13px;border-radius:50%;background:#1A4D2E;"></div>`,
  iconSize: [13, 13],
  iconAnchor: [6.5, 6.5],
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
  const [activeBase, setActiveBase] = useState<BaseMapId>("google_road")
  const [showBasePanel, setShowBasePanel] = useState(false)
  const tileLayerRef = useRef<L.TileLayer | null>(null)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: [13.736717, 100.523186],
      zoom: 6,
      zoomControl: false,
    })

    const bm = BASE_MAPS.find((b) => b.id === "google_road")!
    tileLayerRef.current = L.tileLayer(bm.url, {
      attribution: "© Google",
      maxZoom: 20,
      subdomains: bm.subdomains ?? "",
    }).addTo(map)

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng
      setPinned({ lat, lng })
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng])
      } else {
        markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(map)
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

  useEffect(() => {
    if (!mapRef.current || !tileLayerRef.current) return
    const bm = BASE_MAPS.find((b) => b.id === activeBase)!
    tileLayerRef.current.setUrl(bm.url)
  }, [activeBase])

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
          markerRef.current = L.marker([latitude, longitude], { icon: pinIcon }).addTo(mapRef.current)
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

      {/* Search bar — top left */}
      <SearchBar onSelect={(lat, lng) => {
        mapRef.current?.setView([lat, lng], 12)
        setPinned({ lat, lng })
        if (markerRef.current) {
          markerRef.current.setLatLng([lat, lng])
        } else if (mapRef.current) {
          markerRef.current = L.marker([lat, lng], { icon: pinIcon }).addTo(mapRef.current)
        }
      }} />

      {/* Right-center map controls */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-3 items-center">

        {/* Compass */}
        <button
          onClick={resetNorth}
          aria-label="รีเซ็ตมุมมองแผนที่"
          className="w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <svg
            width="28" height="28" viewBox="0 0 28 28" fill="none"
            style={{ transform: `rotate(${-bearing}deg)`, transition: "transform 0.3s ease" }}
          >
            <path d="M14 4 L11 15 L14 12 L17 15 Z" fill="currentColor" />
            <text x="14" y="25" textAnchor="middle" fontSize="7" fontWeight="400" fill="currentColor" fontFamily="system-ui,sans-serif">N</text>
          </svg>
        </button>

        {/* Base Map Switcher */}
        <div className="relative">
          <button
            onClick={() => setShowBasePanel((v) => !v)}
            aria-label="เปลี่ยนแผนที่ฐาน"
            className={`w-10 h-10 bg-white shadow-md border rounded-full flex items-center justify-center transition-colors ${showBasePanel ? "border-[#1A4D2E] text-[#1A4D2E] bg-green-50" : "border-gray-100 text-gray-700 hover:bg-gray-50"}`}
          >
            <Map className="w-5 h-5" strokeWidth={1.5} />
          </button>
          {showBasePanel && (
            <div className="absolute right-12 top-0 bg-white shadow-2xl ring-1 ring-black/8 rounded-2xl p-3 z-[1002] w-[168px]">
              <p className="font-semibold text-[13px] text-[#1A1A1A] leading-tight mb-2.5 text-center">แผนที่ฐาน</p>
              <div className="grid grid-cols-2 gap-2">
                {BASE_MAPS.map((bm) => (
                  <button key={bm.id} onClick={() => { setActiveBase(bm.id); setShowBasePanel(false) }}
                    className="flex flex-col items-center gap-1.5 group">
                    <div className={`w-[68px] h-[68px] rounded-xl overflow-hidden transition-all duration-150 flex-shrink-0 ${activeBase === bm.id ? "ring-[2.5px] ring-[#1A4D2E] ring-offset-[1.5px] shadow-md" : "ring-1 ring-black/10 group-hover:ring-2 group-hover:ring-[#1A4D2E]/50 group-hover:shadow-sm"}`}>
                      <img src={bm.preview} alt={bm.label} className="w-full h-full object-cover" draggable={false} />
                    </div>
                    <span className={`text-[10px] leading-tight text-center w-[68px] truncate ${activeBase === bm.id ? "text-gray-700 font-semibold" : "text-gray-500 font-medium group-hover:text-gray-700"}`}>
                      {bm.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Zoom pill */}
        <div className="bg-white shadow-md border border-gray-100 rounded-full flex flex-col items-center overflow-hidden">
          <button onClick={() => mapRef.current?.zoomIn()} aria-label="ซูมเข้า"
            className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <Plus className="w-5 h-5" strokeWidth={1.5} />
          </button>
          <div className="w-6 h-px bg-gray-200" />
          <button onClick={() => mapRef.current?.zoomOut()} aria-label="ซูมออก"
            className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <Minus className="w-5 h-5" strokeWidth={1.5} />
          </button>
        </div>

        {/* My location */}
        <button
          onClick={goToMyLocation}
          disabled={locating}
          aria-label="ตำแหน่งของฉัน"
          className="w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors disabled:opacity-50"
        >
          <img src="/precision.png" alt="" className={`w-5 h-5 ${locating ? "opacity-50 animate-pulse" : ""}`} />
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
