"use client"

import { useCallback, useEffect, useState } from "react"
import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Plus, Minus, Map, Layers } from "lucide-react"
import SearchBar from "./SearchBar"

// --- Base Map Definitions ---
// Preview tiles show Thailand area (tile x=24,y=14 at z=5)
const BASE_MAPS = [
  {
    id: "google_road",
    label: "Google Maps",
    url: "https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}",
    subdomains: "0123",
    attribution: "© Google",
    preview: "https://mt0.google.com/vt/lyrs=m&x=24&y=14&z=5",
  },
  {
    id: "google_satellite",
    label: "Google Satellite",
    url: "https://mt{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    subdomains: "0123",
    attribution: "© Google",
    preview: "https://mt0.google.com/vt/lyrs=s&x=24&y=14&z=5",
  },
  {
    id: "bing",
    label: "Bing Map",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    subdomains: undefined,
    attribution: "© Esri",
    preview: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/5/14/24",
  },
  {
    id: "osm",
    label: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    subdomains: "abc",
    attribution: "© OpenStreetMap contributors",
    preview: "https://tile.openstreetmap.org/5/24/14.png",
  },
] as const

type BaseMapId = typeof BASE_MAPS[number]["id"]

import {
  NUTRIENTS,
  LAYERS,
  NUTRIENT_META,
  LEVEL_COLORS,
  LEVEL_LABEL_TH,
  SOIL_BOUNDS,
  classify,
  soilScore,
  type Layer,
  type SoilLevel,
} from "@/lib/soil/grid"
import { getSoilAtPoint, type SoilAtPoint } from "@/lib/supabase/soilGrid"


const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:13px;height:13px;border-radius:50%;background:#1A4D2E;"></div>`,
  iconSize: [13, 13],
  iconAnchor: [6.5, 6.5],
})

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

function MapRef({ onReady }: { onReady: (map: L.Map) => void }) {
  const map = useMap()
  useEffect(() => { onReady(map) }, [map, onReady])
  return null
}

// จัดกรอบให้เห็นทั้งประเทศไทยตอนโหลด
function FitThailand() {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(SOIL_BOUNDS, { padding: [20, 20] })
  }, [map])
  return null
}

function LevelBadge({ level }: { level: SoilLevel | null }) {
  if (!level) return <span className="text-gray-400">—</span>
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-semibold text-gray-800"
      style={{ background: LEVEL_COLORS[level] }}
    >
      {LEVEL_LABEL_TH[level]}
    </span>
  )
}

export default function SoilMaps() {
  const [active, setActive] = useState<Layer>("om")
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [result, setResult] = useState<SoilAtPoint | null>(null)
  const [loading, setLoading] = useState(false)
  const [outside, setOutside] = useState(false)
  const [errored, setErrored] = useState(false)
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null)
  const [activeBase, setActiveBase] = useState<BaseMapId>("google_road")
  const [showBasePanel, setShowBasePanel] = useState(false)
  const [showLayerPanel, setShowLayerPanel] = useState(false)
  const [compassHeading, setCompassHeading] = useState(0)
  const handleMapReady = useCallback((map: L.Map) => setMapInstance(map), [])

  useEffect(() => {
    function handleOrientation(e: DeviceOrientationEvent) {
      if (e.alpha != null) setCompassHeading(e.alpha)
    }
    window.addEventListener("deviceorientation", handleOrientation, true)
    return () => window.removeEventListener("deviceorientation", handleOrientation, true)
  }, [])

  function resetNorth() {
    if (!mapInstance) return
    mapInstance.fitBounds(SOIL_BOUNDS, { padding: [20, 20] })
  }

  const currentBase = BASE_MAPS.find((b) => b.id === activeBase)!

  const meta = NUTRIENT_META[active]
  const score = result ? soilScore(result.om, result.p, result.k) : null
  const sumLevel = score != null ? classify("sum", score) : null

  function goToMyLocation() {
    if (!navigator.geolocation || !mapInstance) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords
        mapInstance.setView([lat, lng], 14)
        handlePick(lat, lng)
      },
      () => {}
    )
  }

  async function handlePick(lat: number, lng: number) {
    setPicked({ lat, lng })
    setLoading(true)
    setOutside(false)
    setErrored(false)
    try {
      const data = await getSoilAtPoint(lat, lng)
      if (!data) {
        setResult(null)
        setOutside(true)
      } else {
        setResult(data)
      }
    } catch {
      setResult(null)
      setErrored(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative h-[calc(100dvh-4rem)] w-full overflow-hidden">
      {/* ให้ overlay สีกลืนกับ basemap แทนที่จะลอยทับ */}
      <style>{`.leaflet-image-layer.soil-overlay{mix-blend-mode:multiply}`}</style>

      <MapContainer
        center={[13.2, 101]}
        zoom={6}
        zoomControl={false}
        scrollWheelZoom
        className="absolute inset-0 h-full w-full"
      >
        <TileLayer
          key={activeBase}
          attribution={currentBase.attribution}
          url={currentBase.url}
          {...(currentBase.subdomains ? { subdomains: currentBase.subdomains } : {})}
        />
        <ImageOverlay
          key={active}
          url={meta.overlay}
          bounds={SOIL_BOUNDS}
          opacity={0.85}
          className="soil-overlay"
        />
        <Marker position={[13.0, 101.5]} icon={L.divIcon({
          className: "",
          html: `<span style="color:#6b7280;font-size:11px;font-weight:700;letter-spacing:0.12em;text-shadow:1px 1px 0 white,-1px -1px 0 white,1px -1px 0 white,-1px 1px 0 white;white-space:nowrap;pointer-events:none;user-select:none;">THAILAND</span>`,
          iconSize: [80, 14],
          iconAnchor: [40, 7],
        })} interactive={false} />
        {picked && <Marker position={[picked.lat, picked.lng]} icon={pinIcon} />}
        <ClickHandler onPick={handlePick} />
        <FitThailand />
        <MapRef onReady={handleMapReady} />
      </MapContainer>

      {/* Zoom + Location + Base Map */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-3 items-center">

        {/* Base Map Switcher Button */}
        <div className="group relative">
          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gray-800/75 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-[1003]">แผนที่ฐาน</span>
          <button
            onClick={() => { setShowBasePanel((v) => !v); setShowLayerPanel(false) }}
            aria-label="เปลี่ยนแผนที่ฐาน"
            className={`w-10 h-10 bg-white shadow-md border rounded-full flex items-center justify-center transition-colors ${
              showBasePanel ? "border-[#1A4D2E] text-[#1A4D2E] bg-green-50" : "border-gray-100 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Map className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {/* Base Map Panel */}
          {showBasePanel && (
            <div className="absolute right-12 top-0 bg-white shadow-2xl ring-1 ring-black/8 rounded-2xl p-3 z-[1002] w-[168px]">
              <p className="font-semibold text-[13px] text-[#1A1A1A] leading-tight mb-2.5 text-center">แผนที่ฐาน</p>
              <div className="grid grid-cols-2 gap-2">
                {BASE_MAPS.map((bm) => (
                  <button
                    key={bm.id}
                    onClick={() => { setActiveBase(bm.id); setShowBasePanel(false) }}
                    className="flex flex-col items-center gap-1.5 group"
                  >
                    <div
                      className={`w-[68px] h-[68px] rounded-xl overflow-hidden transition-all duration-150 flex-shrink-0 ${
                        activeBase === bm.id
                          ? "ring-[2.5px] ring-[#1A4D2E] ring-offset-[1.5px] shadow-md"
                          : "ring-1 ring-black/10 group-hover:ring-2 group-hover:ring-[#1A4D2E]/50 group-hover:shadow-sm"
                      }`}
                    >
                      <img
                        src={bm.preview}
                        alt={bm.label}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    </div>
                    <span className={`text-[10px] leading-tight text-center w-[68px] truncate ${
                      activeBase === bm.id
                        ? "text-gray-700 font-semibold"
                        : "text-gray-500 font-medium group-hover:text-gray-700"
                    }`}>
                      {bm.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>


        {/* Soil Layer Switcher */}
        <div className="group relative">
          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gray-800/75 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-[1003]">ชั้นข้อมูลดิน</span>
          <button
            onClick={() => { setShowLayerPanel((v) => !v); setShowBasePanel(false) }}
            aria-label="เลือกชั้นข้อมูลดิน"
            className={`w-10 h-10 bg-white shadow-md border rounded-full flex items-center justify-center transition-colors ${
              showLayerPanel ? "border-[#1A4D2E] text-[#1A4D2E] bg-green-50" : "border-gray-100 text-gray-700 hover:bg-gray-50"
            }`}
          >
            <Layers className="w-5 h-5" strokeWidth={1.5} />
          </button>

          {showLayerPanel && (
            <div className="absolute right-12 top-0 bg-white shadow-2xl ring-1 ring-black/8 rounded-2xl p-3 z-[1002] w-[168px]">
              <p className="font-semibold text-[13px] text-[#1A1A1A] leading-tight mb-2.5 text-center">ชั้นข้อมูลดิน</p>
              <div className="grid grid-cols-2 gap-2">
                {LAYERS.map((n) => {
                  const m = NUTRIENT_META[n]
                  const on = n === active
                  return (
                    <button
                      key={n}
                      onClick={() => { setActive(n); setShowLayerPanel(false) }}
                      className="flex flex-col items-center gap-1.5 group"
                    >
                      <div className={`w-[68px] h-[68px] rounded-xl overflow-hidden transition-all duration-150 flex-shrink-0 ${
                        on
                          ? "ring-[2.5px] ring-[#1A4D2E] ring-offset-[1.5px] shadow-md"
                          : "ring-1 ring-black/10 group-hover:ring-2 group-hover:ring-[#1A4D2E]/50 group-hover:shadow-sm"
                      }`}>
                        <img src={m.preview} alt={m.label} className="w-full h-full object-cover" draggable={false} />
                      </div>
                      <span className={`text-[10px] leading-tight text-center w-[68px] truncate ${
                        on ? "text-gray-700 font-semibold" : "text-gray-500 font-medium group-hover:text-gray-700"
                      }`}>
                        {m.short}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="group relative">
          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gray-800/75 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-[1003]">ซูม</span>
          <div className="bg-white shadow-md border border-gray-100 rounded-full flex flex-col items-center overflow-hidden">
            <button onClick={() => mapInstance?.zoomIn()} aria-label="ซูมเข้า"
              className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
              <Plus className="w-5 h-5" strokeWidth={1.5} />
            </button>
            <div className="w-6 h-px bg-gray-200" />
            <button onClick={() => mapInstance?.zoomOut()} aria-label="ซูมออก"
              className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
              <Minus className="w-5 h-5" strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* My Location */}
        <div className="group relative">
          <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gray-800/75 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-[1003]">ตำแหน่งของฉัน</span>
          <button onClick={goToMyLocation} aria-label="ตำแหน่งของฉัน"
            className="w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <img src="/precision.png" alt="" className="w-5 h-5" />
          </button>
        </div>

        {/* Compass */}
        <div className="group relative">
        <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gray-800/75 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-[1003]">รีเซ็ตมุมมอง</span>
        <button
          onClick={resetNorth}
          aria-label="รีเซ็ตมุมมองแผนที่"
          className="w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors"
        >
          <svg
            width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"
            style={{ transform: `rotate(${-compassHeading}deg)`, transition: "transform 0.3s ease" }}
          >
            <path d="M14 4 L11 15 L14 12 L17 15 Z" fill="currentColor" />
            <text x="14" y="25" textAnchor="middle" fontSize="7" fontWeight="400" fill="currentColor" fontFamily="system-ui,sans-serif">N</text>
          </svg>
        </button>
        </div>
      </div>


      {/* Search bar — top left */}
      <SearchBar onSelect={(lat, lng) => { mapInstance?.setView([lat, lng], 12); handlePick(lat, lng) }} />

      {/* legend — ล่างซ้าย (desktop) / บนซ้ายใต้ search (mobile) */}
      <div className="absolute left-3 top-16 z-[1000] rounded-2xl bg-white/85 px-3 py-2 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur">
        <div className="mb-1 text-center">
          <div className="font-semibold text-gray-700">ระดับ ({meta.short})</div>
          <div className="font-semibold text-gray-700">{meta.label}</div>
        </div>
        {(["high", "medium", "low"] as SoilLevel[]).map((lv) => (
          <div key={lv} className="flex items-center gap-2 py-0.5">
            <span
              className="inline-block h-3 w-3 rounded-full"
              style={{ background: LEVEL_COLORS[lv] }}
            />
            <span className="text-gray-600">{LEVEL_LABEL_TH[lv]}</span>
          </div>
        ))}
      </div>

      {/* การ์ดผลลัพธ์ — bottom sheet ลอย (มือถือ: ยกเหนือ BottomNav) */}
      {picked && (
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[1001] flex justify-center px-3 lg:bottom-4">
        <div className="pointer-events-auto w-full max-w-[26rem] rounded-2xl bg-white/90 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur">
              <div className="mb-2 text-center text-xs text-gray-500">
                พิกัด {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}
                {loading && <span className="ml-2">กำลังดึงข้อมูล…</span>}
              </div>
              {!loading && outside && (
                <p className="py-1 text-center text-sm text-red-400">
                  จุดนี้อยู่นอกพื้นที่ข้อมูล (นอกประเทศไทย/ทะเล)
                </p>
              )}
              {!loading && errored && (
                <p className="py-1 text-center text-sm text-red-500">
                  ดึงข้อมูลไม่สำเร็จ
                </p>
              )}
              {!loading && result && (
                <div className="space-y-0">
                  {/* คะแนนความอุดมสมบูรณ์รวม (ผลรวม level OM+P+K = 3-9) */}
                  <div
                    className={`mb-2 flex items-center justify-between rounded-xl border px-3 py-2 ${
                      active === "sum"
                        ? "border-[#1A4D2E] bg-white/60"
                        : "border-gray-100 bg-white/60"
                    }`}
                  >
                    <span className="text-xs text-gray-600">ความอุดมสมบูรณ์รวม</span>
                    <span className="flex items-center gap-2">
                      <span className="text-base font-bold text-gray-800">
                        {score ?? "—"}
                        <span className="text-[11px] font-normal text-gray-400">/9</span>
                      </span>
                      <LevelBadge level={sumLevel} />
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                  {NUTRIENTS.map((n) => {
                    const m = NUTRIENT_META[n]
                    const val = result[n]
                    const lv = classify(n, val)
                    return (
                      <div
                        key={n}
                        className={`rounded-xl border p-2 text-center transition ${
                          n === active
                            ? "border-[#1A4D2E] bg-white/60"
                            : "border-gray-100 bg-white/60"
                        }`}
                      >
                        <div className="text-[11px] text-gray-500">
                          {m.short} ({m.unit})
                        </div>
                        <div className="my-0.5 text-lg font-bold text-gray-800">
                          {val == null ? "—" : val.toFixed(2)}
                        </div>
                        <LevelBadge level={lv} />
                      </div>
                    )
                  })}
                  </div>
                </div>
              )}
        </div>
      </div>
      )}
    </div>
  )
}
