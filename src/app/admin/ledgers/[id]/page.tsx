import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, FileDown } from "lucide-react"
import { adminGetLedgerSeason } from "@/lib/supabase/adminLedger"
import { formatBaht, formatDay, KIND_LABEL } from "@/lib/ledger/categories"

export const dynamic = "force-dynamic"

/** รายละเอียดสมุดบัญชีหนึ่งรอบ (แอดมิน อ่านอย่างเดียว) */
export default async function AdminLedgerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await adminGetLedgerSeason(id).catch(() => null)
  if (!s) notFound()

  const net = s.net
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/ledgers" className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
            <ArrowLeft className="h-3.5 w-3.5" /> สมุดบัญชีของผู้ใช้
          </Link>
          <h1 className="mt-1 text-xl font-bold text-gray-800">{s.name}</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {s.owner_name ?? "ไม่ระบุชื่อ"} · {s.owner_email} · {s.crop_name ?? "ไม่ระบุพืช"} ·{" "}
            {formatDay(s.started_on)} – {s.ended_on ? formatDay(s.ended_on) : "ยังไม่สิ้นสุด"}
          </p>
        </div>
        <Link
          href={`/ledger/print?season=${s.season_id}`}
          target="_blank"
          className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
        >
          <FileDown className="h-4 w-4" /> พิมพ์ / PDF
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">รายรับรวม</p>
          <p className="mt-1 text-lg font-bold text-emerald-700">{formatBaht(s.income)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">รายจ่ายรวม</p>
          <p className="mt-1 text-lg font-bold text-red-600">{formatBaht(s.expense)}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">{net < 0 ? "ขาดทุนสุทธิ" : "กำไรสุทธิ"}</p>
          <p className={`mt-1 text-lg font-bold ${net < 0 ? "text-red-600" : "text-emerald-700"}`}>
            {net < 0 ? "-" : ""}{formatBaht(Math.abs(net))}
          </p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs text-gray-500">ผลผลิต</p>
          <p className="mt-1 text-lg font-bold text-gray-800">
            {s.yield_kg != null ? `${formatBaht(s.yield_kg)} กก.` : "ไม่ได้ระบุ"}
          </p>
        </div>
      </div>

      {s.note && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">บันทึก: {s.note}</p>
      )}

      <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white shadow-sm">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-gray-50 text-left text-xs text-gray-500">
            <tr>
              <th className="px-4 py-3 font-medium">วันที่</th>
              <th className="px-4 py-3 font-medium">ประเภท</th>
              <th className="px-4 py-3 font-medium">หมวด</th>
              <th className="px-4 py-3 font-medium">รายการ</th>
              <th className="px-4 py-3 text-right font-medium">จำนวนเงิน (บาท)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {s.entries.length === 0 ? (
              <tr><td colSpan={5} className="px-4 py-10 text-center text-gray-400">รอบนี้ยังไม่มีรายการ</td></tr>
            ) : (
              s.entries.map((e) => (
                <tr key={e.id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-gray-600">{formatDay(e.happened_on)}</td>
                  <td className={`px-4 py-2.5 ${e.kind === "income" ? "text-emerald-700" : "text-red-600"}`}>{KIND_LABEL[e.kind]}</td>
                  <td className="px-4 py-2.5 text-gray-700">{e.category}</td>
                  <td className="px-4 py-2.5 text-gray-500">{e.title || "–"}</td>
                  <td className={`px-4 py-2.5 text-right font-semibold ${e.kind === "income" ? "text-emerald-700" : "text-red-600"}`}>
                    {formatBaht(e.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
