"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Trash2 } from "lucide-react"
import { adminDeleteLedgerSeason } from "@/lib/supabase/adminLedger"

/** ปุ่มลบรอบเพาะปลูกในหน้ารายละเอียด — ยืนยันก่อน ลบแล้วกลับไปหน้ารายการ */
export default function DeleteSeasonButton({ seasonId, label }: { seasonId: string; label: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  async function handleDelete() {
    if (!confirm(`ลบ${label}?\nลบแล้วกู้คืนไม่ได้`)) return
    setBusy(true)
    try {
      await adminDeleteLedgerSeason(seasonId)
      router.push("/admin/ledgers")
      router.refresh()
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e))
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleDelete}
      disabled={busy}
      className="flex items-center gap-2 rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} ลบรอบนี้
    </button>
  )
}
