import Link from "next/link"
import { Camera, Keyboard, ArrowRight, PenLine, Map, MapPin } from "lucide-react"
import { Button } from "@/components/ui/Button"

export default function MethodSelectionPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 font-thai pb-24">
      {/* Header */}
      <div className="text-center mb-8 space-y-1">
        <h1 className="text-xl md:text-2xl font-semibold text-[#1A1A1A]">เลือกวิธีบันทึกข้อมูล</h1>
        <p className="text-gray-500 text-sm mt-1">บันทึกข้อมูลเพื่อทำการวิเคราะห์คุณภาพดินของท่าน</p>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-5 mb-6">

        {[
          { img: "/img/ponnappa-ganesh-zATywM6DH_8-unsplash.jpg", alt: "Upload", title: "ประมวลผลอัตโนมัติ", sub: "เทียบเคียงสีจากภาพถ่าย", btn: "อัปโหลดรูปภาพ", href: "/analyze/upload" },
          { img: "/img/daniel-dan--FMxvHTCRmw-unsplash.jpg",       alt: "Manual", title: "กรอกข้อมูลด้วยตนเอง", sub: "ระบุค่าเทียบชาร์ต",    btn: "กรอกผลวิเคราะห์ดิน", href: "/analyze/form" },
        ].map((card) => (
          <div key={card.href} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
            <div className="aspect-[4/3] overflow-hidden">
              <img src={card.img} alt={card.alt} className="w-full h-full object-cover" />
            </div>
            <div className="p-3 md:p-4 flex flex-col flex-1">
              <div className="text-center mb-2.5">
                <h3 className="font-semibold text-[13px] md:text-base text-[#1A1A1A] leading-tight">{card.title}</h3>
                <p className="text-[11px] md:text-sm text-gray-500 mt-0.5">{card.sub}</p>
              </div>
              <Link href={card.href} className="w-full mt-auto">
                <Button className="w-full bg-[#E6EFEA] hover:bg-[#D8E6DD] text-[#1A1A1A] rounded-full font-medium text-[13px] h-9 flex items-center justify-center shadow-sm hover:shadow-md transition-all overflow-hidden">
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
