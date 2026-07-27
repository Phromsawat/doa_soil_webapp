# ZIP Auto-fill — กระบวนการทำงานละเอียด

## ภาพรวม

```
User พิมพ์ ZIP
      ↓
debounce 400ms
      ↓
Nominatim API (OpenStreetMap)
      ↓
parse display_name + boundingbox
      ↓
fill lat/lng + hint ในฟอร์ม
      ↓
(optional) เปิดแผนที่ → pre-zoom ไปพื้นที่นั้น
```

---

## ขั้นตอนที่ 1 — User พิมพ์รหัสไปรษณีย์

**ไฟล์**: `src/app/analyze/upload/page.tsx`

```tsx
<input
  type="text"
  inputMode="numeric"
  maxLength={5}
  value={postalCode}
  onChange={(e) => setPostalCode(e.target.value.replace(/\D/g, ""))}
/>
```

- `postalCode` คือ React state
- `replace(/\D/g, "")` — กรองให้เป็นตัวเลขเท่านั้น
- ทุกครั้งที่ user พิมพ์ → `postalCode` state เปลี่ยน → `useEffect` ด้านล่างทำงาน

---

## ขั้นตอนที่ 2 — useEffect ตรวจจับและ debounce

```tsx
useEffect(() => {
  if (zipDebounceRef.current) clearTimeout(zipDebounceRef.current)
  setZipHint(null)
  setZipError(null)

  if (!/^\d{5}$/.test(postalCode)) return   // ยังไม่ครบ 5 หลัก → หยุด

  zipDebounceRef.current = setTimeout(async () => {
    // ... เรียก API
  }, 400)
}, [postalCode])
```

- ทุกครั้งที่ `postalCode` เปลี่ยน → clear timeout เดิม → ตั้ง timeout ใหม่ 400ms
- ถ้า user พิมพ์เร็ว → timeout ถูก reset ซ้ำ → API ถูกเรียกครั้งเดียวเมื่อหยุดพิมพ์
- ถ้ายังไม่ครบ 5 หลัก → return ออก ไม่เรียก API

---

## ขั้นตอนที่ 3 — เรียก Nominatim API

```tsx
const res = await fetch(
  `https://nominatim.openstreetmap.org/search?postalcode=${postalCode}&countrycodes=th&format=json&limit=1`,
  { headers: { "Accept-Language": "th" } }
)
const hits = await res.json()
```

**Nominatim** คือบริการ geocoding ของ OpenStreetMap — ใช้ฟรี ไม่ต้อง API key

| parameter | ค่า | ความหมาย |
|---|---|---|
| `postalcode` | เช่น `50000` | รหัสที่ user พิมพ์ |
| `countrycodes=th` | ไทยเท่านั้น | กันผลต่างประเทศ |
| `format=json` | JSON | รูปแบบ response |
| `limit=1` | 1 ผล | ผลแรกพอ |
| `Accept-Language: th` | ภาษาไทย | ให้ display_name เป็นไทย |

**ตัวอย่าง response** สำหรับ `50000`:
```json
[{
  "display_name": "50000, กาวิละ, เมืองเชียงใหม่, เชียงใหม่, ประเทศไทย",
  "boundingbox": ["18.7614", "18.7615", "99.0187", "99.0188"]
}]
```

---

## ขั้นตอนที่ 4 — คำนวณพิกัดกลาง (centroid)

```tsx
const bb = hit.boundingbox  // [south, north, west, east]
const centerLat = ((parseFloat(bb[0]) + parseFloat(bb[1])) / 2).toFixed(6)
const centerLng = ((parseFloat(bb[2]) + parseFloat(bb[3])) / 2).toFixed(6)
setLat(centerLat)
setLng(centerLng)
```

`boundingbox` คือกรอบสี่เหลี่ยมล้อมรอบพื้นที่ ZIP:
```
[south, north, west, east]
   ↓       ↑      ←     →
```

นำ south+north หาร 2 → ละติจูดกลาง
นำ west+east หาร 2 → ลองจิจูดกลาง

ค่านี้คือ "จุดกึ่งกลางโดยประมาณ" ของพื้นที่ ZIP — ไม่แม่นถึงแปลง แต่พอสำหรับ zoom แผนที่

---

## ขั้นตอนที่ 5 — parse ชื่อพื้นที่ (hint)

```tsx
const parts = hit.display_name.split(", ")
// เช่น ["50000", "กาวิละ", "เมืองเชียงใหม่", "เชียงใหม่", "ประเทศไทย"]

const prov =
  parts.find(p => p.startsWith("จังหวัด"))?.replace("จังหวัด", "")
  ?? (parts.includes("กรุงเทพมหานคร") ? "กรุงเทพมหานคร" : undefined)

const dist =
  parts.find(p => p.startsWith("อำเภอ"))?.replace("อำเภอ", "")
  ?? parts.find(p => p.startsWith("เขต"))?.replace("เขต", "")

const sub =
  parts.find(p => p.startsWith("ตำบล"))?.replace("ตำบล", "")
  ?? parts.find(p => p.startsWith("แขวง"))?.replace("แขวง", "")
```

**กรณีพิเศษกรุงเทพฯ**: Nominatim ใช้ "เขต" แทน "อำเภอ" และ "แขวง" แทน "ตำบล"
และไม่มีคำว่า "จังหวัด" นำหน้า — ใช้ `includes("กรุงเทพมหานคร")` แทน

hint ที่แสดงใต้ช่อง:
```
กาวิละ อ.เมืองเชียงใหม่ จ.เชียงใหม่
```

---

## ขั้นตอนที่ 6 — fill ค่าใน form + แสดง hint

```tsx
setLat(centerLat)    // → ช่อง Latitude
setLng(centerLng)    // → ช่อง Longitude
setZipHint(...)      // → ข้อความสีเขียวใต้ช่อง ZIP
```

JSX:
```tsx
{zipHint && <p className="text-xs text-[#1A4D2E] pl-2">{zipHint}</p>}
{zipError && <p className="text-xs text-red-500 pl-2">{zipError}</p>}
```

---

## ขั้นตอนที่ 7 — เปิดแผนที่ (optional)

เมื่อ user กด "เลือกพิกัดจากแผนที่":

```tsx
<MapPicker
  onConfirm={handleMapConfirm}
  onCancel={() => setIsMapOpen(false)}
  initialLat={lat ? Number(lat) : undefined}   // ← ส่งค่าจาก ZIP
  initialLng={lng ? Number(lng) : undefined}   // ← ส่งค่าจาก ZIP
/>
```

**ใน MapPicker** (`src/app/analyze/map/MapPicker.tsx`):

```tsx
const center: [number, number] = hasInitial
  ? [initialLat!, initialLng!]   // ← zoom ไปพิกัด ZIP
  : [13.736717, 100.523186]      // ← กทม. default

const zoom = hasInitial ? 15 : 6
```

map เปิดมาที่ zoom 15 ตรงพื้นที่ ZIP ทันที พร้อม marker ปักอยู่แล้ว

---

## ขั้นตอนที่ 8 — user ปักหมุดแม่น → ส่งกลับ form

```tsx
map.on("click", (e) => {
  const { lat, lng } = e.latlng
  setPinned({ lat, lng })
  markerRef.current?.setLatLng([lat, lng])
})
```

กด "ยืนยันพิกัด":
```tsx
<button onClick={() => pinned && onConfirm(pinned.lat, pinned.lng)}>
  ยืนยันพิกัด
</button>
```

ใน upload page:
```tsx
const handleMapConfirm = (pickedLat: number, pickedLng: number) => {
  setLat(String(pickedLat))   // overwrite ค่า ZIP centroid ด้วยค่าแม่น
  setLng(String(pickedLng))
  setIsMapOpen(false)
}
```

---

## สรุป data flow ทั้งหมด

```
[User พิมพ์ ZIP]
        ↓
[postalCode state] → useEffect (debounce 400ms)
        ↓
[Nominatim API] ← request: postalcode=XXXXX&countrycodes=th
        ↓
[response: display_name + boundingbox]
        ↓
        ├── boundingbox → คำนวณ centroid → setLat / setLng
        └── display_name → parse ตำบล/อำเภอ/จังหวัด → setZipHint
        ↓
[form แสดง lat/lng + hint]
        ↓
[User กดเปิดแผนที่]
        ↓
[MapPicker รับ initialLat/initialLng] → zoom ไปพื้นที่ ZIP
        ↓
[User คลิกแผนที่แม่นขึ้น] → onConfirm(lat, lng)
        ↓
[setLat / setLng ใน form อัปเดตด้วยค่าแม่น]
```

---

## ข้อจำกัด

- Nominatim rate limit: 1 request/วินาที — debounce 400ms ช่วยลด แต่ถ้า user พิมพ์หลาย ZIP ต่อกันเร็วอาจถูก throttle
- centroid คือกึ่งกลาง bounding box — ไม่ใช่จุดศูนย์กลางแปลงจริง ใช้เพื่อ zoom เท่านั้น
- บาง ZIP อาจ Nominatim ไม่รู้จัก → แสดง "ไม่พบรหัสไปรษณีย์"
