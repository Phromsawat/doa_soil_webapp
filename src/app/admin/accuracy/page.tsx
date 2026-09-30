"use client"

import { useEffect, useMemo, useState } from "react"
import { Target, Loader2, Save, Upload } from "lucide-react"
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer,
} from "recharts"
import { adminListModelRecords, adminSetLabValues } from "@/lib/supabase/admin"
import { classify } from "@/lib/soil/grid"

// เทียบค่าที่โมเดลทำนาย (จากรูปแผ่นทดสอบ) กับผลแล็บ เพื่อดูความแม่นยำของโมเดล
//   แหล่งข้อมูล 1: รายการที่วิเคราะห์ด้วย AI ในระบบ + ค่าแล็บที่ admin กรอก (บันทึกลง analyses.lab_*)
//   แหล่งข้อมูล 2: วาง CSV จากการทดลองภายนอก (ไม่บันทึก ใช้คำนวณในหน้าเท่านั้น)

type Key = "om" | "p" | "k"
const NUTRIENTS: { key: Key; label: string; unit: string }[] = [
  { key: "om", label: "อินทรียวัตถุ (OM)", unit: "%" },
  { key: "p", label: "ฟอสฟอรัส (P)", unit: "มก./กก." },
  { key: "k", label: "โพแทสเซียม (K)", unit: "มก./กก." },
]

interface Pair {
  id: string
  label: string
  model: Record<Key, number | null>
  lab: Record<Key, number | null>
}

type Rec = Awaited<ReturnType<typeof adminListModelRecords>>[number]

function metrics(pairs: { m: number; l: number }[], key: Key) {
  const n = pairs.length
  if (n === 0) return null
  const err = pairs.map((p) => p.m - p.l)
  const mae = err.reduce((s, e) => s + Math.abs(e), 0) / n
  const rmse = Math.sqrt(err.reduce((s, e) => s + e * e, 0) / n)
  const bias = err.reduce((s, e) => s + e, 0) / n
  const nz = pairs.filter((p) => p.l !== 0)
  const mape = nz.length ? (nz.reduce((s, p) => s + Math.abs((p.m - p.l) / p.l), 0) / nz.length) * 100 : null
  const mean = pairs.reduce((s, p) => s + p.l, 0) / n
  const ssTot = pairs.reduce((s, p) => s + (p.l - mean) ** 2, 0)
  const ssRes = err.reduce((s, e) => s + e * e, 0)
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : null
  // ระดับ ต่ำ/ปานกลาง/สูง ตรงกันไหม (เกณฑ์เดียวกับแผนที่ดิน)
  const agree = pairs.filter((p) => classify(key, p.m) === classify(key, p.l)).length / n * 100
  return { n, mae, rmse, bias, mape, r2, agree }
}

// ปัดขอบแกนเป็นเลขกลม (1, 2, 5 x 10^n)
function niceMax(v: number) {
  const p = 10 ** Math.floor(Math.log10(v))
  return ([1, 2, 5, 10].find((m) => m * p >= v) ?? 10) * p
}

const f = (v: number | null | undefined, d = 2) =>
  v == null ? "—" : v.toLocaleString("th-TH", { maximumFractionDigits: d, minimumFractionDigits: d })

export default function AccuracyPage() {
  const [records, setRecords] = useState<Rec[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [csv, setCsv] = useState("")
  const [csvPairs, setCsvPairs] = useState<Pair[]>([])

  useEffect(() => {
    adminListModelRecords()
      .then(setRecords)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  const val = (r: Rec, col: string) => {
    const e = edits[r.id]?.[col]
    if (e !== undefined) return e
    const v = (r as Record<string, unknown>)[col]
    return v == null ? "" : String(v)
  }
  const numOrNull = (s: string) => (s.trim() === "" || isNaN(Number(s)) ? null : Number(s))

  async function saveRow(r: Rec) {
    setSavingId(r.id)
    try {
      const lab = {
        lab_om: numOrNull(val(r, "lab_om")),
        lab_p: numOrNull(val(r, "lab_p")),
        lab_k: numOrNull(val(r, "lab_k")),
        lab_ph: numOrNull(val(r, "lab_ph")),
      }
      await adminSetLabValues(r.id, lab)
      setRecords((prev) => prev.map((x) => (x.id === r.id ? { ...x, ...lab } : x)))
      setEdits((prev) => { const n = { ...prev }; delete n[r.id]; return n })
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
    } finally {
      setSavingId(null)
    }
  }

  // CSV: sample,om_model,p_model,k_model,om_lab,p_lab,k_lab (มีหัวตารางหรือไม่ก็ได้)
  function parseCsv() {
    const out: Pair[] = []
    for (const [i, line] of csv.split(/\r?\n/).entries()) {
      const c = line.split(/[,\t]/).map((s) => s.trim())
      if (c.length < 7 || isNaN(Number(c[1]))) continue
      const n = (s: string) => (s === "" || isNaN(Number(s)) ? null : Number(s))
      out.push({
        id: `csv-${i}`,
        label: c[0] || `แถว ${i + 1}`,
        model: { om: n(c[1]), p: n(c[2]), k: n(c[3]) },
        lab: { om: n(c[4]), p: n(c[5]), k: n(c[6]) },
      })
    }
    setCsvPairs(out)
  }

  const pairs: Pair[] = useMemo(
    () => [
      ...records.map((r) => ({
        id: r.id,
        label: r.farmer_name || r.province || String(r.id).slice(0, 8),
        model: { om: r.om_value, p: r.p_value, k: r.k_value },
        lab: { om: r.lab_om, p: r.lab_p, k: r.lab_k },
      })),
      ...csvPairs,
    ],
    [records, csvPairs]
  )

  const byKey = (key: Key) =>
    pairs
      .filter((p) => p.model[key] != null && p.lab[key] != null)
      .map((p) => ({ m: Number(p.model[key]), l: Number(p.lab[key]), label: p.label }))

  const input = "w-20 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-right text-sm tabular-nums focus:border-[#1A4D2E] focus:bg-white focus:outline-none"

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
          <Target className="h-6 w-6 text-[#1A4D2E]" /> ความแม่นยำของโมเดล
        </h1>
        <p className="mt-1 text-sm text-gray-500">เทียบค่าที่โมเดลทำนายจากรูปแผ่นทดสอบ กับผลวิเคราะห์จากห้องปฏิบัติการ</p>
      </div>

      {/* สรุปตัวชี้วัด */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {NUTRIENTS.map(({ key, label, unit }) => {
          const data = byKey(key)
          const m = metrics(data, key)
          const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.m, d.l])))
          return (
            <div key={key} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">{label}</h2>
              <p className="text-xs text-gray-500">จำนวนคู่ข้อมูล {m?.n ?? 0} · หน่วย {unit}</p>
              {m ? (
                <>
                  <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
                    {[
                      ["MAE", f(m.mae)],
                      ["RMSE", f(m.rmse)],
                      ["R²", f(m.r2)],
                      ["MAPE", m.mape == null ? "—" : `${f(m.mape, 1)}%`],
                      ["Bias", f(m.bias)],
                      ["ระดับตรงกัน", `${f(m.agree, 0)}%`],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-lg bg-gray-50 py-2">
                        <dt className="text-[11px] font-semibold text-gray-500">{k}</dt>
                        <dd className="text-base font-bold tabular-nums text-gray-900">{v}</dd>
                      </div>
                    ))}
                  </dl>
                  <div className="mt-4 h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart margin={{ top: 8, right: 8, bottom: 20, left: 0 }}>
                        <CartesianGrid stroke="#eef0ee" />
                        <XAxis type="number" dataKey="l" domain={[0, max]} tick={{ fontSize: 11, fill: "#666" }} tickCount={5} tickFormatter={(v) => f(v, key === "om" ? 1 : 0)}
                          label={{ value: "ผลแล็บ", position: "insideBottom", offset: -12, fontSize: 12, fill: "#666" }} />
                        <YAxis type="number" dataKey="m" domain={[0, max]} tick={{ fontSize: 11, fill: "#666" }} tickCount={5} tickFormatter={(v) => f(v, key === "om" ? 1 : 0)} width={40}
                          label={{ value: "โมเดล", angle: -90, position: "insideLeft", offset: 12, fontSize: 12, fill: "#666" }} />
                        <ReferenceLine segment={[{ x: 0, y: 0 }, { x: max, y: max }]} stroke="#9ca3af" strokeDasharray="4 4" />
                        <Tooltip
                          cursor={{ strokeDasharray: "3 3" }}
                          content={({ payload }) => {
                            const d = payload?.[0]?.payload as { m: number; l: number; label: string } | undefined
                            if (!d) return null
                            return (
                              <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow">
                                <p className="font-semibold text-gray-800">{d.label}</p>
                                <p className="text-gray-600">แล็บ {f(d.l)} · โมเดล {f(d.m)}</p>
                                <p className="text-gray-600">คลาดเคลื่อน {f(d.m - d.l)} {unit}</p>
                              </div>
                            )
                          }}
                        />
                        <ZAxis range={[70, 70]} />
                        <Scatter data={data} fill="#1A4D2E" stroke="#fff" strokeWidth={2} shape="circle" isAnimationActive={false} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="text-[11px] text-gray-400">เส้นประ = ทำนายตรงผลแล็บพอดี (y = x)</p>
                </>
              ) : (
                <p className="mt-6 rounded-xl bg-gray-50 p-4 text-center text-sm text-gray-500">ยังไม่มีคู่ข้อมูล — กรอกผลแล็บด้านล่าง หรือวาง CSV</p>
              )}
            </div>
          )
        })}
      </div>

      {/* รายการที่ทำนายด้วย AI + กรอกผลแล็บ */}
      <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-bold text-gray-900">รายการที่วิเคราะห์ด้วย AI — กรอกผลแล็บเพื่อเทียบ</h2>
        </div>
        {loading ? (
          <div className="flex justify-center p-10"><Loader2 className="h-6 w-6 animate-spin text-[#1A4D2E]" /></div>
        ) : error ? (
          <p className="bg-red-50 p-5 text-sm text-red-700">{error}</p>
        ) : records.length === 0 ? (
          <p className="p-8 text-center text-sm text-gray-500">ยังไม่มีรายการที่วิเคราะห์ด้วยรูปภาพ — ใช้การวาง CSV ด้านล่างแทนได้</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left text-xs font-bold text-gray-600">
                <tr>
                  <th className="px-4 py-3">รายการ</th>
                  <th className="px-2 py-3 text-right">OM โมเดล</th>
                  <th className="px-2 py-3 text-right">OM แล็บ</th>
                  <th className="px-2 py-3 text-right">P โมเดล</th>
                  <th className="px-2 py-3 text-right">P แล็บ</th>
                  <th className="px-2 py-3 text-right">K โมเดล</th>
                  <th className="px-2 py-3 text-right">K แล็บ</th>
                  <th className="px-2 py-3 text-right">pH แล็บ</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2">
                      <p className="font-semibold text-gray-800">{r.farmer_name || r.province || String(r.id).slice(0, 8)}</p>
                      <p className="text-[11px] text-gray-400">{new Date(r.created_at).toLocaleDateString("th-TH")}</p>
                    </td>
                    {(["om", "p", "k"] as Key[]).map((k) => (
                      <td key={k} colSpan={2} className="px-2 py-2">
                        <div className="flex items-center justify-end gap-2">
                          <span className="w-14 text-right tabular-nums text-gray-600">{f((r as Record<string, number | null>)[`${k}_value`])}</span>
                          <input className={input} value={val(r, `lab_${k}`)} inputMode="decimal"
                            onChange={(e) => setEdits((p) => ({ ...p, [r.id]: { ...p[r.id], [`lab_${k}`]: e.target.value } }))} />
                        </div>
                      </td>
                    ))}
                    <td className="px-2 py-2 text-right">
                      <input className={input} value={val(r, "lab_ph")} inputMode="decimal"
                        onChange={(e) => setEdits((p) => ({ ...p, [r.id]: { ...p[r.id], lab_ph: e.target.value } }))} />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button type="button" onClick={() => saveRow(r)} disabled={!edits[r.id] || savingId === r.id}
                        className="inline-flex items-center gap-1 rounded-full bg-[#1A4D2E] px-3 h-8 text-xs font-bold text-white disabled:opacity-30">
                        {savingId === r.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} บันทึก
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* วาง CSV */}
      <div className="space-y-3 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">นำเข้าคู่ข้อมูลจาก CSV / Excel</h2>
        <p className="text-sm text-gray-500">
          วางข้อมูล 7 คอลัมน์: <code className="rounded bg-gray-100 px-1">ตัวอย่าง, OM โมเดล, P โมเดล, K โมเดล, OM แล็บ, P แล็บ, K แล็บ</code>{" "}
          (คั่นด้วย comma หรือ tab — copy จาก Excel ได้เลย) ใช้คำนวณในหน้านี้เท่านั้น ไม่บันทึกลงฐานข้อมูล
        </p>
        <textarea value={csv} onChange={(e) => setCsv(e.target.value)} rows={5}
          placeholder={"S01,1.8,12,75,2.1,10,82\nS02,3.2,30,110,2.9,35,98"}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm focus:border-[#1A4D2E] focus:bg-white focus:outline-none" />
        <div className="flex items-center gap-3">
          <button type="button" onClick={parseCsv}
            className="flex h-10 items-center gap-2 rounded-full bg-[#1A4D2E] px-5 text-sm font-bold text-white hover:bg-[#143a22]">
            <Upload className="h-4 w-4" /> คำนวณจากข้อมูลที่วาง
          </button>
          {csvPairs.length > 0 && (
            <>
              <span className="text-sm text-gray-600">นำเข้า {csvPairs.length} แถว</span>
              <button type="button" onClick={() => setCsvPairs([])} className="text-sm text-gray-500 underline">ล้าง</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
