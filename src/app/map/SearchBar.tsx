"use client"

import { useState, useRef } from "react"
import { Search, X, Loader2, MapPin } from "lucide-react"

export interface SearchEntry {
  t: "prov" | "dist" | "sub"
  nth: string
  nen?: string
  pth?: string
  dth?: string
  b: [number, number, number, number]
  f: "provinces" | "amphoe" | "subdistrict"
  i: number
  zip?: string
}

interface Props {
  onSelect: (entry: SearchEntry) => void
  onClear?: () => void
  className?: string
}

const TYPE_LABELS: Record<SearchEntry["t"], string> = {
  prov: "จังหวัด",
  dist: "อำเภอ",
  sub: "ตำบล",
}

const TYPE_COLORS: Record<SearchEntry["t"], string> = {
  prov: "bg-purple-100 text-purple-700",
  dist: "bg-blue-100 text-blue-700",
  sub: "bg-green-100 text-green-700",
}

export default function SearchBar({ onSelect, onClear, className }: Props) {
  const [query, setQuery] = useState("")
  const indexRef = useRef<SearchEntry[] | null>(null)
  const [results, setResults] = useState<SearchEntry[]>([])
  const [loading, setLoading] = useState(false)

  async function ensureIndex(): Promise<SearchEntry[] | null> {
    if (indexRef.current) return indexRef.current
    setLoading(true)
    try {
      const res = await fetch("/boundaries/search-index.json")
      const data = (await res.json()) as SearchEntry[]
      indexRef.current = data
      return data
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }

  async function doSearch(q: string) {
    if (!q.trim()) { setResults([]); return }

    // ZIP code: 5 digits → Nominatim postalcode → match local index
    if (/^\d{5}$/.test(q.trim())) {
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?postalcode=${q.trim()}&countrycodes=th&format=json&limit=5`,
          { headers: { "Accept-Language": "th" } }
        )
        const hits = await res.json() as Array<{ display_name: string; boundingbox: string[] }>
        if (hits.length > 0) {
          const idx = await ensureIndex()
          const matched: SearchEntry[] = []
          for (const hit of hits) {
            // display_name: "35150, xxx, ตำบลชื่อ, อำเภอชื่อ, จังหวัดชื่อ, ประเทศไทย"
            const parts = hit.display_name.split(", ")
            const prov =
              parts.find(p => p.startsWith("จังหวัด"))?.replace("จังหวัด", "")
              ?? (parts.includes("กรุงเทพมหานคร") ? "กรุงเทพมหานคร" : undefined)
            const dist =
              parts.find(p => p.startsWith("อำเภอ"))?.replace("อำเภอ", "")
              ?? parts.find(p => p.startsWith("เขต"))?.replace("เขต", "")
            const sub =
              parts.find(p => p.startsWith("ตำบล"))?.replace("ตำบล", "")
              ?? parts.find(p => p.startsWith("แขวง"))?.replace("แขวง", "")
              ?? (parts.length > 3 ? parts[2] : undefined)
            if (idx) {
              const found =
                // 1) ตำบล exact match
                (sub && (idx.find(e => e.t === "sub" && e.nth === sub && (!prov || e.pth === prov) && (!dist || e.dth === dist))
                  ?? idx.find(e => e.t === "sub" && e.nth === sub && (!prov || e.pth === prov))))
                // 2) fallback อำเภอ
                ?? (dist && idx.find(e => e.t === "dist" && e.nth === dist && (!prov || e.pth === prov)))
                // 3) fallback จังหวัด
                ?? (prov && idx.find(e => e.t === "prov" && e.nth === prov))
              if (found && !matched.find(m => m.i === found!.i && m.f === found!.f)) {
                matched.push({ ...found, zip: q.trim() } as SearchEntry)
              }
            }
            // fallback: synthetic entry from bounding box
            if (matched.length === 0 && idx) {
              const bb = hit.boundingbox // [south, north, west, east]
              const b: [number,number,number,number] = [
                parseFloat(bb[2]), parseFloat(bb[0]),
                parseFloat(bb[3]), parseFloat(bb[1]),
              ]
              matched.push({ t: "sub", nth: sub ?? q.trim(), pth: prov, dth: dist, b, f: "subdistrict", i: -1, zip: q.trim() } as SearchEntry)
            }
          }
          setResults(matched.slice(0, 5))
          return
        }
      } catch { /* fall through to name search */ }
      finally { setLoading(false) }
    }

    const idx = await ensureIndex()
    if (!idx) return
    const ql = q.trim().toLowerCase()
    const matches = idx
      .filter(
        (e) =>
          e.nth.toLowerCase().includes(ql) ||
          (e.nen && e.nen.toLowerCase().includes(ql)) ||
          (e.pth && e.pth.toLowerCase().includes(ql)) ||
          (e.dth && e.dth.toLowerCase().includes(ql))
      )
      .slice(0, 8)
    setResults(matches)
  }

  function subtitle(e: SearchEntry) {
    const parts: string[] = []
    if (e.zip) parts.push(e.zip)
    if (e.t === "sub") {
      if (e.dth) parts.push(`อ.${e.dth}`)
      if (e.pth) parts.push(`จ.${e.pth}`)
    } else if (e.t === "dist") {
      if (e.pth) parts.push(`จ.${e.pth}`)
    }
    return parts.join(" ")
  }

  return (
    <div className={className ?? "absolute left-3 top-3 z-[1001] w-[220px] max-w-[calc(100vw-5rem)]"}>
      <div className="relative">
        <div className="relative flex items-center bg-white shadow-md rounded-full border border-gray-100 pl-3 pr-10 gap-2 h-10">
          {loading ? (
            <Loader2 className="w-4 h-4 text-gray-400 shrink-0 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <input
            type="text"
            placeholder="ค้นหาพื้นที่..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              doSearch(e.target.value)
            }}
            className="flex-1 min-w-0 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]); onClear?.() }}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {results.length > 0 && (
          <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-2xl shadow-xl ring-1 ring-black/8 overflow-hidden">
            {results.map((r, i) => {
              const sub = subtitle(r)
              return (
                <button
                  key={i}
                  onClick={() => {
                    onSelect(r)
                    setResults([])
                    setQuery(r.nth)
                  }}
                  className="w-full text-left px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${TYPE_COLORS[r.t]}`}
                      >
                        {TYPE_LABELS[r.t]}
                      </span>
                      <span className="truncate font-medium">{r.nth}</span>
                    </div>
                    {sub && (
                      <div className="text-[11px] text-gray-400 mt-0.5 truncate">{sub}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
