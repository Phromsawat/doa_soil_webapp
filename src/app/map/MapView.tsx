"use client"

import { useEffect, useRef, useState } from "react"
import L from "leaflet"
import "leaflet/dist/leaflet.css"
import { Plus, Minus, X, MapPin, Camera } from "lucide-react"
import { useUser } from "@/lib/supabase/useUser"
import { saveMapPin, fetchMapPins, type MapPinRow } from "@/lib/supabase/mapPins"

delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
})

const userLocationIcon = L.divIcon({
  className: "",
  html: `
    <div class="relative flex items-center justify-center w-4 h-4">
      <span class="absolute inline-flex h-full w-full rounded-full bg-active opacity-75 animate-ping"></span>
      <span class="relative inline-flex w-3 h-3 rounded-full bg-active border-2 border-white shadow"></span>
    </div>
  `,
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

const pinIcon = L.divIcon({
  className: "",
  html: `<div style="width:20px;height:20px;background:#1A4D2E;border:2px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
})

function createOwnPinIcon(color: string) {
  return L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;background:${color};border:2.5px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 22],
  })
}

type SoilLevel = "low" | "medium" | "high"

const LEVEL_STYLE: Record<SoilLevel, { color: string; label: string }> = {
  low: { color: "#ff000d", label: "ต่ำ" },
  medium: { color: "#ffd188", label: "ปานกลาง" },
  high: { color: "#85c98a", label: "สูง" },
}

interface Nutrient {
  value: string
  level: SoilLevel
}

interface SoilPoint {
  lat: number
  lng: number
  name: string
  value: number
  level: SoilLevel
  updatedAt: string
  trendLabel: string
  om: Nutrient
  phosphorus: Nutrient
  potassium: Nutrient
  trendNote: string
  isUserAdded?: boolean
}

const LEVEL_PCT: Record<SoilLevel, number> = { low: 30, medium: 62, high: 90 }

function classifyOM(v: number): SoilLevel { return v >= 3 ? "high" : v >= 1.5 ? "medium" : "low" }
function classifyP(v: number): SoilLevel { return v > 30 ? "high" : v >= 11 ? "medium" : "low" }
function classifyK(v: number): SoilLevel { return v > 120 ? "high" : v >= 60 ? "medium" : "low" }
function overallLevel(levels: SoilLevel[]): SoilLevel {
  if (levels.includes("low")) return "low"
  if (levels.includes("medium")) return "medium"
  return "high"
}

const soilPoints: SoilPoint[] = [
  { lat: 18.7883, lng: 98.9853, name: "เชียงใหม่", value: 82, level: "high", updatedAt: "วันนี้ 09:30 น.", trendLabel: "แนวโน้มดีขึ้น", om: { value: "3.2", level: "high" }, phosphorus: { value: "45", level: "high" }, potassium: { value: "120", level: "medium" }, trendNote: "คุณภาพดินในรอบ 7 วันที่ผ่านมามีการทรงตัวและเริ่มพัฒนาขึ้นตามแนวโน้มปกติ" },
  { lat: 16.4419, lng: 102.8360, name: "ขอนแก่น", value: 55, level: "medium", updatedAt: "วันนี้ 08:15 น.", trendLabel: "ทรงตัว", om: { value: "2.1", level: "medium" }, phosphorus: { value: "22", level: "medium" }, potassium: { value: "85", level: "medium" }, trendNote: "คุณภาพดินอยู่ในระดับปานกลาง ควรติดตามปริมาณธาตุอาหารอย่างต่อเนื่อง" },
  { lat: 14.9799, lng: 102.0977, name: "นครราชสีมา", value: 28, level: "low", updatedAt: "เมื่อวาน 17:40 น.", trendLabel: "แนวโน้มลดลง", om: { value: "0.9", level: "low" }, phosphorus: { value: "8", level: "low" }, potassium: { value: "40", level: "low" }, trendNote: "คุณภาพดินอยู่ในระดับต่ำ แนะนำให้ปรับปรุงดินและเพิ่มธาตุอาหาร" },
  { lat: 13.7367, lng: 100.5231, name: "กรุงเทพฯ", value: 61, level: "medium", updatedAt: "วันนี้ 10:05 น.", trendLabel: "ทรงตัว", om: { value: "2.4", level: "medium" }, phosphorus: { value: "30", level: "high" }, potassium: { value: "72", level: "medium" }, trendNote: "คุณภาพดินอยู่ในระดับปานกลางค่อนข้างดี เหมาะกับการเพาะปลูกทั่วไป" },
  { lat: 7.8804, lng: 98.3923, name: "ภูเก็ต", value: 90, level: "high", updatedAt: "วันนี้ 07:50 น.", trendLabel: "แนวโน้มดีขึ้น", om: { value: "3.6", level: "high" }, phosphorus: { value: "52", level: "high" }, potassium: { value: "140", level: "high" }, trendNote: "คุณภาพดินอยู่ในระดับดีเยี่ยม เหมาะสมกับการเพาะปลูกอย่างยิ่ง" },
]

function mapPinRowToSoilPoint(row: MapPinRow): SoilPoint {
  const omLevel = classifyOM(row.om ?? 0)
  const pLevel = classifyP(row.phosphorus ?? 0)
  const kLevel = classifyK(row.potassium ?? 0)
  const level = overallLevel([omLevel, pLevel, kLevel])
  const date = new Date(row.createdAt)
  const updatedAt = date.toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" })
  return {
    lat: row.lat, lng: row.lng, name: row.name,
    value: Math.round(LEVEL_PCT[level]), level,
    updatedAt, trendLabel: "จากชุมชน",
    om: { value: (row.om ?? 0).toString(), level: omLevel },
    phosphorus: { value: (row.phosphorus ?? 0).toString(), level: pLevel },
    potassium: { value: (row.potassium ?? 0).toString(), level: kLevel },
    trendNote: row.sampleId ? `รหัส: ${row.sampleId}` : "ข้อมูลดินที่บันทึกโดยผู้ใช้งาน",
    isUserAdded: row.isOwn,
  }
}

export default function MapView() {
  const { isAuthenticated } = useUser()
  const mapRef = useRef<L.Map | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const userMarkerRef = useRef<L.Marker | null>(null)
  const pinMarkerRef = useRef<L.Marker | null>(null)
  const isPinModeRef = useRef(false)

  const [selectedPoint, setSelectedPoint] = useState<SoilPoint | null>(null)
  const [isPinMode, setIsPinMode] = useState(false)
  const [pendingPin, setPendingPin] = useState<{ lat: number; lng: number } | null>(null)
  const [userPoints, setUserPoints] = useState<SoilPoint[]>([])

  const photoOmRef = useRef<HTMLInputElement>(null)
  const photoPhRef = useRef<HTMLInputElement>(null)
  const photoKRef = useRef<HTMLInputElement>(null)

  // Form state
  const [form, setForm] = useState({ name: "", sampleId: "", om: "", phosphorus: "", potassium: "", photoOm: "", photoPh: "", photoK: "" })

  useEffect(() => { isPinModeRef.current = isPinMode }, [isPinMode])

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

    mapRef.current = map

    soilPoints.forEach((p) => {
      const { color } = LEVEL_STYLE[p.level]
      L.circleMarker([p.lat, p.lng], {
        radius: 9, color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 1,
      }).addTo(map).on("click", () => { if (!isPinModeRef.current) setSelectedPoint(p) })
    })

    map.on("click", (e: L.LeafletMouseEvent) => {
      if (!isPinModeRef.current) return
      const { lat, lng } = e.latlng
      setPendingPin({ lat, lng })
      if (pinMarkerRef.current) {
        pinMarkerRef.current.setLatLng([lat, lng])
      } else {
        pinMarkerRef.current = L.marker([lat, lng], { icon: pinIcon, zIndexOffset: 900 }).addTo(map)
      }
    })

    const handleResize = () => map.invalidateSize()
    window.addEventListener("resize", handleResize)
    window.addEventListener("orientationchange", handleResize)

    return () => {
      window.removeEventListener("resize", handleResize)
      window.removeEventListener("orientationchange", handleResize)
      map.remove()
      mapRef.current = null
    }
  }, [])

  function addUserMarker(map: L.Map, p: SoilPoint) {
    const { color } = LEVEL_STYLE[p.level]
    if (p.isUserAdded) {
      L.marker([p.lat, p.lng], { icon: createOwnPinIcon(color), zIndexOffset: 500 })
        .addTo(map)
        .on("click", () => { if (!isPinModeRef.current) setSelectedPoint(p) })
    } else {
      L.circleMarker([p.lat, p.lng], {
        radius: 9, color: "#ffffff", weight: 2, fillColor: color, fillOpacity: 1,
      }).addTo(map).on("click", () => { if (!isPinModeRef.current) setSelectedPoint(p) })
    }
  }

  // Fetch DB pins after map is ready
  useEffect(() => {
    const waitForMap = setInterval(() => {
      const map = mapRef.current
      if (!map) return
      clearInterval(waitForMap)
      fetchMapPins().then(rows => {
        const points: SoilPoint[] = rows.map(mapPinRowToSoilPoint)
        setUserPoints(points)
        points.forEach(p => addUserMarker(map, p))
      }).catch(() => {})
    }, 200)
    return () => clearInterval(waitForMap)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords
        if (userMarkerRef.current) {
          userMarkerRef.current.setLatLng([latitude, longitude])
        } else if (mapRef.current) {
          userMarkerRef.current = L.marker([latitude, longitude], {
            icon: userLocationIcon, zIndexOffset: 1000,
          }).addTo(mapRef.current)
        }
      },
      () => {
        if (userMarkerRef.current) { userMarkerRef.current.remove(); userMarkerRef.current = null }
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  function goToMyLocation() {
    if (!navigator.geolocation) { alert("อุปกรณ์นี้ไม่รองรับการระบุตำแหน่ง"); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => mapRef.current?.setView([pos.coords.latitude, pos.coords.longitude], 15),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) alert("กรุณาอนุญาตการเข้าถึงตำแหน่งของคุณในเบราว์เซอร์")
        else if (err.code === err.POSITION_UNAVAILABLE) alert("ไม่พบตำแหน่งของคุณ กรุณาตรวจสอบว่าเปิดใช้งาน Location Services ให้เบราว์เซอร์นี้ในการตั้งค่าเครื่องแล้ว")
        else alert("ค้นหาตำแหน่งนานเกินไป กรุณาลองใหม่อีกครั้ง")
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
    )
  }

  function togglePinMode() {
    const next = !isPinMode
    setIsPinMode(next)
    if (!next) cancelPin()
  }

  function cancelPin() {
    setPendingPin(null)
    setForm({ name: "", sampleId: "", om: "", phosphorus: "", potassium: "", photoOm: "", photoPh: "", photoK: "" })
    if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null }
  }

  async function savePin() {
    if (!pendingPin || !form.name.trim()) return
    const omVal = parseFloat(form.om) || null
    const pVal = parseFloat(form.phosphorus) || null
    const kVal = parseFloat(form.potassium) || null
    const omLevel = classifyOM(omVal ?? 0)
    const pLevel = classifyP(pVal ?? 0)
    const kLevel = classifyK(kVal ?? 0)
    const level = overallLevel([omLevel, pLevel, kLevel])
    const now = new Date()
    const timeStr = `${now.getHours().toString().padStart(2,"0")}:${now.getMinutes().toString().padStart(2,"0")} น.`

    const newPoint: SoilPoint = {
      lat: pendingPin.lat, lng: pendingPin.lng,
      name: form.name.trim(), value: Math.round(LEVEL_PCT[level]),
      level, updatedAt: `วันนี้ ${timeStr}`, trendLabel: "เพิ่งเพิ่ม",
      om: { value: (omVal ?? 0).toString(), level: omLevel },
      phosphorus: { value: (pVal ?? 0).toString(), level: pLevel },
      potassium: { value: (kVal ?? 0).toString(), level: kLevel },
      trendNote: "ข้อมูลดินที่บันทึกโดยผู้ใช้งาน",
      isUserAdded: true,
    }

    // Remove temporary teardrop marker before adding the permanent circle
    if (pinMarkerRef.current) { pinMarkerRef.current.remove(); pinMarkerRef.current = null }

    // Optimistic UI — show marker immediately
    if (mapRef.current) addUserMarker(mapRef.current, newPoint)
    setUserPoints(prev => [...prev, newPoint])
    setPendingPin(null)
    setForm({ name: "", sampleId: "", om: "", phosphorus: "", potassium: "", photoOm: "", photoPh: "", photoK: "" })
    setIsPinMode(false)
    isPinModeRef.current = false
    setSelectedPoint(newPoint)

    // Persist to Supabase (fire-and-forget, don't block UI)
    saveMapPin({
      lat: pendingPin.lat, lng: pendingPin.lng,
      name: form.name.trim(),
      sampleId: form.sampleId.trim() || undefined,
      om: omVal, phosphorus: pVal, potassium: kVal,
    }).catch(err => console.warn("saveMapPin failed:", err))
  }

  const showCard = selectedPoint && !pendingPin
  const showForm = !!pendingPin

  return (
    <div className="relative isolate h-[calc(100dvh-64px-72px-env(safe-area-inset-bottom))] lg:h-[calc(100dvh-64px)] w-full font-thai">
      <div ref={containerRef} className="h-full w-full" />

      {/* Pin mode banner */}
      {isPinMode && (
        <div className="absolute top-3 inset-x-3 z-[1050] flex justify-center pointer-events-none">
          <div className="bg-[#1A4D2E] text-white text-xs font-medium px-4 py-2 rounded-full shadow-lg">
            แตะบนแผนที่เพื่อปักพิกัด
          </div>
        </div>
      )}

      {/* Legend */}
      <div
        className="absolute left-3 z-[1000] bg-white/95 shadow-md border border-gray-100 rounded-xl px-3 py-2.5 transition-all duration-300 lg:!bottom-auto lg:!top-20"
        style={{ bottom: (showCard || showForm) ? "calc(min(440px, 58dvh) + 16px)" : "24px" }}
      >
        <p className="text-[11px] font-semibold text-gray-700 mb-1.5">คุณภาพดิน</p>
        <div className="flex flex-col gap-1">
          {(["high","medium","low"] as SoilLevel[]).map(l => (
            <div key={l} className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-white shadow" style={{ backgroundColor: LEVEL_STYLE[l].color }} />
              <span className="text-[11px] text-gray-600">{LEVEL_STYLE[l].label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Compass */}
      <div className="absolute top-3 left-3 z-[1000] w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center select-none pointer-events-none">
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M14 4 L11 15 L14 12 L17 15 Z" fill="#4B5563" />
          <text x="14" y="25" textAnchor="middle" fontSize="7" fontWeight="400" fill="#374151" fontFamily="system-ui,sans-serif">N</text>
        </svg>
      </div>

      {/* Right-center map controls */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[1000] flex flex-col gap-3 items-center">
        <div className="bg-white shadow-md border border-gray-100 rounded-full flex flex-col items-center overflow-hidden">
          <button onClick={() => mapRef.current?.zoomIn()} aria-label="ซูมเข้า"
            className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <Plus className="w-5 h-5" />
          </button>
          <div className="w-6 h-px bg-gray-200" />
          <button onClick={() => mapRef.current?.zoomOut()} aria-label="ซูมออก"
            className="w-10 h-11 flex items-center justify-center text-gray-700 hover:bg-gray-50 active:bg-gray-100 transition-colors">
            <Minus className="w-5 h-5" />
          </button>
        </div>

        <button onClick={goToMyLocation} aria-label="ตำแหน่งของฉัน"
          className="w-10 h-10 bg-white shadow-md border border-gray-100 rounded-full flex items-center justify-center hover:bg-gray-50 active:bg-gray-100 transition-colors">
          <img src="/precision.png" alt="" className="w-5 h-5" />
        </button>

        {/* Pin button — logged-in only */}
        {isAuthenticated && (
          <button onClick={togglePinMode} aria-label="ปักพิกัด"
            className={`w-10 h-10 shadow-md border rounded-full flex items-center justify-center transition-colors ${
              isPinMode ? "bg-[#1A4D2E] border-[#1A4D2E] text-white" : "bg-white border-gray-100 text-gray-700 hover:bg-gray-50 active:bg-gray-100"
            }`}>
            <MapPin className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Area summary card */}
      {showCard && (
        <div className="absolute inset-x-3 bottom-4 z-[1050] pointer-events-none">
          <div className="pointer-events-auto mx-auto w-full max-w-[440px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.18)] border border-gray-100 p-5 animate-[fadeInUp_0.25s_ease-out]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-gray-900">
                  สรุปข้อมูลพื้นที่ · {selectedPoint.name}
                  {selectedPoint.isUserAdded && (
                    <span className="ml-2 text-[10px] font-medium bg-[#1A4D2E]/10 text-[#1A4D2E] px-1.5 py-0.5 rounded-full">ของฉัน</span>
                  )}
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  อัปเดตล่าสุด: {selectedPoint.updatedAt} • {selectedPoint.trendLabel}
                </p>
                <p className="text-xs text-text-secondary mt-0.5">
                  {selectedPoint.lat.toFixed(4)}, {selectedPoint.lng.toFixed(4)}
                </p>
              </div>
              <button onClick={() => setSelectedPoint(null)} aria-label="ปิด"
                className="shrink-0 text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              <MetricCard label="อินทรียวัตถุ" nutrient={selectedPoint.om} unit="%" />
              <MetricCard label="ฟอสฟอรัส" nutrient={selectedPoint.phosphorus} unit="มก./กก" />
              <MetricCard label="โพแทสเซียม" nutrient={selectedPoint.potassium} unit="มก./กก" />
            </div>
            <div className="mt-4 flex items-center gap-3 bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
              <svg width="40" height="24" viewBox="0 0 40 24" fill="none" className="shrink-0">
                <path d="M2 16 C 8 16, 10 8, 16 8 S 26 4, 32 4" stroke="#1B5E3B" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
              <p className="text-xs text-text-secondary leading-relaxed">{selectedPoint.trendNote}</p>
            </div>
            <button className="mt-4 w-full h-12 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-semibold transition-colors">
              ดูรายงานฉบับเต็ม
            </button>
          </div>
        </div>
      )}

      {/* Pin form */}
      {showForm && (
        <div className="absolute inset-x-3 bottom-4 z-[1050] pointer-events-none">
          <div className="pointer-events-auto mx-auto w-full max-w-[440px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.18)] border border-gray-100 p-4 max-h-[min(72dvh,600px)] overflow-y-auto animate-[fadeInUp_0.25s_ease-out]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-gray-900">เพิ่มข้อมูลดิน</h3>
              <button onClick={cancelPin} aria-label="ยกเลิก" className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-text-secondary mb-3">
              พิกัด: {pendingPin.lat.toFixed(4)}, {pendingPin.lng.toFixed(4)}
            </p>

            <div className="flex flex-col gap-2">
              <div>
                <label className="text-[11px] text-text-secondary mb-1 block">ชื่อพื้นที่</label>
                <input
                  type="text" placeholder="เช่น ไร่นาของฉัน"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] transition-colors"
                />
              </div>
              <div>
                <label className="text-[11px] text-text-secondary mb-1 block">รหัสตัวอย่างดิน</label>
                <input
                  type="text" placeholder="เช่น SS-2024-001"
                  value={form.sampleId}
                  onChange={e => setForm(f => ({ ...f, sampleId: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] transition-colors"
                />
              </div>

              {/* Photo upload — 3 slots */}
              <div>
                <label className="text-[11px] text-text-secondary mb-2 block">รูปแผ่นทดสอบดิน</label>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "photoOm" as const, ref: photoOmRef, label: "อินทรียวัตถุ", sub: "(OM)" },
                    { key: "photoPh" as const, ref: photoPhRef, label: "ฟอสฟอรัส", sub: "(P)" },
                    { key: "photoK" as const, ref: photoKRef, label: "โพแทสเซียม", sub: "(K)" },
                  ]).map(({ key, ref, label, sub }) => (
                    <div key={key}>
                      <input
                        ref={ref}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (!file) return
                          const reader = new FileReader()
                          reader.onload = ev => setForm(f => ({ ...f, [key]: ev.target?.result as string }))
                          reader.readAsDataURL(file)
                        }}
                      />
                      {form[key] ? (
                        <div className="relative w-full h-[72px] rounded-lg overflow-hidden border border-gray-200">
                          <img src={form[key]} alt={label} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => { setForm(f => ({ ...f, [key]: "" })); if (ref.current) ref.current.value = "" }}
                            className="absolute top-1 right-1 w-5 h-5 bg-black/50 rounded-full flex items-center justify-center text-white"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => ref.current?.click()}
                          className="w-full h-[72px] border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center gap-0.5 text-gray-400 hover:border-[#1A4D2E] hover:text-[#1A4D2E] transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                          <span className="text-[9px] font-medium leading-tight text-center">{label}</span>
                          <span className="text-[8px] leading-none">{sub}</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-[11px] text-text-secondary">หรือ</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-text-secondary mb-1 block text-center">อินทรียวัตถุ (%)</label>
                  <input
                    type="number" placeholder="0.0" min="0" max="10" step="0.1"
                    value={form.om}
                    onChange={e => setForm(f => ({ ...f, om: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary mb-1 block text-center">ฟอสฟอรัส</label>
                  <input
                    type="number" placeholder="0" min="0"
                    value={form.phosphorus}
                    onChange={e => setForm(f => ({ ...f, phosphorus: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-text-secondary mb-1 block text-center">โพแทสเซียม</label>
                  <input
                    type="number" placeholder="0" min="0"
                    value={form.potassium}
                    onChange={e => setForm(f => ({ ...f, potassium: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-[#1A4D2E] transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-3">
              <button onClick={cancelPin}
                className="flex-1 h-10 border border-gray-200 text-gray-600 rounded-full text-sm font-medium hover:bg-gray-50 transition-colors">
                ยกเลิก
              </button>
              <button onClick={savePin} disabled={!form.name.trim()}
                className="flex-1 h-10 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function MetricCard({ label, nutrient, unit }: { label: string; nutrient: Nutrient; unit: string }) {
  const color = LEVEL_STYLE[nutrient.level].color
  const width = LEVEL_PCT[nutrient.level]
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm px-3 py-2.5 flex flex-col items-center">
      <span className="text-[11px] text-text-secondary text-center">{label}</span>
      <span className="text-2xl font-bold leading-tight mt-0.5 text-gray-900">
        {nutrient.value}
        <span className="text-[11px] font-medium ml-0.5">{unit}</span>
      </span>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2">
        <div className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
      </div>
    </div>
  )
}
