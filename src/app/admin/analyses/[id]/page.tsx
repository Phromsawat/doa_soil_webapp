import Link from "next/link"
import { notFound } from "next/navigation"
import { adminGetAnalysis } from "@/lib/supabase/admin"
import { ArrowLeft, MapPin, User, Calendar, FileText } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function AdminAnalysisDetailPage({ params }: PageProps) {
  const { id } = await params

  let record
  try {
    record = await adminGetAnalysis(id)
  } catch {
    notFound()
  }
  if (!record) notFound()

  const dateStr = new Date(record.created_at).toLocaleString("th-TH", {
    dateStyle: "full",
    timeStyle: "short",
  })
  const cropName = (record.crops as { name?: string } | null)?.name ?? "ไม่ระบุพืช"
  const result = record.analysis_results?.[0]
  const location = [record.district, record.amphur, record.province].filter(Boolean).join(" / ") || "ไม่ระบุ"

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/analyses"
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-[#1A4D2E]"
        >
          <ArrowLeft className="w-4 h-4" /> กลับไปรายการ
        </Link>
        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
          record.status === "completed" ? "bg-green-100 text-green-700"
          : record.status === "pending" ? "bg-orange-100 text-orange-700"
          : "bg-red-100 text-red-700"
        }`}>
          {record.status === "completed" ? "เสร็จสิ้น" : record.status === "pending" ? "รอดำเนินการ" : "ล้มเหลว"}
        </span>
      </div>

      {/* Summary card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* User info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
            <User className="w-3.5 h-3.5" /> ผู้ใช้
          </div>
          <div>
            <p className="font-bold text-gray-900">{record.user?.full_name || record.user?.nickname || "ไม่ระบุชื่อ"}</p>
            <p className="text-xs text-gray-500">{record.user?.email ?? "—"}</p>
            {record.user?.phone && (
              <p className="text-xs text-gray-500">{record.user.phone}</p>
            )}
            <p className="text-[10px] text-gray-400 mt-2 font-mono break-all">{record.user_id}</p>
          </div>
        </div>

        {/* Crop + meta */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
            <FileText className="w-3.5 h-3.5" /> รายละเอียดวิเคราะห์
          </div>
          <div className="space-y-1">
            <p><span className="text-xs text-gray-500">พืช:</span> <span className="font-bold">{cropName}</span></p>
            <p><span className="text-xs text-gray-500">โหมด:</span> <span className="font-medium">{record.input_mode === "image_upload" ? "อัปโหลดรูป" : "กรอกค่าเอง"}</span></p>
            {record.notes && (
              <p className="text-xs text-gray-600 italic mt-2">📝 {record.notes}</p>
            )}
          </div>
        </div>

        {/* Location + time */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase">
            <MapPin className="w-3.5 h-3.5" /> สถานที่
          </div>
          <div>
            <p className="text-sm font-medium text-gray-800">{location}</p>
            {record.latitude && record.longitude && (
              <p className="text-[11px] text-gray-500 font-mono mt-1">
                {Number(record.latitude).toFixed(5)}, {Number(record.longitude).toFixed(5)}
              </p>
            )}
            <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> {dateStr}
            </p>
          </div>
        </div>
      </div>

      {/* Soil values */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h2 className="text-sm font-bold text-gray-800 mb-4">ค่าวิเคราะห์ดิน</h2>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "OM (อินทรียวัตถุ)", value: record.om_value, unit: "%" },
            { label: "P (ฟอสฟอรัส)", value: record.p_value, unit: "mg/kg" },
            { label: "K (โพแทสเซียม)", value: record.k_value, unit: "mg/kg" },
          ].map(({ label, value, unit }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-[10px] text-gray-500 mb-1">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value ?? "—"}</p>
              <p className="text-[10px] text-gray-400">{unit}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Uploaded images */}
      {record.analysis_images && record.analysis_images.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-sm font-bold text-gray-800 mb-4">รูปแผ่นทดสอบที่อัปโหลด ({record.analysis_images.length})</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {record.analysis_images.map((img: {
              id: string
              nutrient_code: string
              public_url: string | null
              storage_path: string
              file_size_bytes: number | null
            }) => (
              <div key={img.id} className="space-y-2">
                <a
                  href={img.public_url ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block aspect-square rounded-xl bg-gray-100 overflow-hidden hover:ring-2 hover:ring-[#1A4D2E] transition-all relative group"
                >
                  {img.public_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img.public_url} alt={img.nutrient_code} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300">ไม่มีรูป</div>
                  )}
                  <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 text-white text-xs rounded-full font-bold">
                    {img.nutrient_code}
                  </div>
                </a>
                <p className="text-[10px] text-gray-400 truncate font-mono">{img.storage_path}</p>
                {img.file_size_bytes && (
                  <p className="text-[10px] text-gray-400">
                    {(img.file_size_bytes / 1024).toFixed(1)} KB
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recommendation */}
      {result && (
        <div className="bg-[#1A2F2A] text-white rounded-2xl p-5 shadow-sm">
          <h2 className="text-sm font-bold mb-4">คำแนะนำการจัดการปุ๋ย</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[10px] text-white/60 mb-1">N (ไนโตรเจน)</p>
              <p className="text-2xl font-bold text-accent">{result.recommended_n ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/60 mb-1">P₂O₅</p>
              <p className="text-2xl font-bold text-accent">{result.recommended_p2o5 ?? "—"}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] text-white/60 mb-1">K₂O</p>
              <p className="text-2xl font-bold text-accent">{result.recommended_k2o ?? "—"}</p>
            </div>
          </div>
          <p className="text-center text-[10px] text-white/50 mt-3">หน่วย: {result.unit}</p>
        </div>
      )}
    </div>
  )
}
