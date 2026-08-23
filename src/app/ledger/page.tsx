"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Loader2, Pencil, Plus, BookOpen } from "lucide-react"
import { useUser } from "@/lib/supabase/useUser"
import { listCrops, type CropOption } from "@/lib/supabase/fertilizer"
import {
  createCustomCategory,
  createEntry,
  createSeason,
  deleteEntry,
  deleteSeason,
  listCustomCategories,
  listEntries,
  listSeasons,
  updateEntry,
  updateSeason,
  type CustomCategory,
  type Entry,
  type Season,
} from "@/lib/supabase/ledger"
import {
  defaultSeasonName,
  formatBaht,
  formatDay,
  KIND_LABEL,
  type EntryKind,
} from "@/lib/ledger/categories"
import SeasonModal from "@/components/ledger/SeasonModal"
import EntryModal from "@/components/ledger/EntryModal"
import SeasonSummary from "@/components/ledger/SeasonSummary"

export default function LedgerPage() {
  const { isAuthenticated, loading: userLoading } = useUser()

  const [seasons, setSeasons] = useState<Season[]>([])
  const [seasonId, setSeasonId] = useState("")
  const [entries, setEntries] = useState<Entry[]>([])
  const [categories, setCategories] = useState<CustomCategory[]>([])
  const [crops, setCrops] = useState<CropOption[]>([])

  const [loading, setLoading] = useState(true)
  const [entriesLoading, setEntriesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [tab, setTab] = useState<EntryKind>("expense")
  const [seasonModal, setSeasonModal] = useState<"new" | "edit" | null>(null)
  const [entryModal, setEntryModal] = useState<Entry | "new" | null>(null)

  const season = seasons.find((s) => s.id === seasonId) ?? null

  // โหลดรอบ + หมวดที่เพิ่มเอง + รายชื่อพืช ครั้งเดียวตอนเข้าหน้า
  useEffect(() => {
    if (userLoading) return
    let cancelled = false
    async function load() {
      if (!isAuthenticated) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const [s, c] = await Promise.all([listSeasons(), listCustomCategories()])
        if (cancelled) return
        setSeasons(s)
        setCategories(c)
        setSeasonId((prev) => prev || s[0]?.id || "")
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setLoading(false)
      }
      listCrops()
        .then((c) => !cancelled && setCrops(c))
        .catch(() => {})
    }
    load()
    return () => {
      cancelled = true
    }
  }, [userLoading, isAuthenticated])

  const reloadEntries = useCallback(async (id: string) => {
    if (!id) {
      setEntries([])
      return
    }
    setEntriesLoading(true)
    try {
      setEntries(await listEntries(id))
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setEntriesLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!seasonId) return
    async function load() {
      await reloadEntries(seasonId)
    }
    load()
  }, [seasonId, reloadEntries])

  // รายการของแท็บที่เปิดอยู่ จัดกลุ่มตามหมวด เรียงหมวดที่ใช้เงินมากสุดขึ้นก่อน
  const groups = useMemo(() => {
    const map = new Map<string, Entry[]>()
    for (const e of entries) {
      if (e.kind !== tab) continue
      const list = map.get(e.category)
      if (list) list.push(e)
      else map.set(e.category, [e])
    }
    return [...map.entries()]
      .map(([category, items]) => ({
        category,
        items,
        total: items.reduce((s, i) => s + i.amount, 0),
      }))
      .sort((a, b) => b.total - a.total)
  }, [entries, tab])

  const tabTotal = groups.reduce((s, g) => s + g.total, 0)

  // ---------------------------------------------------------------- actions

  async function handleSaveSeason(values: Parameters<typeof createSeason>[0]) {
    if (seasonModal === "edit" && season) {
      await updateSeason(season.id, values)
    } else {
      const created = await createSeason(values)
      setSeasonId(created.id)
    }
    setSeasons(await listSeasons())
  }

  async function handleDeleteSeason() {
    if (!season) return
    await deleteSeason(season.id)
    const rest = await listSeasons()
    setSeasons(rest)
    setSeasonId(rest[0]?.id ?? "")
    setEntries([])
  }

  async function handleSaveEntry(values: {
    kind: EntryKind
    category: string
    title: string | null
    amount: number
    happened_on: string
  }) {
    if (entryModal && entryModal !== "new") {
      await updateEntry(entryModal.id, values)
    } else {
      await createEntry({ season_id: seasonId, ...values })
    }
    await reloadEntries(seasonId)
  }

  async function handleDeleteEntry() {
    if (!entryModal || entryModal === "new") return
    await deleteEntry(entryModal.id)
    await reloadEntries(seasonId)
  }

  async function handleCreateCategory(kind: EntryKind, name: string) {
    await createCustomCategory({ kind, name })
    setCategories(await listCustomCategories())
  }

  // ------------------------------------------------------------------ views

  if (userLoading || loading) {
    return (
      <div className="mx-auto flex w-full max-w-[46rem] items-center justify-center gap-2 px-4 py-16 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดสมุดบัญชี…
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <div className="mx-auto w-full max-w-[46rem] px-4 py-10">
        <div className="rounded-2xl border border-gray-100 bg-white p-8 text-center shadow-sm">
          <BookOpen className="mx-auto mb-3 h-8 w-8 text-[#1A4D2E]" />
          <h1 className="mb-1 text-lg font-bold text-gray-800">สมุดบัญชี</h1>
          <p className="mb-5 text-sm text-gray-500">
            บันทึกรายรับรายจ่ายแยกตามรอบเพาะปลูก แล้วดูว่ารอบนี้กำไรหรือขาดทุน
          </p>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-full bg-[#1A4D2E] px-6 text-sm font-medium text-white hover:bg-[#143a22]"
          >
            เข้าสู่ระบบเพื่อเริ่มใช้
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-[46rem] px-4 py-6">
      <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
        <h1 className="mb-5 text-center text-lg font-bold text-gray-800">สมุดบัญชี</h1>

        {error && (
          <p className="mb-4 rounded-xl bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
        )}

        {seasons.length === 0 ? (
          <div className="rounded-xl bg-gray-50 p-8 text-center">
            <p className="mb-1 text-sm font-medium text-gray-700">ยังไม่มีรอบเพาะปลูก</p>
            <p className="mb-5 text-xs text-gray-500">
              สร้างรอบแรกก่อน แล้วค่อยบันทึกรายรับรายจ่ายเข้าไปในรอบนั้น
            </p>
            <button
              type="button"
              onClick={() => setSeasonModal("new")}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#1A4D2E] px-6 text-sm font-medium text-white hover:bg-[#143a22]"
            >
              <Plus className="h-4 w-4" /> สร้างรอบเพาะปลูก
            </button>
          </div>
        ) : (
          <>
            {/* เลือกรอบ */}
            <div className="mb-5">
              <div className="flex items-center gap-2">
                <select
                  value={seasonId}
                  onChange={(e) => setSeasonId(e.target.value)}
                  className="h-11 min-w-0 flex-1 rounded-xl border border-gray-200 bg-gray-50/60 px-3 text-sm font-medium focus:border-[#1A4D2E] focus:bg-white focus:outline-none"
                >
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setSeasonModal("edit")}
                  aria-label="แก้ไขรอบ"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-500 hover:bg-gray-50"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSeasonModal("new")}
                  aria-label="รอบใหม่"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1A4D2E] text-white hover:bg-[#143a22]"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {season && (
                <p className="mt-1.5 text-xs text-gray-400">
                  {[
                    crops.find((c) => c.id === season.crop_id)?.name,
                    `เริ่ม ${formatDay(season.started_on)}`,
                    season.ended_on ? `ถึง ${formatDay(season.ended_on)}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>

            {/* บันทึกรายการก่อน แล้วค่อยสรุปด้านล่าง */}
            <div className="border-t border-gray-100 pt-5">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="inline-flex rounded-full bg-gray-100 p-0.5">
                  {(["income", "expense"] as EntryKind[]).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => setTab(k)}
                      className={`rounded-full px-4 py-1.5 text-xs font-medium transition ${
                        tab === k ? "bg-[#1A4D2E] text-white shadow" : "text-gray-600"
                      }`}
                    >
                      {KIND_LABEL[k]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setEntryModal("new")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#1A4D2E] px-4 text-xs font-medium text-white hover:bg-[#143a22]"
                >
                  <Plus className="h-3.5 w-3.5" /> เพิ่ม{KIND_LABEL[tab]}
                </button>
              </div>

              {entriesLoading ? (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 p-6 text-sm text-gray-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> กำลังโหลดรายการ…
                </div>
              ) : groups.length === 0 ? (
                <p className="rounded-xl bg-gray-50 p-6 text-center text-sm text-gray-400">
                  ยังไม่มี{KIND_LABEL[tab]}ในรอบนี้ กด &ldquo;เพิ่ม{KIND_LABEL[tab]}&rdquo;
                  เพื่อบันทึกรายการแรก
                </p>
              ) : (
                <div className="space-y-2">
                  {groups.map((g) => (
                    <div key={g.category} className="overflow-hidden rounded-xl border border-gray-200">
                      <div className="flex items-baseline justify-between gap-3 bg-[#F1F7F2] px-4 py-2">
                        <span className="truncate text-sm font-semibold text-[#1A4D2E]">
                          {g.category}
                        </span>
                        <span className="shrink-0 text-sm font-bold text-[#1A4D2E]">
                          {formatBaht(g.total)}
                          <span className="ml-1 text-[10px] font-normal opacity-70">บาท</span>
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {g.items.map((e) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => setEntryModal(e)}
                            className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left text-sm hover:bg-gray-50"
                          >
                            <span className="min-w-0">
                              <span className="block truncate text-gray-700">
                                {e.title || g.category}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                {formatDay(e.happened_on)}
                              </span>
                            </span>
                            <span
                              className={`shrink-0 font-semibold ${
                                tab === "income" ? "text-emerald-600" : "text-red-500"
                              }`}
                            >
                              {formatBaht(e.amount)}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between px-1 pt-1 text-sm">
                    <span className="text-gray-500">รวม{KIND_LABEL[tab]}ทั้งรอบ</span>
                    <span className="font-bold text-gray-800">{formatBaht(tabTotal)} บาท</span>
                  </div>
                </div>
              )}
            </div>

            {/* สรุปของรอบ — อยู่ท้ายสุด ต่อจากที่บันทึกรายการเสร็จ */}
            {season && (
              <div className="mt-6 border-t border-gray-100 pt-5">
                <h2 className="mb-3 text-sm font-bold text-gray-800">สรุปรอบนี้</h2>
                <SeasonSummary season={season} entries={entries} />
              </div>
            )}
          </>
        )}
      </div>

      {seasonModal !== null && (
        <SeasonModal
          season={seasonModal === "edit" ? season : null}
          crops={crops}
          defaultName={defaultSeasonName(seasons.length)}
          onClose={() => setSeasonModal(null)}
          onSave={handleSaveSeason}
          onDelete={seasonModal === "edit" ? handleDeleteSeason : undefined}
        />
      )}

      {entryModal !== null && (
        <EntryModal
          kind={entryModal !== "new" ? entryModal.kind : tab}
          entry={entryModal !== "new" ? entryModal : null}
          customCategories={categories}
          onClose={() => setEntryModal(null)}
          onSave={handleSaveEntry}
          onDelete={entryModal !== "new" ? handleDeleteEntry : undefined}
          onCreateCategory={handleCreateCategory}
        />
      )}
    </div>
  )
}
