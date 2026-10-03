import { notFound, redirect } from "next/navigation"
import PrintActions from "@/components/report/PrintActions"
import A4Sheet from "@/components/report/A4Sheet"
import { createClient } from "@/lib/supabase/server"
import { formatBaht, formatDay, KIND_LABEL, type EntryKind } from "@/lib/ledger/categories"

export const dynamic = "force-dynamic"

// รายการต่อหน้า — หน้าแรกมีสรุปกินที่ จึงใส่รายการได้น้อย ถ้าเกินให้ย้ายไปหน้าถัดไปทั้งหมด
// (A4Sheet ย่อให้พอดีหน้าอยู่แล้ว ถ้าชื่อรายการยาวจนบรรทัดตัดมากกว่าที่ประมาณไว้)
const FIRST_PAGE_MAX = 8
const ROWS_PER_PAGE = 25

interface Row {
  id: string
  kind: EntryKind
  category: string
  title: string | null
  amount: number
  happened_on: string
}

function thaiDate(iso: string) {
  return new Date(iso).toLocaleDateString("th-TH", { day: "numeric", month: "long", year: "numeric" })
}

function byCategory(rows: Row[], kind: EntryKind) {
  const map = new Map<string, number>()
  for (const r of rows) if (r.kind === kind) map.set(r.category, (map.get(r.category) ?? 0) + r.amount)
  const total = [...map.values()].reduce((s, v) => s + v, 0)
  return [...map.entries()]
    .map(([name, amount]) => ({ name, amount, pct: total > 0 ? (amount / total) * 100 : 0 }))
    .sort((a, b) => b.amount - a.amount)
}

function CategoryTable({ title, rows, tone }: { title: string; rows: ReturnType<typeof byCategory>; tone: "in" | "out" }) {
  return (
    <section>
      <h2 className="h2">{title}</h2>
      {rows.length === 0 ? (
        <p className="empty-note">ไม่มีรายการ</p>
      ) : (
        <table className="tbl">
          <thead>
            <tr><th>หมวด</th><th className="num">บาท</th><th className="num">%</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.name}>
                <td>{r.name}</td>
                <td className={`num ${tone === "in" ? "amt-in" : "amt-out"}`}><strong>{formatBaht(r.amount)}</strong></td>
                <td className="num">{r.pct.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}

function EntryTable({ rows, startNo }: { rows: Row[]; startNo: number }) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          <th className="num">#</th><th>วันที่</th><th>ประเภท</th><th>หมวด</th><th>รายการ</th>
          <th className="num">จำนวนเงิน (บาท)</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id}>
            <td className="num muted">{startNo + i}</td>
            <td className="nowrap">{formatDay(r.happened_on)}</td>
            <td className={r.kind === "income" ? "amt-in" : "amt-out"}>{KIND_LABEL[r.kind]}</td>
            <td>{r.category}</td>
            <td>{r.title || <span className="dash">–</span>}</td>
            <td className={`num ${r.kind === "income" ? "amt-in" : "amt-out"}`}><strong>{formatBaht(r.amount)}</strong></td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

/**
 * รายงานสมุดบัญชีหนึ่งรอบเพาะปลูก (A4 พิมพ์/ดาวน์โหลด PDF)
 * อ่านผ่าน RLS: เจ้าของเปิดรอบของตัวเองได้ แอดมินเปิดได้ทุกรอบ (migration 036) คนอื่นได้ 404
 */
export default async function LedgerPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ season?: string }>
}) {
  const { season: seasonId } = await searchParams
  if (!seasonId) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/ledger/print?season=${seasonId}`)}`)

  const { data: season } = await supabase
    .from("farm_seasons")
    .select("id, user_id, name, crop_id, started_on, ended_on, yield_kg, note")
    .eq("id", seasonId)
    .maybeSingle()
  if (!season) notFound()

  const [{ data: entryData }, { data: crop }, { data: owner }] = await Promise.all([
    supabase
      .from("farm_entries")
      .select("id, kind, category, title, amount, happened_on")
      .eq("season_id", seasonId)
      .order("happened_on", { ascending: true })
      .order("created_at", { ascending: true }),
    season.crop_id
      ? supabase.from("crops").select("name").eq("id", season.crop_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("profiles").select("full_name, nickname, email").eq("id", season.user_id).maybeSingle(),
  ])

  const entries: Row[] = (entryData ?? []).map((e) => ({ ...e, amount: Number(e.amount) || 0 })) as Row[]
  const income = entries.reduce((s, e) => (e.kind === "income" ? s + e.amount : s), 0)
  const expense = entries.reduce((s, e) => (e.kind === "expense" ? s + e.amount : s), 0)
  const net = income - expense
  const yieldKg = season.yield_kg == null ? null : Number(season.yield_kg)

  const ownerName = owner?.full_name?.trim() || owner?.nickname?.trim() || owner?.email || "ไม่ระบุ"
  const period = `${formatDay(season.started_on)} – ${season.ended_on ? formatDay(season.ended_on) : "ยังไม่สิ้นสุด"}`

  // แบ่งรายการเป็นหน้า
  const firstPage = entries.length <= FIRST_PAGE_MAX ? entries : []
  const rest = entries.length <= FIRST_PAGE_MAX ? [] : entries
  const chunks: Row[][] = []
  for (let i = 0; i < rest.length; i += ROWS_PER_PAGE) chunks.push(rest.slice(i, i + ROWS_PER_PAGE))
  const pageCount = 1 + chunks.length
  const printedAt = thaiDate(new Date().toISOString())

  const foot = (page: number) => (
    <footer className="foot">
      <span>พิมพ์เมื่อ {printedAt} · หน้า {page}/{pageCount}</span>
      <span>DOA-Soil Test Kit</span>
    </footer>
  )

  const filename = `สมุดบัญชี-${season.name}-${new Date().toISOString().slice(0, 10)}.pdf`

  return (
    <div className="report-root font-thai">
      <PrintActions filename={filename} />

      {/* ---------- หน้า 1: สรุปรอบ ---------- */}
      <A4Sheet>
        <header className="head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/doa-logo.svg" alt="" className="logo" />
          <div>
            <h1>สมุดบัญชีรอบเพาะปลูก</h1>
            <p className="sub">กรมวิชาการเกษตร</p>
          </div>
        </header>

        <section className="meta">
          <div><span>ชื่อ</span><strong>{ownerName}</strong></div>
          <div><span>รอบเพาะปลูก</span><strong>{season.name}</strong></div>
          <div><span>พืชที่ปลูก</span><strong>{crop?.name ?? "ไม่ระบุ"}</strong></div>
          <div><span>ช่วงเวลา</span><strong>{period}</strong></div>
          <div><span>ผลผลิต</span><strong>{yieldKg != null ? `${formatBaht(yieldKg)} กก.` : "ไม่ได้ระบุ"}</strong></div>
          <div><span>จำนวนรายการ</span><strong>{entries.length} รายการ</strong></div>
        </section>

        <h2 className="h2">สรุปรอบนี้<span className="h2-unit">หน่วย: บาท</span></h2>
        <div className="money">
          <div className="in"><span>รายรับรวม</span><strong>{formatBaht(income)}</strong></div>
          <div className="out"><span>รายจ่ายรวม</span><strong>{formatBaht(expense)}</strong></div>
          <div className={net >= 0 ? "net" : "net loss"}>
            <span>{net >= 0 ? "กำไรสุทธิ" : "ขาดทุนสุทธิ"}</span>
            <strong>{net < 0 ? "-" : ""}{formatBaht(Math.abs(net))}</strong>
          </div>
        </div>
        {yieldKg != null && yieldKg > 0 && (
          <p className="per-kg">
            ต้นทุนต่อกิโลกรัม <b>{formatBaht(expense / yieldKg)}</b> บาท · รายรับต่อกิโลกรัม{" "}
            <b>{formatBaht(income / yieldKg)}</b> บาท
          </p>
        )}

        <div className="duo even">
          <CategoryTable title="รายรับตามหมวด" rows={byCategory(entries, "income")} tone="in" />
          <CategoryTable title="รายจ่ายตามหมวด" rows={byCategory(entries, "expense")} tone="out" />
        </div>

        {season.note && (
          <div className="note">
            <h3>บันทึก</h3>
            <p>{season.note}</p>
          </div>
        )}

        {firstPage.length > 0 && (
          <>
            <h2 className="h2">รายการทั้งหมด</h2>
            <EntryTable rows={firstPage} startNo={1} />
          </>
        )}
        {chunks.length > 0 && (
          <p className="empty-note">รายการทั้งหมด {entries.length} รายการ อยู่ในหน้าถัดไป</p>
        )}
        {entries.length === 0 && <p className="empty-note">รอบนี้ยังไม่มีรายการรายรับรายจ่าย</p>}

        {foot(1)}
      </A4Sheet>

      {/* ---------- หน้าถัดไป: รายการ ---------- */}
      {chunks.map((rows, i) => (
        <A4Sheet key={i}>
          <div className="cont-head">
            <strong>สมุดบัญชี · {season.name}</strong>
            <span>{ownerName}</span>
          </div>
          <h2 className="h2">
            รายการทั้งหมด
            <span className="h2-unit">
              ลำดับ {i * ROWS_PER_PAGE + 1}–{i * ROWS_PER_PAGE + rows.length} จาก {entries.length}
            </span>
          </h2>
          <EntryTable rows={rows} startNo={i * ROWS_PER_PAGE + 1} />
          {foot(i + 2)}
        </A4Sheet>
      ))}
    </div>
  )
}
