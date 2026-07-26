"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  MapContainer,
  TileLayer,
  ImageOverlay,
  GeoJSON,
  Marker,
  useMap,
  useMapEvents,
} from "react-leaflet"
import type { FeatureCollection } from "geojson"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Plus, Minus, Map, Layers, X } from "lucide-react"
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
import { createClient } from "@/lib/supabase/client"

const BOUNDARY_LAYERS = [
  { id: "provinces" as const, label: "จังหวัด", rpc: "get_provinces_geojson", color: "#111111", weight: 2 },
  { id: "districts" as const, label: "อำเภอ", rpc: "get_districts_geojson", color: "#444444", weight: 1 },
  { id: "subdistricts" as const, label: "ตำบล", rpc: "get_subdistricts_geojson", color: "#777777", weight: 0.5 },
] as const
type BoundaryId = typeof BOUNDARY_LAYERS[number]["id"]


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
  const [active, setActive] = useState<Layer | null>("om")
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
  const [activeBoundaries, setActiveBoundaries] = useState<Set<BoundaryId>>(new Set())
  const [boundaryOpacity, setBoundaryOpacity] = useState(0.7)
  const [soilOpacity, setSoilOpacity] = useState(0.85)
  const [boundaryData, setBoundaryData] = useState<Partial<Record<BoundaryId, FeatureCollection>>>({})
  const [boundaryLoading, setBoundaryLoading] = useState<Set<BoundaryId>>(new Set())
  const boundaryRefs = useRef<Partial<Record<BoundaryId, L.GeoJSON>>>({})
  const handleMapReady = useCallback((map: L.Map) => setMapInstance(map), [])

  function getBoundaryOpacity(_id: BoundaryId) { return boundaryOpacity }
  function updateBoundaryOpacity(val: number) {
    setBoundaryOpacity(val)
    BOUNDARY_LAYERS.forEach(({ id, color, weight }) => {
      const ref = boundaryRefs.current[id]
      if (ref) ref.setStyle({ color, weight, opacity: val, fillOpacity: 0 })
    })
  }

  useEffect(() => {
    function handleOrientation(e: DeviceOrientationEvent) {
      if (e.alpha != null) setCompassHeading(e.alpha)
    }
    window.addEventListener("deviceorientation", handleOrientation, true)
    return () => window.removeEventListener("deviceorientation", handleOrientation, true)
  }, [])

  async function toggleBoundary(id: BoundaryId) {
    const next = new Set(activeBoundaries)
    if (next.has(id)) {
      next.delete(id)
      setActiveBoundaries(next)
      return
    }
    if (!boundaryData[id]) {
      setBoundaryLoading(prev => { const s = new Set(prev); s.add(id); return s })
      const supabase = createClient()
      const layer = BOUNDARY_LAYERS.find(l => l.id === id)!
      const { data } = await supabase.rpc(layer.rpc)
      if (data) setBoundaryData(prev => ({ ...prev, [id]: data as FeatureCollection }))
      setBoundaryLoading(prev => { const s = new Set(prev); s.delete(id); return s })
    }
    next.add(id)
    setActiveBoundaries(next)
  }

  function resetNorth() {
    if (!mapInstance) return
    mapInstance.fitBounds(SOIL_BOUNDS, { padding: [20, 20] })
  }

  const currentBase = BASE_MAPS.find((b) => b.id === activeBase)!

  const meta = active ? NUTRIENT_META[active] : null
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
        {active && meta && (
          <ImageOverlay
            key={active}
            url={meta.overlay}
            bounds={SOIL_BOUNDS}
            opacity={soilOpacity}
            className="soil-overlay"
          />
        )}
        {BOUNDARY_LAYERS.map(({ id, color, weight }) => {
          const data = boundaryData[id]
          if (!activeBoundaries.has(id) || !data) return null
          return (
            <GeoJSON
              key={id}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              ref={(layer: any) => { if (layer) boundaryRefs.current[id] = layer }}
              data={data}
              style={{ color, weight, opacity: getBoundaryOpacity(id), fillOpacity: 0 }}
            />
          )
        })}
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
      <div className="absolute right-3 top-44 lg:top-1/2 lg:-translate-y-1/2 z-[1000] flex flex-col gap-3 items-center">

        {/* Base Map Switcher Button */}
        <div className="group relative">
          {!showBasePanel && <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gray-800/75 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-[1003]">แผนที่ฐาน</span>}
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
              <div className="relative flex items-center justify-center mb-2.5">
                <p className="font-semibold text-[13px] text-[#1A1A1A] leading-tight">แผนที่ฐาน</p>
                <button
                  onClick={() => setShowBasePanel(false)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="ปิด"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
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
          {!showLayerPanel && <span className="pointer-events-none absolute right-full mr-2 top-1/2 -translate-y-1/2 whitespace-nowrap rounded-full bg-gray-800/75 px-2 py-1 text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity z-[1003]">ชั้นข้อมูลดิน</span>}
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
            <div className="absolute right-12 top-0 bg-white shadow-2xl ring-1 ring-black/8 rounded-2xl p-3 z-[1002] w-[200px] max-h-[70vh] overflow-y-auto">
              <div className="relative flex items-center justify-center mb-2.5">
                <p className="font-semibold text-[13px] text-[#1A1A1A] leading-tight">ชั้นข้อมูล</p>
                <button
                  onClick={() => setShowLayerPanel(false)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="ปิด"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* ชั้นดิน */}
              <p className="text-[10px] text-gray-400 font-medium mb-1.5 uppercase tracking-wide">ชั้นดิน</p>
              <div className="grid grid-cols-3 gap-1.5 mb-2">
                {LAYERS.map((n) => {
                  const m = NUTRIENT_META[n]
                  const on = n === active
                  return (
                    <button
                      key={n}
                      onClick={() => setActive(on ? null : n)}
                      className="flex flex-col items-center gap-1 group"
                    >
                      <div className={`relative w-[54px] h-[54px] rounded-xl overflow-hidden transition-all duration-150 flex-shrink-0 ${
                        on
                          ? "ring-[2.5px] ring-[#1A4D2E] ring-offset-[1.5px] shadow-md"
                          : "ring-1 ring-black/10 opacity-50 group-hover:opacity-80 group-hover:ring-2 group-hover:ring-[#1A4D2E]/50 group-hover:shadow-sm"
                      }`}>
                        <img src={m.preview} alt={m.label} className="w-full h-full object-cover" draggable={false} />
                        {on && (
                          <span className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#1A4D2E] flex items-center justify-center shadow">
                            <svg width="7" height="7" viewBox="0 0 8 8" fill="none"><path d="M1.5 4L3.2 5.8L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] leading-tight text-center w-[54px] truncate ${
                        on ? "text-gray-700 font-semibold" : "text-gray-400 font-medium group-hover:text-gray-600"
                      }`}>
                        {m.short}
                      </span>
                    </button>
                  )
                })}
              </div>
              {active && (
                <div className="mb-3 px-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] text-gray-400">ความโปร่งแสง</span>
                    <span className="text-[10px] text-gray-500 font-medium">{Math.round(soilOpacity * 100)}%</span>
                  </div>
                  <input type="range" min="0.1" max="1" step="0.05" value={soilOpacity}
                    onChange={e => setSoilOpacity(Number(e.target.value))}
                    className="w-full h-1 accent-[#1A4D2E] cursor-pointer" />
                </div>
              )}

              {/* ขอบเขต */}
              <div className="border-t border-gray-100 pt-2.5 mb-2">
                <p className="text-[10px] text-gray-400 font-medium mb-1.5 uppercase tracking-wide">ขอบเขต</p>
                <div className="flex flex-col gap-1">
                  {BOUNDARY_LAYERS.map(({ id, label, color }) => {
                    const on = activeBoundaries.has(id)
                    const isLoading = boundaryLoading.has(id)
                    const op = getBoundaryOpacity(id)
                    return (
                      <div key={id}>
                        <button
                          onClick={() => toggleBoundary(id)}
                          disabled={isLoading}
                          className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-xl transition-colors text-left ${
                            on ? "bg-gray-50" : "hover:bg-gray-50"
                          }`}
                        >
                          <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
                          <span className="text-[12px] text-gray-700 flex-1">{label}</span>
                          {isLoading ? (
                            <span className="w-3.5 h-3.5 border-[1.5px] border-gray-200 border-t-[#1A4D2E] rounded-full animate-spin flex-shrink-0" />
                          ) : on ? (
                            <svg width="14" height="14" viewBox="0 0 8 8" fill="none" className="flex-shrink-0"><path d="M1.5 4L3.2 5.8L6.5 2" stroke="#1A4D2E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                          ) : null}
                        </button>
                      </div>
                    )
                  })}
                </div>
                {activeBoundaries.size > 0 && (
                  <div className="mt-2 px-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] text-gray-400">ความโปร่งแสง</span>
                      <span className="text-[10px] text-gray-500 font-medium">{Math.round(boundaryOpacity * 100)}%</span>
                    </div>
                    <input type="range" min="0.1" max="1" step="0.05" value={boundaryOpacity}
                      onChange={e => updateBoundaryOpacity(Number(e.target.value))}
                      className="w-full h-1 accent-[#1A4D2E] cursor-pointer" />
                  </div>
                )}
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

      {/* legend — ซ้ายบน แสดงเฉพาะเมื่อมี layer เปิดอยู่ */}
      {meta && (
        <div className="absolute left-3 top-16 z-[1000] rounded-2xl bg-white/85 px-3 py-2 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur">
          <div className="mb-1 text-center">
            <div className="font-semibold text-gray-700">ระดับ ({meta.short})</div>
            <div className="font-semibold text-gray-700">{meta.label}</div>
          </div>
          {(["high", "medium", "low"] as SoilLevel[]).map((lv) => (
            <div key={lv} className="flex items-center gap-2 py-0.5">
              <span className="inline-block h-3 w-3 rounded-full" style={{ background: LEVEL_COLORS[lv] }} />
              <span className="text-gray-600">{LEVEL_LABEL_TH[lv]}</span>
            </div>
          ))}
        </div>
      )}

      {/* การ์ดผลลัพธ์ — bottom sheet ลอย (มือถือ: ยกเหนือ BottomNav) */}
      {picked && (
      <div className="pointer-events-none absolute inset-x-0 bottom-[58px] z-[1001] flex justify-center px-3 lg:bottom-4">
        <div className="pointer-events-auto w-full max-w-[26rem] rounded-2xl bg-white/90 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur">
              <div className="relative mb-2 text-center text-xs text-gray-500">
                พิกัด {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}
                {loading && <span className="ml-2">กำลังดึงข้อมูล…</span>}
                <button
                  onClick={() => { setPicked(null); setResult(null); setOutside(false); setErrored(false) }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                  aria-label="ปิด"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
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
                  <div
                    className={`mb-2 flex items-center justify-between rounded-xl border px-3 py-2 ${
                      active === "sum" ? "border-[#1A4D2E] bg-white/60" : "border-gray-100 bg-white/60"
                    }`}
                  >
                    <span className="text-xs text-gray-600">ความอุดมสมบูรณ์รวม</span>
                    <LevelBadge level={sumLevel} />
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
