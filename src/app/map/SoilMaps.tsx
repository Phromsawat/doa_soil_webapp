"use client"

import { useEffect, useState } from "react"
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

import {
  NUTRIENTS,
  NUTRIENT_META,
  LEVEL_COLORS,
  LEVEL_LABEL_TH,
  SOIL_BOUNDS,
  classify,
  type Nutrient,
  type SoilLevel,
} from "@/lib/soil/grid"
import { getSoilAtPoint, type SoilAtPoint } from "@/lib/supabase/soilGrid"

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:16px;height:16px;border-radius:50%;background:#2563eb;border:3px solid #fff;box-shadow:0 1px 6px rgba(0,0,0,.45)"></div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
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
  const [active, setActive] = useState<Nutrient>("om")
  const [picked, setPicked] = useState<{ lat: number; lng: number } | null>(null)
  const [result, setResult] = useState<SoilAtPoint | null>(null)
  const [loading, setLoading] = useState(false)
  const [outside, setOutside] = useState(false)
  const [errored, setErrored] = useState(false)

  const meta = NUTRIENT_META[active]

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
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />
        <ImageOverlay
          key={active}
          url={meta.overlay}
          bounds={SOIL_BOUNDS}
          opacity={0.85}
          className="soil-overlay"
        />
        {picked && <Marker position={[picked.lat, picked.lng]} icon={pinIcon} />}
        <ClickHandler onPick={handlePick} />
        <FitThailand />
      </MapContainer>

      {/* แท็บเลือกธาตุอาหาร — pill ลอยด้านบน */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-3">
        <div className="pointer-events-auto flex rounded-full bg-white/85 p-1 shadow-lg ring-1 ring-black/5 backdrop-blur">
          {NUTRIENTS.map((n) => {
            const m = NUTRIENT_META[n]
            const on = n === active
            return (
              <button
                key={n}
                onClick={() => setActive(n)}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  on
                    ? "bg-emerald-500 text-white shadow"
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
      <div className="absolute left-3 top-16 z-[1000] rounded-2xl bg-white/85 px-3 py-2 text-xs shadow-lg ring-1 ring-black/5 backdrop-blur lg:top-auto lg:bottom-4">
        <div className="mb-1 font-semibold text-gray-700">
          ระดับ{meta.short} · {meta.label}
        </div>
        {(["high", "medium", "low"] as SoilLevel[]).map((lv) => (
          <div key={lv} className="flex items-center gap-2 py-0.5">
            <span
              className="inline-block h-3 w-3 rounded-sm"
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
              <div className="mb-2 flex items-center justify-between px-1 text-xs text-gray-500">
                <span>
                  พิกัด {picked.lat.toFixed(4)}, {picked.lng.toFixed(4)}
                </span>
                {loading && <span>กำลังดึงข้อมูล…</span>}
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
                            ? "border-emerald-300 bg-emerald-50/60"
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
