# Boundary Search + Polygon Highlight

## สิ่งที่ทำวันนี้

### 1. ปรับไฟล์ขอบเขต GeoJSON

**อำเภอ (`public/boundaries/amphoe.geojson`)**
- Source ต้นฉบับ: `/Users/popia./Desktop/provin/Amphoe.geojson` (54.9MB, UTM EPSG:32647)
- Pipeline: reproject → WGS84 → mapshaper 20% simplify keep-shapes
- ผล: 9MB, 926 features, เส้นเนียน

**ตำบล (`public/boundaries/subdistrict.geojson`)**
- Source: ไฟล์ UTM 167MB
- Pipeline: geopandas `.to_crs(4326)` → mapshaper 5% simplify keep-shapes
- ผล: 10.3MB, 8105 features, เส้นเนียน

> **หลักการ**: ใช้ mapshaper เท่านั้น (topology-aware) — shapely และ python topojson ทำให้เส้นเหลื่อม

---

### 2. สร้าง Search Index

`public/boundaries/search-index.json` — 1.7MB, 9108 entries

```
Script: python3 (อ่าน 3 GeoJSON → คำนวณ bounds → บันทึก)
```

โครงสร้าง entry:
```json
{ "t": "prov|dist|sub", "nth": "ชื่อไทย", "nen": "English", 
  "pth": "จังหวัด", "dth": "อำเภอ",
  "b": [minLng, minLat, maxLng, maxLat],
  "f": "provinces|amphoe|subdistrict", "i": featureIndex }
```

| ประเภท | จำนวน |
|---|---|
| จังหวัด (prov) | 77 |
| อำเภอ (dist) | 926 |
| ตำบล (sub) | 8105 |

---

### 3. SearchBar (`src/app/map/SearchBar.tsx`)

- โหลด search-index.json **ครั้งเดียว** (lazy, ไม่ยิง DB/API)
- ค้นหา client-side instant จาก index
- Badge สี: จังหวัด (ม่วง) / อำเภอ (น้ำเงิน) / ตำบล (เขียว)
- กด X → ล้าง polygon highlight

**ค้นหารหัสไปรษณีย์ (5 หลัก):**
1. detect `/^\d{5}$/` → ยิง Nominatim postalcode API
2. parse `display_name` → ดึงชื่อ ตำบล/อำเภอ/จังหวัด
3. รองรับกรุงเทพฯ: `เขต` → อำเภอ, `แขวง` → ตำบล, `กรุงเทพมหานคร` (ไม่มี prefix จังหวัด)
4. fallback chain: ตำบล → อำเภอ → จังหวัด

---

### 4. SoilMaps (`src/app/map/SoilMaps.tsx`)

เพิ่ม:
- `HighlightLayer` — render polygon สีน้ำเงิน `#3b82f6`, fillOpacity 0.22
- `handleSearchSelect(entry)`:
  1. `fitBounds` ไปยัง bounds ของ entry
  2. `handlePick(centerLat, centerLng)` — ดึงค่าดินที่จุดกลาง
  3. โหลด feature จาก GeoJSON (cache ถ้า boundary layer เปิดอยู่แล้ว)
  4. set `highlightFeature`
- `FILE_TO_BOUNDARY_ID`: map ชื่อไฟล์ → BoundaryId

---

### 5. ไม่ใช้ DB สำหรับขอบเขต

- ลบ `rpc` ออกจาก BOUNDARY_LAYERS ทั้งหมด
- ไฟล์ static เท่านั้น: `/boundaries/*.geojson`
- ตาราง `provinces`, `districts`, `subdistricts` ใน Supabase ยังอยู่ แต่ไม่ถูกใช้บนแผนที่

---

### ไฟล์ที่เกี่ยวข้อง

```
public/boundaries/
├── provinces.geojson        1.2MB  77 features
├── amphoe.geojson           9.0MB  926 features
├── subdistrict.geojson      10.3MB 8105 features
└── search-index.json        1.7MB  9108 entries

src/app/map/
├── SearchBar.tsx            (rewrite ใหม่)
└── SoilMaps.tsx             (เพิ่ม HighlightLayer + handleSearchSelect)
```
