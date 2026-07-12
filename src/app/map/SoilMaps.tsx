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
import { Plus, Minus } from "lucide-react"

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
  const handleMapReady = useCallback((map: L.Map) => setMapInstance(map), [])

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
          attribution="&copy; OpenStreetMap &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager_nolabels/{z}/{x}/{y}{r}.png"
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

      {/* Compass */}
      <div className="absolute top-3 left-3 z-[1000] w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center select-none pointer-events-none">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 4 L11 15 L14 12 L17 15 Z" fill="#4B5563" />
          <text x="14" y="25" textAnchor="middle" fontSize="7" fontWeight="400" fill="#374151" fontFamily="system-ui,sans-serif">N</text>
        </svg>
      </div>

      {/* Zoom + Location */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-3 items-center">
        <div className="bg-white shadow-md border border-gray-100 rounded-full flex flex-col items-center overflow-hidden">
          <button onClick={() => mapInstance?.zoomIn()} aria-label="ซูมเข้า"
            className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
          <div className="w-6 h-px bg-gray-200" />
          <button onClick={() => mapInstance?.zoomOut()} aria-label="ซูมออก"
            className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <Minus className="w-5 h-5" />
          </button>
        </div>
        <button onClick={goToMyLocation} aria-label="ตำแหน่งของฉัน"
          className="w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors">
          <img src="/precision.png" alt="" className="w-5 h-5" />
        </button>
      </div>

      {/* แท็บเลือกธาตุอาหาร — pill ลอยด้านบน */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-3">
        <div className="pointer-events-auto flex rounded-full bg-white/85 p-1 shadow-lg ring-1 ring-black/5 backdrop-blur">
          {LAYERS.map((n) => {
            const m = NUTRIENT_META[n]
            const on = n === active
            return (
              <button
                key={n}
                onClick={() => setActive(n)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  on
                    ? "bg-[#1A4D2E] text-white shadow"
                    : "text-gray-600 hover:bg-black/5"
                }`}
              >
                {m.short}
              </button>
            )
          })}
        </div>
      </div>

      {/* legend — เดสก์ท็อป: ล่างซ้าย · มือถือ: บนซ้าย (พ้นการ์ด+BottomNav) */}
      <div className="absolute left-3 top-16 z-[1000] rounded-2xl bg-white/85 px-3 py-2 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur">
        <div className="mb-1 font-semibold text-gray-700">
          ระดับ{meta.short} · {meta.label}
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
      <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[1001] flex justify-center px-3 lg:bottom-4">
        <div className="pointer-events-auto w-full max-w-[26rem] rounded-2xl bg-white/90 p-3 shadow-xl ring-1 ring-black/5 backdrop-blur">
          {!picked && (
            <p className="py-2 text-center text-sm text-gray-500">
              แตะบนแผนที่เพื่อดูค่า OM / P / K
            </p>
          )}
          {picked && (
            <>
              <div className="mb-2 text-center text-xs text-gray-500">
                พิกัด {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}
                {loading && <span className="ml-2">กำลังดึงข้อมูล…</span>}
              </div>
              {!loading && outside && (
                <p className="py-1 text-center text-sm text-amber-600">
                  จุดนี้อยู่นอกพื้นที่ข้อมูล (นอกประเทศไทย/ทะเล)
                </p>
              )}
              {!loading && errored && (
                <p className="py-1 text-center text-sm text-red-500">
                  ดึงข้อมูลไม่สำเร็จ
                </p>
              )}
              {!loading && result && (
                <>
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
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
