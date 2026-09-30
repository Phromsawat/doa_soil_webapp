"use client"

import type { FertilizerFormulaRow } from "@/lib/supabase/fertilizerFormulas"
import { ORGANIC_N_SHARE, type OrganicInput } from "@/lib/fertilizer/stagePlan"

const CUSTOM = "__custom__"

/**
 * เลือกปุ๋ยอินทรีย์จากรายการ (admin เพิ่มได้) หรือกรอกค่าวิเคราะห์ %N-%P2O5-%K2O เอง
 * ไม่ fix ค่าของกรมพัฒนาที่ดิน — ผู้ใช้ที่มีผลวิเคราะห์ปุ๋ยอินทรีย์ของตัวเองกรอกแทนได้
 */
export default function OrganicPicker({
  formulas,
  value,
  selectedId,
  onChange,
}: {
  formulas: FertilizerFormulaRow[] // kind = organic
  value: OrganicInput
  selectedId: string
  onChange: (v: OrganicInput, id: string) => void
}) {
  const isCustom = selectedId === CUSTOM
  const pick = (id: string) => {
    if (id === CUSTOM) {
      onChange({ ...value, name: "ปุ๋ยอินทรีย์ (ค่าวิเคราะห์ที่กรอกเอง)" }, CUSTOM)
      return
    }
    const f = formulas.find((x) => x.id === id)
    if (f) onChange({ name: f.name, n: f.n_percent, p2o5: f.p2o5_percent, k2o: f.k2o_percent }, id)
  }
  const note = formulas.find((f) => f.id === selectedId)?.notes

  const field = (key: "n" | "p2o5" | "k2o", label: string) => (
    <label className="block">
      <span className="text-sm text-gray-600">{label}</span>
      <input
        type="number"
        inputMode="decimal"
        step="any"
        min={0}
        value={Number.isFinite(value[key]) ? value[key] : ""}
        onChange={(e) => onChange({ ...value, [key]: e.target.value === "" ? 0 : Number(e.target.value) }, CUSTOM)}
        disabled={!isCustom}
        className="mt-1 w-full rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-base tabular-nums focus:border-[#1A4D2E] focus:bg-white focus:outline-none disabled:text-gray-500"
      />
    </label>
  )

  return (
    <div className="space-y-3 rounded-xl border border-amber-200 bg-amber-50/50 p-4">
      <p className="text-sm text-gray-700">
        ปุ๋ยอินทรีย์รับไนโตรเจน (N) แทนปุ๋ยเคมี <b>{Math.round(ORGANIC_N_SHARE * 100)}%</b> —
        ปริมาณปุ๋ยอินทรีย์คำนวณจาก %N ของปุ๋ยที่ใช้ ส่วน P₂O₅, K₂O ที่ได้จากปุ๋ยอินทรีย์จะหักออกจากปุ๋ยเคมีให้อัตโนมัติ
      </p>
      <label className="block">
        <span className="text-sm font-semibold text-gray-700">ชนิดปุ๋ยอินทรีย์</span>
        <select
          value={selectedId}
          onChange={(e) => pick(e.target.value)}
          className="mt-1 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-base focus:border-[#1A4D2E] focus:outline-none"
        >
          {formulas.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name} (N {f.n_percent}% · P₂O₅ {f.p2o5_percent}% · K₂O {f.k2o_percent}%)
            </option>
          ))}
          <option value={CUSTOM}>กรอกค่าวิเคราะห์ปุ๋ยอินทรีย์เอง…</option>
        </select>
      </label>
      {note && <p className="text-xs text-amber-700">{note}</p>}
      <div className="grid grid-cols-3 gap-3">
        {field("n", "%N")}
        {field("p2o5", "%P₂O₅")}
        {field("k2o", "%K₂O")}
      </div>
      {!isCustom && <p className="text-xs text-gray-500">เลือก “กรอกค่าวิเคราะห์ปุ๋ยอินทรีย์เอง” เพื่อแก้ตัวเลข</p>}
      {isCustom && !(value.n > 0) && (
        <p className="text-sm text-red-600">กรุณากรอก %N มากกว่า 0 เพื่อคำนวณปริมาณปุ๋ยอินทรีย์</p>
      )}
    </div>
  )
}

export { CUSTOM as ORGANIC_CUSTOM_ID }
