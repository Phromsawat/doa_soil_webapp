"""
extract_soil_grid.py
--------------------
อ่าน GeoTIFF 3 ไฟล์ (OM / P / K จาก ArcGIS IDW) แล้วสร้าง 2 อย่าง:

  1) public/soil-maps/{om,p,k}_level.png
     - ภาพ overlay สำหรับวางทับ Leaflet (ImageOverlay)
     - ระบายสีตาม "ระดับ" (ต่ำ=แดง, ปานกลาง=ส้ม, สูง=เขียว) โทนพาสเทล
     - เซลล์ nodata = โปร่งใส

  2) supabase/migrations/003_soil_grid.sql
     - ตาราง soil_grid(grid_row, grid_col, om, p, k) + ค่าเป็น INSERT
     - ใช้สำหรับ "คลิกจุด -> ได้ค่า OM/P/K" (PK lookup ที่ (grid_row, grid_col))

เกณฑ์ระดับใช้ตามตารางมาตรฐานกรมพัฒนาที่ดิน (ที่ผู้ใช้ยืนยัน):
    OM : ต่ำ <1.5   | ปานกลาง 1.5-3.5 | สูง >3.5
    P  : ต่ำ <10    | ปานกลาง 10-25   | สูง >25   (mg/kg)
    K  : ต่ำ <60    | ปานกลาง 60-90   | สูง >90   (mg/kg)

หมายเหตุหน่วย P/K: ค่าใน raster P/K ปัจจุบันสเกลสูงผิดปกติ (สูงสุด ~595/579)
ถ้าภายหลังยืนยันว่าต้องแปลงหน่วย ให้แก้ที่ฟังก์ชัน TRANSFORM ด้านล่างจุดเดียว
แล้วรันสคริปต์นี้ใหม่ -> PNG + SQL อัปเดตทั้งหมด
"""

import os
import importlib.util

# แก้ปัญหา PROJ ชนกัน: เครื่องนี้ PROJ_LIB ชี้ไป PostgreSQL/PostGIS (proj.db เก่า)
# บังคับให้ใช้ proj.db ที่มากับ rasterio ก่อน import rasterio
_spec = importlib.util.find_spec("rasterio")
if _spec and _spec.origin:
    _proj = os.path.join(os.path.dirname(_spec.origin), "proj_data")
    if os.path.exists(os.path.join(_proj, "proj.db")):
        os.environ["PROJ_LIB"] = _proj
        os.environ["PROJ_DATA"] = _proj

import numpy as np
import rasterio
from rasterio.warp import calculate_default_transform, reproject, Resampling
from PIL import Image

# ---------------------------------------------------------------- paths
HERE = os.path.dirname(os.path.abspath(__file__))
PROJECT = os.path.abspath(os.path.join(HERE, ".."))
TIFF_DIR = r"E:\DOA_Soil\OMPK_Test_MAP"
SUM_TIFF = r"E:\DOA_Soil\TH_SUM\TH_SUM.tif"   # คะแนนความอุดมสมบูรณ์รวม (3-9)
PNG_DIR = os.path.join(PROJECT, "public", "soil-maps")
SQL_PATH = os.path.join(PROJECT, "supabase", "migrations", "003_soil_grid.sql")

TIFFS = {"om": "TH_OM.tif", "p": "TH_P.tif", "k": "TH_K.tif"}

# ---------------------------------------------------------------- colors (pastel)
COLORS = {
    "low":    (242, 168, 161),   # แดงพาสเทล
    "medium": (248, 206, 151),   # ส้มพาสเทล
    "high":   (168, 213, 162),   # เขียวพาสเทล
}

# ---------------------------------------------------------------- unit transform hook
# ตอนนี้เป็น identity (ใช้ค่าดิบ). ถ้ายืนยันว่า P/K ต้องแปลงหน่วย/แปลงกลับจาก log
# ให้แก้เฉพาะฟังก์ชันของตัวนั้น เช่น  return np.expm1(a)  หรือ  return a / 10.0
def TRANSFORM(nutrient, a):
    if nutrient == "om":
        return a
    if nutrient == "p":
        return a          # <-- เสียบสูตรแปลงหน่วย P ที่นี่เมื่อยืนยันหน่วยแล้ว
    if nutrient == "k":
        return a          # <-- เสียบสูตรแปลงหน่วย K ที่นี่เมื่อยืนยันหน่วยแล้ว
    return a

# ---------------------------------------------------------------- classification
# คืน array ของ level code: 0=low, 1=medium, 2=high
THRESHOLDS = {          # (t_low, t_high): low if v<t_low ; high if v>t_high ; else medium
    "om": (1.5, 3.5),
    "p":  (10.0, 25.0),
    "k":  (60.0, 90.0),
    "sum": (5.0, 6.0),  # คะแนนรวม 3-9: ต่ำ 3-4 / ปานกลาง 5-6 / สูง 7-9
}

def classify(nutrient, a):
    t_low, t_high = THRESHOLDS[nutrient]
    lvl = np.full(a.shape, 1, dtype=np.int8)   # default medium
    lvl[a < t_low] = 0
    lvl[a > t_high] = 2
    return lvl

LEVEL_NAMES = ["low", "medium", "high"]

# ---------------------------------------------------------------- load rasters
def load():
    data = {}
    ref_transform = None
    ref_shape = None
    ref_crs = None
    ref_nodata = None
    valid = None
    for key, fname in TIFFS.items():
        path = os.path.join(TIFF_DIR, fname)
        with rasterio.open(path) as ds:
            arr = ds.read(1).astype(np.float64)
            nodata = ds.nodata
            t = ds.transform
            shape = (ds.height, ds.width)
            crs = ds.crs
        if ref_crs is None:
            ref_crs, ref_nodata = crs, nodata
        if ref_transform is None:
            ref_transform, ref_shape = t, shape
        else:
            assert shape == ref_shape, f"{fname}: shape mismatch"
            assert t.almost_equals(ref_transform), f"{fname}: transform mismatch"
        m = np.isfinite(arr)
        if nodata is not None:
            m &= (arr != nodata)
        # ค่าลบสุดโต่ง = nodata sentinel
        m &= (arr > -1e30)
        valid = m if valid is None else (valid & m)
        data[key] = arr
    return data, ref_transform, ref_shape, valid, ref_crs, ref_nodata

def main():
    os.makedirs(PNG_DIR, exist_ok=True)
    data, t, (H, W), valid, src_crs, src_nodata = load()
    x0, y0, px = t.c, t.f, t.a
    print(f"grid {W}x{H}  origin=({x0:.9f},{y0:.9f})  px={px}  valid={int(valid.sum())}")

    # apply transform hook
    vals = {k: TRANSFORM(k, data[k]) for k in TIFFS}

    # ---- 1) PNG overlays (reproject -> Web Mercator EPSG:3857) ----
    # Leaflet วางภาพเชิงเส้นบน Web Mercator เพราะงั้นต้อง warp ก่อนภาพถึงจะทับ basemap ตรง
    dst_crs = "EPSG:3857"
    left, top = x0, y0
    right, bottom = x0 + W * px, y0 - H * px
    dst_transform, dst_w, dst_h = calculate_default_transform(
        src_crs, dst_crs, W, H, left, bottom, right, top
    )
    for k in TIFFS:
        # warp ค่าดิบไป mercator (nearest = คงค่าเซลล์เดิม ไม่สร้างค่าใหม่)
        src = np.where(valid, vals[k], np.nan).astype(np.float32)
        dst = np.full((dst_h, dst_w), np.nan, dtype=np.float32)
        reproject(
            source=src,
            destination=dst,
            src_transform=t,
            src_crs=src_crs,
            src_nodata=np.nan,
            dst_transform=dst_transform,
            dst_crs=dst_crs,
            dst_nodata=np.nan,
            resampling=Resampling.nearest,
        )
        valid_m = np.isfinite(dst)
        lvl = classify(k, np.nan_to_num(dst, nan=-1e30))
        rgba = np.zeros((dst_h, dst_w, 4), dtype=np.uint8)
        for code, name in enumerate(LEVEL_NAMES):
            mask = valid_m & (lvl == code)
            r, g, b = COLORS[name]
            rgba[mask] = (r, g, b, 255)
        img = Image.fromarray(rgba, mode="RGBA")
        out = os.path.join(PNG_DIR, f"{k}_level.png")
        img.save(out)
        cnt = {name: int((valid_m & (lvl == c)).sum()) for c, name in enumerate(LEVEL_NAMES)}
        print(f"  {k}_level.png  {dst_w}x{dst_h} (mercator)  low={cnt['low']} medium={cnt['medium']} high={cnt['high']}")

    # ---- 1b) SUM overlay (ความอุดมสมบูรณ์รวม 3-9 จาก TH_SUM.tif, grid เดียวกัน) ----
    with rasterio.open(SUM_TIFF) as sds:
        sarr = sds.read(1).astype(np.float64)
        snod = sds.nodata
        st, scrs = sds.transform, sds.crs
    ssrc = np.where((sarr >= 0) & (sarr < 1e6) & (sarr != snod), sarr, np.nan).astype(np.float32)
    sdst = np.full((dst_h, dst_w), np.nan, dtype=np.float32)
    reproject(
        source=ssrc, destination=sdst,
        src_transform=st, src_crs=scrs, src_nodata=np.nan,
        dst_transform=dst_transform, dst_crs=dst_crs, dst_nodata=np.nan,
        resampling=Resampling.nearest,
    )
    svalid = np.isfinite(sdst)
    slvl = classify("sum", np.nan_to_num(sdst, nan=-1e30))
    srgba = np.zeros((dst_h, dst_w, 4), dtype=np.uint8)
    for code, name in enumerate(LEVEL_NAMES):
        mask = svalid & (slvl == code)
        r, g, b = COLORS[name]
        srgba[mask] = (r, g, b, 255)
    Image.fromarray(srgba, mode="RGBA").save(os.path.join(PNG_DIR, "sum_level.png"))
    scnt = {name: int((svalid & (slvl == c)).sum()) for c, name in enumerate(LEVEL_NAMES)}
    print(f"  sum_level.png  {dst_w}x{dst_h} (mercator)  low={scnt['low']} medium={scnt['medium']} high={scnt['high']}")

    # ---- 2) SQL migration ----
    rows_idx = np.argwhere(valid)   # (row, col) pairs
    with open(SQL_PATH, "w", encoding="utf-8") as f:
        f.write("-- 003_soil_grid.sql\n")
        f.write("-- ตาราง lookup ค่าดิน OM/P/K ราย grid cell (0.05 องศา, WGS84)\n")
        f.write(f"-- grid {W}x{H}  origin_left={x0:.9f}  origin_top={y0:.9f}  px={px}\n")
        f.write(f"-- valid cells = {len(rows_idx)}\n")
        f.write("-- คลิกจุด: grid_col=floor((lng-origin_left)/px), grid_row=floor((origin_top-lat)/px)\n\n")
        f.write("drop table if exists public.soil_grid;\n")
        f.write("create table public.soil_grid (\n")
        f.write("  grid_row smallint not null,\n")
        f.write("  grid_col smallint not null,\n")
        f.write("  om real,\n")
        f.write("  p  real,\n")
        f.write("  k  real,\n")
        f.write("  primary key (grid_row, grid_col)\n")
        f.write(");\n\n")
        f.write("alter table public.soil_grid enable row level security;\n")
        f.write('create policy "soil_grid: read for all" on public.soil_grid for select using (true);\n')
        f.write("-- table-level GRANT (Supabase ต้องมีทั้ง RLS policy + GRANT)\n")
        f.write("grant select on public.soil_grid to anon, authenticated;\n\n")

        BATCH = 1000
        buf = []
        def flush():
            if not buf:
                return
            f.write("insert into public.soil_grid (grid_row, grid_col, om, p, k) values\n")
            f.write(",\n".join(buf))
            f.write(";\n")
            buf.clear()

        for (r, c) in rows_idx:
            om = vals["om"][r, c]
            p = vals["p"][r, c]
            kk = vals["k"][r, c]
            buf.append(f"({int(r)},{int(c)},{om:.4f},{p:.4f},{kk:.4f})")
            if len(buf) >= BATCH:
                flush()
        flush()
    size_kb = os.path.getsize(SQL_PATH) / 1024
    print(f"  003_soil_grid.sql  rows={len(rows_idx)}  size={size_kb:.0f}KB")
    # ---- 3) print constants for TS ----
    print("\n// ---- paste into src/lib/soil/grid.ts ----")
    print(f"export const GRID = {{ x0: {x0}, y0: {y0}, px: {px}, w: {W}, h: {H} }} as const")

if __name__ == "__main__":
    main()
