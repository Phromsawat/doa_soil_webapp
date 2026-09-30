# ระบบค้นหาพื้นที่ — หลักการและแหล่งข้อมูล

## แหล่งข้อมูลที่ใช้

| ข้อมูล | เก็บที่ไหน | ขนาด | ใช้ทำอะไร |
|---|---|---|---|
| `search-index.json` | `public/boundaries/` | ~2 MB | รายชื่อ + bounding box + รหัสไปรษณีย์ ของทุกจังหวัด/อำเภอ/ตำบล |
| Nominatim API | OpenStreetMap (cloud) | — | fallback เฉพาะ 31 ตำบลที่ ZIP match ไม่ติดใน index |
| Leaflet | npm package | — | render แผนที่ + zoom/fitBounds |

---

## โครงสร้างข้อมูลใน search-index.json

ไฟล์นี้มี 9,108 entries รวม 3 ระดับ:

```
{ t: "prov", nth: "เชียงใหม่", b: [minLng, minLat, maxLng, maxLat] }
{ t: "dist", nth: "เมืองเชียงใหม่", pth: "เชียงใหม่", b: [...] }
{ t: "sub",  nth: "สุเทพ", dth: "เมืองเชียงใหม่", pth: "เชียงใหม่", zip: "50200", b: [...] }
```

- `b` = bounding box จาก GADM 4.1 จริง
- `zip` = รหัสไปรษณีย์ (มีใน 8,074 จาก 8,105 ตำบล = 99.6%)
- centroid = `(minLat + maxLat) / 2`, `(minLng + maxLng) / 2`

ที่มาของ `zip`: merge จาก dataset `earthchie/jquery.Thailand.js` โดย script `scripts/add_zip_to_search_index.py`

---

## กรณีที่ 1: พิมพ์ชื่อ (ค้นหาบนแผนที่)

```
User พิมพ์ชื่อ เช่น "สุเทพ"
        |
        v
SearchBar กรอง search-index.json ใน browser
(ไม่ต้องเรียก API ใดเลย)
        |
        v
แสดง dropdown: ตำบลสุเทพ อ.เมืองเชียงใหม่ จ.เชียงใหม่
        |
        v
User กดเลือก → ดึง bounding box → Leaflet.fitBounds()
→ แผนที่ zoom ไปที่ตำบลนั้นอัตโนมัติ
```

---

## กรณีที่ 2: พิมพ์รหัสไปรษณีย์ (หน้า Upload + SearchBar บนแผนที่)

```
User พิมพ์ 50200
        |
        v
debounce 400ms
        |
        v
[1] ค้น search-index.json: filter e.t === "sub" && e.zip === "50200"
    → เจอ (99.6% ของกรณี) → แสดง dropdown ตำบลทันที ไม่ต้องเรียก API
        |
        v (ถ้าไม่เจอ — 31 ตำบลที่ชื่อสะกดต่างกัน)
[2] fallback: เรียก Nominatim → parse จังหวัด/อำเภอ → กรอง index ต่อ
        |
        v
แสดง dropdown ให้ user เลือกตำบล
        |
        v
User เลือก → คำนวณ centroid จาก bounding box → fill lat/lng ในฟอร์ม
```

---

## กรณีที่ 3: เปิดแผนที่หลัง fill lat/lng แล้ว

```
User กด "เลือกพิกัดจากแผนที่"
        |
        v
MapPicker รับ initialLat/initialLng → zoom=15 ที่พิกัดนั้นทันที
        |
        v
User คลิกแผนที่ปรับจุดให้แม่น
        |
        v
กด "ยืนยันพิกัด" → ส่ง lat, lng กลับ form
reverse geocode (Nominatim) → หา postcode จาก lat/lng ที่ปัก
→ fill รหัสไปรษณีย์กลับเข้าฟอร์ม
```

---

## สรุป data pipeline

```
GADM 4.1 (polygon ไทย)
    ↓ script แปลง
search-index.json
    ↓ merge ZIP จาก earthchie dataset
search-index.json (พร้อม zip field) ← อยู่ใน repo / browser ทั้งหมด
    |                                   โหลดครั้งเดียว cache ใน useRef
    ├── ค้นชื่อ → dropdown → fitBounds
    └── ค้น ZIP → dropdown → centroid → form

Nominatim API ← ใช้แค่ 2 กรณี
    ├── fallback ZIP (31 ตำบล ที่ index ไม่มี zip)
    └── reverse geocode หลังปักหมุด (lat/lng → postcode)
```

---

## ข้อมูลความครอบคลุม ZIP

| สถานะ | จำนวน | % |
|---|---|---|
| ตำบลที่มี zip ใน index | 8,074 | 99.6% |
| ตำบลที่ใช้ Nominatim fallback | 31 | 0.4% |
| รวม | 8,105 | 100% |

31 ตำบลที่ fallback เกิดจากชื่อสะกดต่างกันระหว่าง GADM 4.1 และ dataset ZIP ภายนอก
