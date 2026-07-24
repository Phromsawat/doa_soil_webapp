"use client"

import { useState } from "react"
import { Search, X, Loader2, MapPin } from "lucide-react"

interface Result {
  display_name: string
  lat: string
  lon: string
}

interface Props {
  onSelect: (lat: number, lng: number, label: string) => void
}

export default function SearchBar({ onSelect }: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Result[]>([])
  const [searching, setSearching] = useState(false)

  async function doSearch(q: string) {
    if (!q.trim()) { setResults([]); return }
    setSearching(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&countrycodes=th`,
        { headers: { "Accept-Language": "th" } }
      )
      const data = await res.json()
      setResults(data)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="absolute left-3 top-3 z-[1001] w-[180px] max-w-[calc(100vw-5rem)]">
      <div className="relative">
        <div className="flex items-center bg-white shadow-md rounded-full border border-gray-100 px-3 gap-2 h-10">
          {searching ? (
            <Loader2 className="w-4 h-4 text-gray-400 shrink-0 animate-spin" />
          ) : (
            <Search className="w-4 h-4 text-gray-400 shrink-0" />
          )}
          <input
            type="text"
            placeholder="ค้นหาสถานที่..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") doSearch(query) }}
            className="flex-1 text-sm text-gray-800 bg-transparent outline-none placeholder:text-gray-400"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setResults([]) }}
              className="shrink-0 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        {results.length > 0 && (
          <div className="absolute top-full mt-1.5 left-0 right-0 bg-white rounded-2xl shadow-xl ring-1 ring-black/8 overflow-hidden">
            {results.map((r, i) => (
              <button
                key={i}
                onClick={() => {
                  const lat = parseFloat(r.lat)
                  const lng = parseFloat(r.lon)
                  const label = r.display_name.split(",")[0]
                  onSelect(lat, lng, label)
                  setResults([])
                  setQuery(label)
                }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-50 last:border-0 flex items-start gap-2"
              >
                <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
                <span className="line-clamp-2 leading-snug">{r.display_name}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
