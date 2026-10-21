"""
build_soil_points.py — สร้างจุดค่าดินรายตำบล (soil_points) จาก predict log ของระบบเก่า

    D:\\python\\python.exe scripts\\build_soil_points.py "E:\\DOA_Soil\\ข้อมูลเก่า\\predict_log_20261020141451.xlsx"

ผลลัพธ์: supabase/migrations/043_soil_points_data.sql (ลบชุดเดิมของ source นี้แล้วใส่ใหม่ — รันซ้ำได้)

กติกาการทำความสะอาด (ตกลงกับผู้ใช้ 2026-10-20)
- ข้อมูลไม่มีพิกัด มีแต่ "ตำบล, อำเภอ, จังหวัด, รหัสไปรษณีย์" → จับคู่กับขอบเขตตำบล
  (public/boundaries) แล้ววางจุดที่กลางตำบล — 1 จุดต่อตำบล
- แถวที่ไม่มีที่อยู่ / เป็น "-" "_" / พิมพ์มั่ว / หาตำบลไม่เจอ → ทิ้ง
- ค่า 0 (และค่าติดลบ) = ไม่ได้ตรวจธาตุนั้น (ผู้ใช้ส่วนใหญ่ตรวจทีละธาตุ) → ไม่นำมาคิด
- แถวซ้ำ = ตำบลเดียวกัน + OM/P/K ชุดเดียวกัน (ส่งรูปเดิมซ้ำ) → เก็บแถวแรก
- ค่าของตำบล = มัธยฐานของแต่ละธาตุแยกกัน (คำนวณในฐานข้อมูล รวมกับรายการ AI ใหม่ในระบบ)
- ไม่มีข้อมูลส่วนบุคคล (ชื่อ/เบอร์โทร/รหัสตัวอย่าง) ในผลลัพธ์
"""

import collections
import datetime as dt
import json
import re
import sys
from pathlib import Path

import openpyxl
from shapely.geometry import shape
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[1]
SOURCE = "predict_log_20261020"
OUT = ROOT / "supabase" / "migrations" / "043_soil_samples_data.sql"
CENTERS = ROOT / "src" / "lib" / "soil" / "subdistrictCenters.json"
BOUNDARIES = ROOT / "public" / "boundaries"

PLACEHOLDER = re.compile(r"^[\s\-_.ๅ0-9]*$")
PREFIX = re.compile(r"^(ต\.|ตำบล|แขวง|อ\.|อำเภอ|เขต|จ\.|จังหวัด)\s*")


def norm(s) -> str:
    s = PREFIX.sub("", str(s or "").strip())
    s = s.replace(" ", "")
    return {"กรุงเทพฯ": "กรุงเทพมหานคร", "กทม": "กรุงเทพมหานคร", "กทม.": "กรุงเทพมหานคร"}.get(s, s)


def load_subdistricts():
    idx = json.load(open(BOUNDARIES / "search-index.json", encoding="utf-8"))
    feats = json.load(open(BOUNDARIES / "subdistrict.geojson", encoding="utf-8"))["features"]
    subs = [e for e in idx if e.get("t") == "sub"]
    by3, by_zip, by_prov, by_amp = {}, collections.defaultdict(list), collections.defaultdict(list), collections.defaultdict(list)
    for e in subs:
        t, a, p = norm(e["nth"]), norm(e["dth"]), norm(e["pth"])
        by3[(t, a, p)] = e
        by_zip[(t, e.get("zip"))].append(e)
        by_prov[(t, p)].append(e)
        by_amp[(t, a)].append(e)
    return feats, by3, by_zip, by_prov, by_amp


def match(loc, tables):
    _, by3, by_zip, by_prov, by_amp = tables
    parts = [x.strip() for x in str(loc).split(",")]
    t, a, p, z = (parts + ["", "", "", ""])[:4]
    if PLACEHOLDER.match(t) or not re.search(r"[ก-๙]", t):
        return None
    t, a, p = norm(t), norm(a), norm(p)
    if (t, a, p) in by3:
        return by3[(t, a, p)]
    # ชื่ออำเภอ/จังหวัดสะกดไม่ตรงหรือแบ่งเขตใหม่ — ใช้ตำบล+รหัสไปรษณีย์ / ตำบล+จังหวัด / ตำบล+อำเภอ ถ้าได้ตำบลเดียว
    for cand in (by_zip.get((t, z.strip())), by_prov.get((t, p)), by_amp.get((t, a))):
        if cand and len(cand) == 1:
            return cand[0]
    return None


def value(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return round(x, 2) if x > 0 else None


def point_in(geom):
    c = geom.centroid
    return c if geom.contains(c) else geom.representative_point()


def sql_num(v):
    return "null" if v is None else repr(round(v, 2))


def sql_text(s):
    return "'" + str(s).replace("'", "''") + "'"


def main(xlsx: str):
    tables = load_subdistricts()
    feats = tables[0]
    rows = list(openpyxl.load_workbook(xlsx, read_only=True, data_only=True).worksheets[0].iter_rows(min_row=4, values_only=True))

    stats = collections.Counter(total=len(rows))
    seen = set()
    groups = collections.defaultdict(list)  # sub index -> [(date, om, p, k)]
    for r in rows:
        when_s, _code, om, p, k, _phone, loc = r[:7]
        if not loc:
            stats["ไม่มีที่อยู่"] += 1
            continue
        e = match(loc, tables)
        if not e:
            stats["หาตำบลไม่เจอ/ที่อยู่มั่ว"] += 1
            continue
        om, p, k = value(om), value(p), value(k)
        if om is None and p is None and k is None:
            stats["ไม่มีค่าธาตุใดเลย"] += 1
            continue
        key = (e["i"], om, p, k)
        if key in seen:
            stats["ซ้ำ"] += 1
            continue
        seen.add(key)
        try:
            when = dt.datetime.strptime(str(when_s).strip(), "%d/%m/%Y %H:%M").date()
        except ValueError:
            when = None
        groups[e["i"]].append((when, om, p, k))
        stats["ใช้ได้"] += 1

    # ---------------------------------------------------------------- ตัวอย่างรายแถว
    samples = []
    for i, items in groups.items():
        props = feats[i]["properties"]
        for when, om, p, k in items:
            samples.append((props["P_NAME_T"], props["A_NAME_T"], props["T_NAME_T"], om, p, k, when))
    samples.sort(key=lambda x: (x[0], x[1], x[2], x[6] or dt.date.min))

    lines = [
        "-- 043_soil_samples_data.sql — สร้างโดย scripts/build_soil_points.py (อย่าแก้มือ — รันสคริปต์ใหม่แทน)",
        f"-- ที่มา: {Path(xlsx).name} · {len(samples)} ตัวอย่างที่ใช้ได้ ใน {len({x[:3] for x in samples})} ตำบล (ทั้งหมด {stats['total']} แถว)",
        "-- ตัดทิ้ง: " + " · ".join(f"{k} {v}" for k, v in stats.items() if k not in ("total", "ใช้ได้")),
        "-- ต้องรัน 042_soil_points.sql ก่อน",
        "",
        "begin;",
        f"delete from public.soil_samples where source = {sql_text(SOURCE)};",
    ]
    CHUNK = 1000
    for c in range(0, len(samples), CHUNK):
        lines.append("insert into public.soil_samples (source, province, district, subdistrict, om, p, k, sampled_on) values")
        lines.append(",\n".join(
            "  (" + ", ".join([
                sql_text(SOURCE), sql_text(pv), sql_text(am), sql_text(tb),
                sql_num(om), sql_num(p), sql_num(k),
                sql_text(when.isoformat()) if when else "null",
            ]) + ")"
            for pv, am, tb, om, p, k, when in samples[c:c + CHUNK]
        ) + ";")
    lines += ["commit;", ""]
    OUT.write_text("\n".join(lines), encoding="utf-8")

    # ---------------------------------------------------------------- จุดกลางตำบล (ทุกตำบล)
    # ตำบลเดียวกันบางแห่งแยกเป็นหลาย feature (เกาะ ฯลฯ) — รวมรูปก่อนหาจุด
    parts = collections.defaultdict(list)
    for f in feats:
        pr = f["properties"]
        parts[(pr["P_NAME_T"], pr["A_NAME_T"], pr["T_NAME_T"])].append(shape(f["geometry"]))
    centers = {}
    for (pv, am, tb), geoms in sorted(parts.items()):
        pt = point_in(unary_union(geoms) if len(geoms) > 1 else geoms[0])
        centers.setdefault(pv, {}).setdefault(am, {})[tb] = [round(pt.y, 5), round(pt.x, 5)]
    CENTERS.write_text(json.dumps(centers, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    areas = {x[:3] for x in samples}
    print(f"samples: {len(samples)} in {len(areas)} subdistricts · om {sum(1 for x in samples if x[3])} · p {sum(1 for x in samples if x[4])} · k {sum(1 for x in samples if x[5])}")
    print("rows:", dict(stats))
    print("wrote", OUT, f"{OUT.stat().st_size // 1024} KB")
    print("wrote", CENTERS, f"{CENTERS.stat().st_size // 1024} KB · {sum(len(t) for d in centers.values() for t in d.values())} subdistricts")


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    main(sys.argv[1])
