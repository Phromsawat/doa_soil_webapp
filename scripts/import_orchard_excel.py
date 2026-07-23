"""
Convert the DOA fertilizer Excel (ฐานข้อมูลสรุปการใช้ปุ๋ย sheet) into SQL inserts
for the Supabase tables: crops + fertilizer_recommendations.

Excel layout (header row = 2, data starts row 3):
  col 1: <NaN>
  col 2: พืช (crop name — first row of each crop only)
  col 3: ลำดับที่ / sub crop name (repeated)
  col 4: รายการวิเคราะห์ ('อินทรียวัตถุ (%)' | 'ฟอสฟอรัส (mg/kg)' | 'โพแทสเซียม (mg/kg)')
  col 5: ค่าวิเคราะห์ label ('<2', '2-3', '>3', ...)
  col 6: Min ค่าวิเคราะห์
  col 7: Max ค่าวิเคราะห์
  col 8: อัตราแนะนำ N (g/tree/year)  — may be "-"
  col 9: อัตราแนะนำ P2O5
  col 10: อัตราแนะนำ K2O
  col 11: หน่วย
  col 12: หมายเหตุ

Usage:
  python scripts/import_orchard_excel.py <excel_path> > supabase/migrations/002_import_orchard.sql
"""

import re
import sys
import pandas as pd
import uuid

# ---------------------------------------------------------------------------
# ช่วงค่าวิเคราะห์: อ่านจาก "ป้ายกำกับ" (คอลัมน์ ค่าวิเคราะห์) ไม่ใช่คอลัมน์ Min/Max
#
# เหตุผล: คอลัมน์ Min/Max ใน Excel เขียนไว้แบบสมมติว่าค่าที่กรอกเป็นจำนวนเต็ม
#   เช่น ทุเรียน OM ป้าย '<2' -> Min 0 / Max 1 , ป้าย '>3' -> Min 4
#   ทำให้ค่าทศนิยมตกช่องโหว่ (OM 1.5 หรือ 2.5 ไม่เข้าช่วงไหนเลย -> ได้ N = '—')
#   ป้ายกำกับคือความหมายจริง จึงแปลงจากป้ายเพื่อให้ช่วงต่อเนื่อง
#
#   '<X'  -> (0, X-EPS)     '>X'  -> (X+EPS, BIG)
#   '≥X'  -> (X, BIG)       'A-B' -> (A, B)      (รองรับทั้ง - และ – en-dash)
# ---------------------------------------------------------------------------
EPS = 0.001
BIG = 1_000_000.0


def parse_label_range(label):
    """คืน (min, max) จากป้ายช่วงค่า หรือ None ถ้า parse ไม่ได้"""
    if label is None or (isinstance(label, float) and pd.isna(label)):
        return None
    s = str(label).strip().replace("–", "-").replace("—", "-").replace(" ", "")
    if not s:
        return None
    m = re.fullmatch(r"<([\d.]+)", s)
    if m:
        return (0.0, float(m.group(1)) - EPS)
    m = re.fullmatch(r"≥([\d.]+)", s)
    if m:
        return (float(m.group(1)), BIG)
    m = re.fullmatch(r">([\d.]+)", s)
    if m:
        return (float(m.group(1)) + EPS, BIG)
    m = re.fullmatch(r"([\d.]+)-([\d.]+)", s)
    if m:
        return (float(m.group(1)), float(m.group(2)))
    return None

NUTRIENT_MAP = {
    'อินทรียวัตถุ (%)':    'OM',
    'ฟอสฟอรัส (mg/kg)':   'P',
    'โพแทสเซียม (mg/kg)': 'K',
}

# Map crop name → crop_type name (must match seeded crop_types)
ORCHARD = {'ทุเรียน', 'มังคุด', 'เงาะ', 'มะม่วง', 'ลำไย', 'ลิ้นจี่', 'ส้ม', 'มะพร้าว', 'สับปะรด'}
RICE    = {'ข้าวไวแสง', 'ข้าวไม่ไวแสง'}
FIELD   = {'อ้อยปลูก', 'อ้อยตอ', 'ข้าวโพดฝักสด', 'ข้าวโพดเลี้ยงสัตว์', 'มันสำปะหลัง', 'ถั่ว'}
# Everything else (vegetables / tubers / etc.) → พืชผัก

def crop_type_of(name: str) -> str:
    if name in ORCHARD: return 'ไม้ผล'
    if name in RICE:    return 'ข้าว'
    if name in FIELD:   return 'พืชไร่'
    return 'พืชผัก'


def to_num(val):
    """Convert Excel cell to number, or None if '-' or NaN."""
    if pd.isna(val):
        return None
    if isinstance(val, str):
        s = val.strip()
        if s in ('-', '', '—'):
            return None
        try:
            return float(s)
        except ValueError:
            return None
    return float(val)


def esc(s):
    """SQL-escape a string."""
    if s is None:
        return 'NULL'
    return "'" + str(s).replace("'", "''") + "'"


def main(excel_path):
    df = pd.read_excel(excel_path, sheet_name='ฐานข้อมูลสรุปการใช้ปุ๋ย', header=None)

    # Find unique crops (col index 2 in the data area, header at row 2)
    crops = []
    seen = set()
    current_crop = None
    rows = []

    for i in range(3, len(df)):
        row = df.iloc[i]
        crop_cell = row.iloc[2]
        if pd.notna(crop_cell) and str(crop_cell).strip() not in ('', 'พืช'):
            current_crop = str(crop_cell).strip()
            if current_crop not in seen:
                seen.add(current_crop)
                crops.append(current_crop)
        if current_crop is None:
            continue

        nutrient_label = row.iloc[3]
        if pd.isna(nutrient_label):
            continue
        nutrient_code = NUTRIENT_MAP.get(str(nutrient_label).strip())
        if not nutrient_code:
            continue

        # ใช้ช่วงจากป้ายกำกับก่อน (ต่อเนื่อง ไม่มีช่องโหว่)
        # ถ้าป้ายอ่านไม่ออกจริงๆ ค่อย fallback ไปคอลัมน์ Min/Max เดิม
        rng = parse_label_range(row.iloc[4])
        if rng is not None:
            v_min, v_max = rng
        else:
            v_min = to_num(row.iloc[5])
            v_max = to_num(row.iloc[6])
            print(
                f"  ! parse ป้ายไม่ได้ ใช้ Min/Max เดิม: {current_crop} / {row.iloc[4]!r}",
                file=sys.stderr,
            )
        n     = to_num(row.iloc[7])
        p     = to_num(row.iloc[8])
        k     = to_num(row.iloc[9])
        unit  = str(row.iloc[10]).strip() if pd.notna(row.iloc[10]) else 'g/tree/year'

        # Normalize unit string to match schema check constraint
        if 'ต้น' in unit or 'tree' in unit.lower():
            unit_norm = 'g/tree/year'
        elif 'ไร่' in unit or 'rai' in unit.lower():
            unit_norm = 'kg/rai'
        else:
            unit_norm = 'g/tree/year'

        rows.append({
            'crop': current_crop,
            'nutrient': nutrient_code,
            'v_min': v_min,
            'v_max': v_max,
            'n': n,
            'p': p,
            'k': k,
            'unit': unit_norm,
        })

    # ---------- Emit SQL ----------
    out = []
    out.append("-- =============================================================================")
    out.append("-- 002_import_orchard.sql — auto-generated from")
    out.append("-- '1.ขัอมูลคำแนะนำการให้ปุ๋ยตามค่าวิเคราะห์ดิน.xlsx' → sheet 'ฐานข้อมูลสรุปการใช้ปุ๋ย'")
    out.append(f"-- {len(crops)} crops · {len(rows)} recommendations")
    out.append("-- =============================================================================")
    out.append("")

    out.append("-- 1. Insert crops (with correct crop_type)")
    for name in crops:
        ctype = crop_type_of(name)
        out.append(
            f"INSERT INTO public.crops (name, crop_type_id) "
            f"SELECT {esc(name)}, id FROM public.crop_types WHERE name = {esc(ctype)} "
            f"ON CONFLICT (name, crop_type_id) DO NOTHING;"
        )
    out.append("")

    # 2. Insert recommendations referencing crops by name
    out.append("-- 2. Insert recommendations")
    out.append("--    ล้างของเดิมก่อน เพื่อให้รันไฟล์นี้ซ้ำได้โดยไม่เกิดข้อมูลซ้ำ")
    out.append("DELETE FROM public.fertilizer_recommendations;")
    for r in rows:
        if r['nutrient'] == 'OM':
            om_min, om_max = r['v_min'], r['v_max']
            p_min = p_max = k_min = k_max = 'NULL'
        elif r['nutrient'] == 'P':
            om_min = om_max = 'NULL'
            p_min, p_max = r['v_min'], r['v_max']
            k_min = k_max = 'NULL'
        else:  # K
            om_min = om_max = p_min = p_max = 'NULL'
            k_min, k_max = r['v_min'], r['v_max']

        def numstr(v):
            return str(v) if v is not None and v != 'NULL' else 'NULL'

        ctype = crop_type_of(r['crop'])
        out.append(
            f"INSERT INTO public.fertilizer_recommendations "
            f"(crop_id, mode, om_min, om_max, p_min, p_max, k_min, k_max, target_n, target_p2o5, target_k2o, target_unit) "
            f"SELECT c.id, '100%', "
            f"{numstr(om_min)}, {numstr(om_max)}, "
            f"{numstr(p_min)}, {numstr(p_max)}, "
            f"{numstr(k_min)}, {numstr(k_max)}, "
            f"{numstr(r['n'])}, {numstr(r['p'])}, {numstr(r['k'])}, "
            f"{esc(r['unit'])} "
            f"FROM public.crops c JOIN public.crop_types ct ON c.crop_type_id = ct.id "
            f"WHERE c.name = {esc(r['crop'])} AND ct.name = {esc(ctype)};"
        )

    print('\n'.join(out))


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print('Usage: python import_orchard_excel.py <excel_path>', file=sys.stderr)
        sys.exit(1)
    main(sys.argv[1])
