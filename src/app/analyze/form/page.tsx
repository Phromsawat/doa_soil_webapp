"use client"

import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Check, ChevronDown, Lightbulb, Tractor, Apple, Wheat, Trees, TreePine, Carrot, Sprout, Leaf, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { addAnalysis } from "@/lib/storage"

const plantTypes = [
  { id: 'พืชไร่', title: 'พืชไร่', desc: 'ไม้ประเภทไม้ล้มลุกและไม้ทนแล้ง', icon: Tractor, color: 'text-gray-500' },
  { id: 'ไม้ผล', title: 'ไม้ผล', desc: 'ต้นไม้ที่ออกลูกออกผลให้เรารับประทาน', icon: Apple, color: 'text-gray-500' },
  { id: 'ข้าว', title: 'ข้าว', desc: 'rice', icon: Wheat, color: 'text-gray-500' },
  { id: 'ปาล์มน้ำมัน', title: 'ปาล์มน้ำมัน', desc: 'oil palm', icon: Trees, color: 'text-gray-500' },
  { id: 'ยางพารา', title: 'ยางพารา', desc: 'rubber', icon: TreePine, color: 'text-gray-500' },
  { id: 'พืชผัก', title: 'พืชผัก', desc: '19/09/2024 14:21', icon: Carrot, color: 'text-gray-500' },
]

const fieldCrops = [
  { id: 'ข้าวโพด', title: 'ข้าวโพด', desc: 'Corn', icon: Wheat, color: 'text-gray-500' },
  { id: 'อ้อย', title: 'อ้อย', desc: 'Sugar cane', icon: Leaf, color: 'text-gray-500' },
  { id: 'มันสำปะหลัง', title: 'มันสำปะหลัง', desc: 'Cassava', icon: Sprout, color: 'text-gray-500' },
  { id: 'ถั่ว', title: 'ถั่ว', desc: 'Beans', icon: Lightbulb, color: 'text-gray-500' },
]

const cornTypes = [
  { id: 'ข้าวโพดเลี้ยงสัตว์', title: 'ข้าวโพดเลี้ยงสัตว์', desc: 'Field corns', icon: Wheat, color: 'text-gray-500' },
  { id: 'ข้าวโพดฝักสด', title: 'ข้าวโพดฝักสด', desc: 'Specialty corns', icon: Wheat, color: 'text-gray-500' },
]

const formSchema = z.object({
  crop: z.string().min(1, "โปรดเลือกพืชเป้าหมาย"),
  subCrop: z.string().optional(),
  cornType: z.string().optional(),
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
  const nValue = watch("nitrogen") as number
  const pValue = watch("phosphorus") as number
  const kValue = watch("potassium") as number

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


      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mt-4 mx-4 relative z-10">
        <h2 className="text-lg font-semibold text-gray-800 text-center mb-6">กรอกผลการวิเคราะห์ทางเคมี</h2>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Crop Type Selection */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700">เลือกชนิดพืช</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {plantTypes.map((plant) => {
                const isSelected = watch("crop") === plant.id;
                const Icon = plant.icon;
                return (
                  <label
                    key={plant.id}
                    className={`relative flex items-center px-4 h-12 border border-gray-100 rounded-full cursor-pointer transition-all ${
                      isSelected ? 'bg-[#1A4D2E]/5 border-primary ring-1 ring-primary' : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <input
                      type="radio"
                      value={plant.id}
                      className="sr-only"
                      {...register("crop")}
                    />
                    <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 shrink-0 ${
                      isSelected ? 'border-primary' : 'border-gray-400'
                    }`}>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className={`flex items-center justify-center ${plant.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className={`font-semibold text-sm leading-tight ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{plant.title}</span>
                        <span className="text-[11px] text-gray-500 mt-0.5">{plant.desc}</span>
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {watch("crop") === 'พืชไร่' && (
            <div className="space-y-3 pt-4">
              <label className="text-sm font-semibold text-gray-700">เลือกประเภทพืชไร่</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fieldCrops.map((plant) => {
                  const isSelected = watch("subCrop") === plant.id;
                  const Icon = plant.icon;
                  return (
                    <label
                      key={plant.id}
                      className={`relative flex items-center px-4 h-12 border border-gray-100 rounded-full cursor-pointer transition-all ${
                        isSelected ? 'bg-[#1A4D2E]/5 border-primary ring-1 ring-primary' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="radio"
                        value={plant.id}
                        className="sr-only"
                        {...register("subCrop")}
                      />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 shrink-0 ${
                        isSelected ? 'border-primary' : 'border-gray-400'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center text-gray-500`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-semibold text-sm leading-tight ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{plant.title}</span>
                          <span className="text-[11px] text-gray-800 font-bold mt-0.5">{plant.desc}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {watch("subCrop") === 'ข้าวโพด' && watch("crop") === 'พืชไร่' && (
            <div className="space-y-3 pt-4">
              <label className="text-sm font-semibold text-gray-700">เลือกประเภทข้าวโพด</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {cornTypes.map((plant) => {
                  const isSelected = watch("cornType") === plant.id;
                  const Icon = plant.icon;
                  return (
                    <label
                      key={plant.id}
                      className={`relative flex items-center px-4 h-12 border border-gray-100 rounded-full cursor-pointer transition-all ${
                        isSelected ? 'bg-[#1A4D2E]/5 border-primary ring-1 ring-primary' : 'bg-gray-50 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="radio"
                        value={plant.id}
                        className="sr-only"
                        {...register("cornType")}
                      />
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center mr-3 shrink-0 ${
                        isSelected ? 'border-primary' : 'border-gray-400'
                      }`}>
                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center text-gray-500`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-semibold text-sm leading-tight ${isSelected ? 'text-primary' : 'text-gray-700'}`}>{plant.title}</span>
                          <span className="text-[11px] text-gray-800 font-bold mt-0.5">{plant.desc}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex pt-6">
            <Button 
              type="button"
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 h-10 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-full font-medium text-[15px] shadow-sm transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              รีเฟรช
            </Button>
          </div>

        </form>
      </div>



      {/* Background Soil Image */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-40 opacity-10 bg-cover bg-top pointer-events-none z-0"
        style={{ backgroundImage: 'url("https://images.unsplash.com/photo-1592982537447-6f29633e7235?q=80&w=375&auto=format&fit=crop")' }}
      ></div>
    </div>
  )
}
