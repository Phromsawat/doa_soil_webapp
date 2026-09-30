# Design System — DOA Soil Test Kit

## สี (Colors)

| Token | Value | ใช้สำหรับ |
|---|---|---|
| `primary` | `#1B5E3B` | ปุ่มหลัก, accent สำคัญ, icon หลัก |
| `accent` | `#4CAF7D` | highlight, badge |
| `active` | `#52C48A` | สถานะ active |
| `surface` / `background` | `#F5F5F0` | พื้นหลังหน้าจอ |
| `card` | `#FFFFFF` | การ์ดทั่วไป |
| `dark-card` | `#1A2F2A` | การ์ดสีเข้ม (เช่น คำแนะนำปุ๋ย) |
| `text-primary` | `#1A1A1A` | ข้อความหลัก |
| `text-secondary` | `#666666` | ข้อความรอง, label, วันที่ |

### สีแสดงระดับ (Level Colors)
ใช้เฉพาะกราฟ/progress bar เท่านั้น ตัวอักษร label ใช้ `text-secondary` ทุกระดับ

| ระดับ | สีกราฟ | Tailwind |
|---|---|---|
| ต่ำ | แดง | `bg-[#ff000d]` |
| ปานกลาง | เหลืองอ่อน | `bg-[#ffd188]` |
| สูง | เขียวอ่อน | `bg-[#85c98a]` |

---

## Typography

| Utility | ขนาด | น้ำหนัก | ใช้สำหรับ |
|---|---|---|---|
| `text-display-lg` | 32px | 700 | หัวข้อใหญ่มาก |
| `text-display-sm` | 24px | 700 | หัวข้อการ์ดสำคัญ |
| `text-headline-md` | 20px | 600 | หัวข้อส่วน |
| `text-title-lg` | 18px | 600 | หัวข้อย่อย เช่น "สารอาหารในดิน", "ระดับธาตุอาหารหลัก" |
| `text-body-lg` | 16px | 400 | ข้อความเนื้อหา |
| `text-body-md` | 14px | 400 | ข้อความรอง |
| `text-label-md` | 12px | 600 | label, badge, tag |
| `text-data-lg` | 28px | 700 | ตัวเลขค่าข้อมูล |

### แนวทางน้ำหนักตัวอักษร
- หัวข้อ section → `font-semibold` (600)
- ค่าตัวเลข / เน้น → `font-semibold` (600)
- ข้อความทั่วไป, label รอง → `font-medium` (500) หรือ `font-normal` (400)
- **หลีกเลี่ยง** `font-bold` (700) / `font-black` (900) ในข้อความเล็ก

---

## Spacing & Layout

| Token | Value | ใช้สำหรับ |
|---|---|---|
| `spacing-xs` | 4px | ระยะห่างเล็กมาก |
| `spacing-sm` | 8px | ระยะห่างภายในองค์ประกอบ |
| `spacing-md` / `spacing-gutter` | 16px | padding การ์ด, margin ทั่วไป |
| `spacing-lg` | 24px | ระยะห่างระหว่าง section |
| `spacing-xl` | 32px | ระยะห่างใหญ่ |
| `spacing-container-margin` | 16px | margin ซ้ายขวาของ container |

---

## Border Radius

| Token | Value | ใช้สำหรับ |
|---|---|---|
| `radius-card` | 12px | การ์ดทั่วไป (`rounded-xl`) |
| `rounded-2xl` | 16px | การ์ดหลัก, กลุ่ม input |
| `rounded-full` | 9999px | ปุ่ม, badge, progress bar, input |

---

## Components

### การ์ด (Card)
```
bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-5
```

### การ์ดสีเข้ม (Dark Card)
```
bg-[#1A2F2A] rounded-2xl p-5 text-white
```

### ปุ่มหลัก (Primary Button)
```
bg-primary hover:bg-primary/90 text-white rounded-full font-medium h-10 px-6
```

### ปุ่มรอง (Outline Button)
```
border border-gray-200 bg-white text-text-primary rounded-full font-medium h-10 px-6
```

### Progress Bar
```html
<!-- Track -->
<div class="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
  <!-- Fill — สีตามระดับ -->
  <div class="h-full bg-[level-color] rounded-full" style="width: XX%" />
</div>
```

### MapPreview (Result Page)
```
src/app/analyze/result/MapPreview.tsx
```
- Leaflet read-only map (Carto Voyager tiles — เหมือน MapPicker)
- ปุ่ม zoom +/- (pill) + ปุ่ม expand (วงกลม) อยู่มุมขวาบน `z-[1000]`
- ไม่มี dragging / scroll zoom — แสดงผลอย่างเดียว
- คลิก expand → ไปหน้า `/analyze/map?returnTo=/analyze/result&lat=...&lng=...`

### Badge ระดับ (ดินดี ฯลฯ)
```
px-3 py-1 bg-green-100 text-primary text-xs font-bold rounded-full
```

---

## หน้าจอและ Responsive

แอปออกแบบสำหรับ **มือถือเป็นหลัก** (mobile-first)
- breakpoint `sm` = 640px ขึ้นไป
- ข้อความ: `text-xs sm:text-sm` หรือ `text-sm sm:text-base`
- padding: `p-2 sm:p-3` หรือ `p-4 sm:p-5`
- กริด NPK: `grid-cols-3` คงที่ (3 การ์ดเสมอ)

---

## Font

- **Noto Sans Thai** — ข้อความภาษาไทยทั้งหมด (`font-thai`)
- **Inter** — ตัวเลข, ภาษาอังกฤษ (fallback อัตโนมัติ)
