# เกณฑ์การจำแนกระดับธาตุอาหารในดิน

| อินทรียวัตถุในดิน (%) | ฟอสฟอรัสที่เป็นประโยชน์ (มก./กก.) | โพแทสเซียมที่สกัดได้ (มก./กก.) | ระดับ |
|---|---|---|---|
| <1.5 | <10 | <60 | 1 (ต่ำ) |
| 1.5–3.5 | 10–25 | 60–90 | 2 (ปานกลาง) |
| >3.5 | >25 | >90 | 3 (สูง) |

---

## รายงานผลการตรวจสอบ (2026-07-12)

### ไฟล์ที่ตรวจสอบ

| ไฟล์ | OM | P | K | สถานะ |
|---|---|---|---|---|
| `src/lib/soil/grid.ts` | [1.5, 3.5] ✓ | [10, 25] ✓ | [60, 90] ✓ | ✅ ถูกต้อง |
| `src/app/analyze/fertilizer/page.tsx` | <1.5 ✓ | <10 ✓ | <60 ✓ | ✅ แก้ไขแล้ว |
| `src/app/history/page.tsx` | — | <10 ✓ | <60 ✓ | ✅ แก้ไขแล้ว |
| `src/lib/storage.ts` | <1.5 ✓ | <10 ✓ | <60 ✓ | ✅ แก้ไขแล้ว |

### ค่าที่แก้ไข

| ไฟล์ | ตัวแปร | ค่าเดิม | ค่าใหม่ |
|---|---|---|---|
| `fertilizer/page.tsx` | OM low | <2 | <1.5 |
| `fertilizer/page.tsx` | OM med | <=3 | <=3.5 |
| `fertilizer/page.tsx` | P low | <15 | <10 |
| `fertilizer/page.tsx` | P med | <=45 | <=25 |
| `fertilizer/page.tsx` | K low | <50 | <60 |
| `fertilizer/page.tsx` | K med | <=100 | <=90 |
| `history/page.tsx` | P low | <15 | <10 |
| `history/page.tsx` | P med | <=45 | <=25 |
| `history/page.tsx` | K low | <50 | <60 |
| `history/page.tsx` | K med | <=100 | <=90 |
| `storage.ts` | P low | <15 | <10 |
| `storage.ts` | K low | <50 | <60 |
