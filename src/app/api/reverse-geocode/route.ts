// หาพื้นที่ (ตำบล/อำเภอ/จังหวัด + รหัสไปรษณีย์) จากพิกัด โดยใช้ข้อมูลขอบเขตของเราเอง
// แทนการเรียก Nominatim จากเบราว์เซอร์ — ไม่ส่งพิกัดผู้ใช้ออกไปยังบริการภายนอก
// และไม่ติด rate-limit ของ OSM
//
// ใช้ point-in-polygon กับ subdistrict.geojson (8,105 ตำบล) จึงแม่นกว่าการเทียบ
// กรอบสี่เหลี่ยม โหลดไฟล์ครั้งเดียวแล้ว cache ไว้ใน module scope

type Ring = number[][]

interface SubFeature {
  properties: {
    P_NAME_T: string   // จังหวัด
    A_NAME_T: string   // อำเภอ
    T_NAME_T: string   // ตำบล
  }
  geometry: { type: "Polygon"; coordinates: Ring[] }
}

interface IndexEntry {
  t: string
  f?: string
  i?: number
  zip?: string
}

/** ตำบล 1 รายการ พร้อมกรอบสี่เหลี่ยมไว้กรองเร็ว ๆ ก่อนคำนวณ polygon */
interface Cell {
  province: string
  amphur: string
  district: string
  zip: string | null
  bbox: [number, number, number, number]   // [minLng, minLat, maxLng, maxLat]
  rings: Ring[]
}

let cellsPromise: Promise<Cell[]> | null = null

function ringBbox(ring: Ring): [number, number, number, number] {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity
  for (const [lng, lat] of ring) {
    if (lng < minLng) minLng = lng
    if (lng > maxLng) maxLng = lng
    if (lat < minLat) minLat = lat
    if (lat > maxLat) maxLat = lat
  }
  return [minLng, minLat, maxLng, maxLat]
}

async function loadCells(origin: string): Promise<Cell[]> {
  const [geoRes, idxRes] = await Promise.all([
    fetch(`${origin}/boundaries/subdistrict.geojson`, { cache: "force-cache" }),
    fetch(`${origin}/boundaries/search-index.json`, { cache: "force-cache" }),
  ])
  if (!geoRes.ok || !idxRes.ok) throw new Error("โหลดข้อมูลขอบเขตไม่สำเร็จ")

  const geo = (await geoRes.json()) as { features: SubFeature[] }
  const index = (await idxRes.json()) as IndexEntry[]

  // search-index เก็บ i = ตำแหน่ง feature ใน subdistrict.geojson -> ใช้ดึง zip
  const zipByFeature = new Map<number, string>()
  for (const e of index) {
    if (e.t === "sub" && e.f === "subdistrict" && typeof e.i === "number" && e.zip) {
      zipByFeature.set(e.i, e.zip)
    }
  }

  return geo.features.map((f, i) => ({
    province: f.properties.P_NAME_T,
    amphur: f.properties.A_NAME_T,
    district: f.properties.T_NAME_T,
    zip: zipByFeature.get(i) ?? null,
    bbox: ringBbox(f.geometry.coordinates[0]),
    rings: f.geometry.coordinates,
  }))
}

/** ray casting — จุดอยู่ในวงรอบนี้ไหม */
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > lat) !== (yj > lat) && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

/** วงแรก = ขอบนอก, วงถัดไป = รู (hole) */
function pointInPolygon(lng: number, lat: number, rings: Ring[]): boolean {
  if (!pointInRing(lng, lat, rings[0])) return false
  for (let k = 1; k < rings.length; k++) {
    if (pointInRing(lng, lat, rings[k])) return false
  }
  return true
}

// กรอบคร่าว ๆ ของประเทศไทย — กันคำขอที่อยู่นอกพื้นที่ข้อมูล
const TH_BOUNDS = { minLng: 97, minLat: 5, maxLng: 106, maxLat: 21 }

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const latRaw = searchParams.get("lat")
  const lngRaw = searchParams.get("lng")
  const lat = Number(latRaw)
  const lng = Number(lngRaw)

  // Number(null) = 0 จึงต้องเช็คว่าส่ง param มาจริง ไม่งั้นกลายเป็นพิกัด (0,0)
  if (latRaw === null || lngRaw === null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return Response.json({ error: "พิกัดไม่ถูกต้อง" }, { status: 400 })
  }
  if (
    lat < TH_BOUNDS.minLat || lat > TH_BOUNDS.maxLat ||
    lng < TH_BOUNDS.minLng || lng > TH_BOUNDS.maxLng
  ) {
    return Response.json({ error: "พิกัดอยู่นอกประเทศไทย" }, { status: 404 })
  }

  try {
    if (!cellsPromise) cellsPromise = loadCells(origin)
    const cells = await cellsPromise

    for (const c of cells) {
      const [minLng, minLat, maxLng, maxLat] = c.bbox
      if (lng < minLng || lng > maxLng || lat < minLat || lat > maxLat) continue
      if (!pointInPolygon(lng, lat, c.rings)) continue
      return Response.json(
        { province: c.province, amphur: c.amphur, district: c.district, zip: c.zip },
        { headers: { "Cache-Control": "public, max-age=86400" } }
      )
    }
    return Response.json({ error: "ไม่พบพื้นที่ของพิกัดนี้" }, { status: 404 })
  } catch {
    cellsPromise = null   // โหลดพลาด — ให้ครั้งถัดไปลองใหม่
    return Response.json({ error: "ค้นหาพื้นที่ไม่สำเร็จ" }, { status: 500 })
  }
}
