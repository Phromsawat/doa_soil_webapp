"""
ดึง ZIP code จาก earthchie/jquery.Thailand.js dataset
แล้ว merge เข้า public/boundaries/search-index.json
"""
import json, urllib.request, sys

DATASET_URL = "https://raw.githubusercontent.com/earthchie/jquery.Thailand.js/master/jquery.Thailand.js/database/raw_database/raw_database.json"
INDEX_PATH = "public/boundaries/search-index.json"

print("loading zip dataset from /tmp/thai_zip_raw.json ...")
with open("/tmp/thai_zip_raw.json", encoding="utf-8") as f:
    raw = json.load(f)

# raw entries: {"d": "ตำบล", "a": "อำเภอ", "p": "จังหวัด", "post": 10500}
# build lookup: (ตำบล, อำเภอ, จังหวัด) → zip
zip_lookup: dict[tuple, str] = {}
for item in raw:
    d = item.get("district", "")
    a = item.get("amphoe", "")
    p = item.get("province", "")
    post = str(item.get("zipcode", ""))
    if d and a and p and post and len(post) == 5:
        zip_lookup[(d, a, p)] = post

print(f"zip dataset: {len(zip_lookup)} entries")

print("loading search-index.json...")
with open(INDEX_PATH, encoding="utf-8") as f:
    index = json.load(f)

matched = 0
unmatched = 0
unmatched_samples = []

for entry in index:
    if entry.get("t") != "sub":
        continue
    nth = entry.get("nth", "")
    dth = entry.get("dth", "")
    pth = entry.get("pth", "")

    # exact match
    key = (nth, dth, pth)
    zip_code = zip_lookup.get(key)

    # fallback: dth may have prefix like "กิ่งอำเภอ"
    if not zip_code:
        for prefix in ["กิ่งอำเภอ", "อำเภอ", "เขต"]:
            if dth.startswith(prefix):
                stripped = dth[len(prefix):]
                zip_code = zip_lookup.get((nth, stripped, pth))
                if zip_code:
                    break

    if zip_code:
        entry["zip"] = zip_code
        matched += 1
    else:
        unmatched += 1
        if len(unmatched_samples) < 10:
            unmatched_samples.append(f"{nth} / {dth} / {pth}")

print(f"matched: {matched} / unmatched: {unmatched}")
if unmatched_samples:
    print("unmatched samples:")
    for s in unmatched_samples:
        print(" ", s)

print("writing updated search-index.json...")
with open(INDEX_PATH, "w", encoding="utf-8") as f:
    json.dump(index, f, ensure_ascii=False, separators=(",", ":"))

print("done")
