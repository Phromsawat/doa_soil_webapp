import Link from "next/link"
import { Camera, Keyboard, ArrowRight, PenLine, Map, MapPin } from "lucide-react"
import { Button } from "@/components/ui/Button"

export default function MethodSelectionPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-thai pb-24">
      {/* Header */}
      <div className="text-center mb-10 space-y-2">
        <h1 className="text-2xl md:text-3xl font-semibold text-[#1A1A1A]">เลือกวิธีบันทึกข้อมูล</h1>
        <p className="text-gray-500 text-sm md:text-base mt-1">บันทึกข้อมูลเพื่อทำการวิเคราะห์คุณภาพดินของท่าน</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 mb-6">

        {[
          { img: "/img/ponnappa-ganesh-zATywM6DH_8-unsplash.jpg", alt: "Upload", title: "ประมวลผลอัตโนมัติ", sub: "เทียบเคียงสีจากภาพถ่าย", btn: "อัปโหลดรูปภาพ", href: "/analyze/upload", span: "" },
          { img: "/img/daniel-dan--FMxvHTCRmw-unsplash.jpg",       alt: "Manual", title: "กรอกข้อมูลด้วยตนเอง", sub: "ระบุค่าเทียบชาร์ต",    btn: "กรอกผลวิเคราะห์ดิน", href: "/analyze/form", span: "" },
          { img: "/img/pexels-leiliane-dutra-1841922-25974981.jpg", alt: "Fertilizer", title: "คำนวณสูตรปุ๋ย", sub: "แนะนำปุ๋ยตามผลวิเคราะห์ดิน", btn: "คำนวณสูตรปุ๋ย", href: "/analyze/fertilizer", span: "" },
        ].map((card) => (
          <div key={card.href} className={`bg-white rounded-2xl md:rounded-3xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow ${card.span}`}>
            <div className="aspect-[5/4] overflow-hidden">
              <img src={card.img} alt={card.alt} className="w-full h-full object-cover" />
            </div>
            <div className="p-4 md:p-6 flex flex-col flex-1">
              <div className="text-center mb-3">
                <h3 className="font-semibold text-[13px] md:text-lg text-[#1A1A1A] leading-tight">{card.title}</h3>
                <p className="text-[11px] md:text-sm text-gray-500 mt-1">{card.sub}</p>
              </div>
              <Link href={card.href} className="w-full mt-auto">
                <Button className="w-full bg-[#E6EFEA] hover:bg-[#D8E6DD] text-[#1A1A1A] rounded-full font-medium text-[13px] md:text-[15px] h-9 md:h-10 flex items-center justify-center shadow-sm hover:shadow-md transition-all overflow-hidden">
                  <span className="truncate px-1">{card.btn}</span>
                </Button>
              </Link>
            </div>
          </div>
        ))}

      </div>

    </div>
  )
}
