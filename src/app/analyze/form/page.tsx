"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Check, ChevronDown, Lightbulb, Tractor, Apple, Wheat, Trees, TreePine, Carrot } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { addAnalysis } from "@/lib/storage"

const plantTypes = [
  { id: 'พืชไร่', title: 'พืชไร่', desc: 'ไม้ประเภทไม้ล้มลุกและไม้ทนแล้ง', icon: Tractor, color: 'text-orange-500' },
  { id: 'ไม้ผล', title: 'ไม้ผล', desc: 'ต้นไม้ที่ออกลูกออกผลให้เรารับประทาน', icon: Apple, color: 'text-red-500' },
  { id: 'ข้าว', title: 'ข้าว', desc: 'rice', icon: Wheat, color: 'text-yellow-500' },
  { id: 'ปาล์มน้ำมัน', title: 'ปาล์มน้ำมัน', desc: 'oil palm', icon: Trees, color: 'text-green-600' },
  { id: 'ยางพารา', title: 'ยางพารา', desc: 'rubber', icon: TreePine, color: 'text-emerald-500' },
  { id: 'พืชผัก', title: 'พืชผัก', desc: '19/09/2024 14:21', icon: Carrot, color: 'text-orange-600' },
]

const formSchema = z.object({
  crop: z.string().min(1, "โปรดเลือกพืชเป้าหมาย"),
  nitrogen: z.coerce.number().min(0).max(100),
  phosphorus: z.coerce.number().min(0).max(100),
  potassium: z.coerce.number().min(0).max(100),
  ph: z.coerce.number().min(0).max(14),
  organicMatter: z.coerce.number().min(0).max(10),
})

type FormValues = z.infer<typeof formSchema>

export default function AnalyzeForm() {
  const router = useRouter()
  
  const {
    register,
    handleSubmit,
    watch,
  } = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      crop: "ข้าว",
      nitrogen: 0,
      phosphorus: 0,
      potassium: 0,
      ph: 6.0,
      organicMatter: 1.5,
    },
  })

  // Watch values for dynamic badge
  const nValue = watch("nitrogen")
  const pValue = watch("phosphorus")
  const kValue = watch("potassium")

  const getBadge = (value: number) => {
    if (value < 20) return { label: "ต่ำ", className: "bg-red-100 text-red-600" }
    if (value > 60) return { label: "สูง", className: "bg-green-100 text-primary" }
    return { label: "ปานกลาง", className: "bg-orange-100 text-orange-600" }
  }

  const nBadge = getBadge(nValue)
  const pBadge = getBadge(pValue)
  const kBadge = getBadge(kValue)

  const onSubmit = (data: FormValues) => {
    const newRecord = addAnalysis({
      crop: data.crop,
      province: "กรุงเทพมหานคร", // Using dummy for exact design
      nitrogen: data.nitrogen,
      phosphorus: data.phosphorus,
      potassium: data.potassium,
      ph: data.ph,
      organicMatter: data.organicMatter
    })
    
    router.push(`/analyze/result?id=${newRecord.id}`)
  }

  return (
    <div className="font-thai pb-24 relative">
      {/* Step Indicator */}
      <div className="flex items-center justify-center gap-2 pt-4 mb-6">
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            <Check className="w-4 h-4" />
          </div>
        </div>
        <div className="w-12 h-1 bg-primary rounded-full" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-sm">
            2
          </div>
        </div>
        <div className="w-12 h-1 bg-gray-200 rounded-full" />
        <div className="flex flex-col items-center gap-1">
          <div className="w-8 h-8 rounded-full bg-gray-200 text-gray-400 flex items-center justify-center font-bold text-sm">
            3
          </div>
        </div>
      </div>

      <div className="bg-card rounded-2xl shadow-sm border border-gray-100 p-6 relative z-10">
        <h2 className="text-lg font-bold text-text-primary text-center mb-6">กรอกผลการวิเคราะห์ทางเคมี</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Crop Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-bold text-text-primary">เลือกชนิดพืช</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plantTypes.map((plant) => {
                const isSelected = watch("crop") === plant.id;
                const Icon = plant.icon;
                return (
                  <label
                    key={plant.id}
                    className={`relative flex items-center p-3 border rounded-xl cursor-pointer transition-all border-[#0070F3] ${
                      isSelected ? 'bg-blue-50 ring-1 ring-[#0070F3]' : 'bg-white hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="radio"
                      value={plant.id}
                      className="sr-only"
                      {...register("crop")}
                    />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 shrink-0 ${
                      isSelected ? 'border-[#0070F3]' : 'border-gray-400'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-[#0070F3]" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-full bg-gray-100 ${plant.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-bold text-[#0070F3] text-[15px] leading-tight">{plant.title}</span>
                        <span className="text-[11px] text-text-primary font-bold mt-0.5">{plant.desc}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* NPK Inputs */}
          <div className="space-y-3">
            <div className="relative">
              <label className="text-xs text-text-secondary block mb-1">ไนโตรเจน (N) ppm</label>
              <div className="flex items-center gap-2">
                <Input
                  className="h-12 rounded-xl text-sm border-gray-200 px-4 flex-1 focus-visible:border-primary"
                  type="number"
                  {...register("nitrogen")}
                />
                <div className={`px-4 h-12 rounded-xl flex items-center justify-center text-xs font-bold min-w-[70px] ${nBadge.className}`}>
                  {nBadge.label}
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="text-xs text-text-secondary block mb-1">ฟอสฟอรัส (P) ppm</label>
              <div className="flex items-center gap-2">
                <Input
                  className="h-12 rounded-xl text-sm border-gray-200 px-4 flex-1 focus-visible:border-primary"
                  type="number"
                  {...register("phosphorus")}
                />
                <div className={`px-4 h-12 rounded-xl flex items-center justify-center text-xs font-bold min-w-[70px] ${pBadge.className}`}>
                  {pBadge.label}
                </div>
              </div>
            </div>

            <div className="relative">
              <label className="text-xs text-text-secondary block mb-1">โพแทสเซียม (K) ppm</label>
              <div className="flex items-center gap-2">
                <Input
                  className="h-12 rounded-xl text-sm border-gray-200 px-4 flex-1 focus-visible:border-primary"
                  type="number"
                  {...register("potassium")}
                />
                <div className={`px-4 h-12 rounded-xl flex items-center justify-center text-xs font-bold min-w-[70px] ${kBadge.className}`}>
                  {kBadge.label}
                </div>
              </div>
            </div>
          </div>

          {/* pH and OM */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-text-secondary block">ความเป็นกรด-ด่าง (pH)</label>
              <Input
                className="h-12 rounded-xl text-sm border-gray-200 px-4 focus-visible:border-primary"
                type="number"
                step="0.1"
                {...register("ph")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-text-secondary block">อินทรียวัตถุ (OM) %</label>
              <Input
                className="h-12 rounded-xl text-sm border-gray-200 px-4 focus-visible:border-primary"
                type="number"
                step="0.1"
                {...register("organicMatter")}
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-6">
            <Button 
              type="button"
              variant="outline" 
              onClick={() => router.back()}
              className="flex-1 rounded-full border-gray-200 text-text-secondary font-bold hover:bg-gray-50 h-12"
            >
              ย้อนกลับ
            </Button>
            <Button 
              type="submit"
              className="flex-1 rounded-full bg-primary hover:bg-primary/90 text-white font-bold h-12"
            >
              วิเคราะห์ผล
            </Button>
          </div>
        </form>
      </div>

      {/* Tip Card */}
      <div className="mt-6 bg-[#1A2F2A] rounded-2xl p-4 flex gap-3 items-start relative z-10 shadow-md">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-white" />
        </div>
        <p className="text-sm text-white/90 leading-relaxed text-xs pt-1">
          การระบุค่า N-P-K ควรเทียบสีจากชุดทดสอบดินภายใต้แสงธรรมชาติ เพื่อความแม่นยำสูงสุด
        </p>
      </div>

      {/* Background Soil Image */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 opacity-10 bg-cover bg-top pointer-events-none z-0"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1592982537447-6f29633e7235?q=80&w=375&auto=format&fit=crop")' }}
      ></div>
    </div>
  )
}
