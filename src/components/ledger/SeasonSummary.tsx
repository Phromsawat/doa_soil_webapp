"use client"

import { useMemo } from "react"
import { formatBaht, type EntryKind } from "@/lib/ledger/categories"
import type { Entry, Season } from "@/lib/supabase/ledger"

function total(entries: Entry[], kind: EntryKind): number {
  return entries.reduce((sum, e) => (e.kind === kind ? sum + e.amount : sum), 0)
}

function byCategory(entries: Entry[], kind: EntryKind): { name: string; amount: number }[] {
  const map = new Map<string, number>()
  for (const e of entries) {
    if (e.kind !== kind) continue
    map.set(e.category, (map.get(e.category) ?? 0) + e.amount)
  }
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
}

function Bars({
  rows,
  color,
  empty,
}: {
  rows: { name: string; amount: number }[]
  color: string
  empty: string
}) {
  if (rows.length === 0) {
    return <p className="py-2 text-center text-xs text-gray-400">{empty}</p>
  }
  const max = Math.max(...rows.map((r) => r.amount)) || 1
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-gray-600">{r.name}</span>
            <span className="shrink-0 font-semibold text-gray-800">{formatBaht(r.amount)}</span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(3, (r.amount / max) * 100)}%`, background: color }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/**
 * สรุปของรอบเพาะปลูก — ยอดรวม 3 ตัว + ผลผลิต/ต้นทุนต่อกิโล + แยกตามหมวด
 */
export default function SeasonSummary({
  season,
  entries,
}: {
  season: Season
  entries: Entry[]
}) {
  const s = useMemo(() => {
    const income = total(entries, "income")
    const expense = total(entries, "expense")
    const yieldKg = season.yield_kg ?? null
    return {
      income,
      expense,
      net: income - expense,
      yieldKg,
      costPerKg: yieldKg && yieldKg > 0 ? expense / yieldKg : null,
      pricePerKg: yieldKg && yieldKg > 0 ? income / yieldKg : null,
      incomeRows: byCategory(entries, "income"),
      expenseRows: byCategory(entries, "expense"),
    }
  }, [entries, season.yield_kg])

  const profit = s.net >= 0

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
          <p className="text-[11px] text-emerald-700">รายรับรวม</p>
          <p className="mt-0.5 text-lg font-bold text-emerald-700">{formatBaht(s.income)}</p>
          <p className="text-[10px] text-emerald-600/70">บาท</p>
        </div>
        <div className="rounded-xl border border-red-100 bg-red-50/60 p-3">
          <p className="text-[11px] text-red-600">รายจ่ายรวม</p>
          <p className="mt-0.5 text-lg font-bold text-red-600">{formatBaht(s.expense)}</p>
          <p className="text-[10px] text-red-500/70">บาท</p>
        </div>
      </div>

      <div className="rounded-xl bg-[#1A2F2A] p-4 text-white">
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-white/60">{profit ? "กำไรสุทธิ" : "ขาดทุนสุทธิ"}</span>
          <span className={`text-2xl font-bold ${profit ? "text-accent" : "text-orange-300"}`}>
            {profit ? "" : "-"}
            {formatBaht(Math.abs(s.net))}
            <span className="ml-1 text-xs font-normal text-white/60">บาท</span>
          </span>
        </div>

        {s.yieldKg != null && s.yieldKg > 0 && (
          <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/10 pt-3 text-center">
            <div>
              <p className="text-[10px] text-white/50">ผลผลิต</p>
              <p className="text-sm font-medium">{formatBaht(s.yieldKg)} กก.</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50">ต้นทุน/กก.</p>
              <p className="text-sm font-medium">{s.costPerKg ? formatBaht(s.costPerKg) : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/50">รายรับ/กก.</p>
              <p className="text-sm font-medium">{s.pricePerKg ? formatBaht(s.pricePerKg) : "—"}</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="mb-2 text-xs font-semibold text-emerald-700">รายรับตามหมวด</p>
          <Bars rows={s.incomeRows} color="#4CAF7D" empty="ยังไม่มีรายรับในรอบนี้" />
        </div>
        <div className="rounded-xl border border-gray-200 p-3">
          <p className="mb-2 text-xs font-semibold text-red-600">รายจ่ายตามหมวด</p>
          <Bars rows={s.expenseRows} color="#EF6B6B" empty="ยังไม่มีรายจ่ายในรอบนี้" />
        </div>
      </div>
    </div>
  )
}
