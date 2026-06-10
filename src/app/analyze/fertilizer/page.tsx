"use client"

import { useState } from "react"

type CropType = "ข้าว" | "ข้าวโพด" | "อ้อย" | "มันสำปะหลัง" | "ยางพารา"

const CROP_REQUIREMENTS: Record<CropType, { n: number; p: number; k: number }> = {
  ข้าว:        { n: 60,  p: 30,  k: 30  },
  ข้าวโพด:    { n: 120, p: 60,  k: 60  },
  อ้อย:        { n: 100, p: 50,  k: 120 },
  มันสำปะหลัง: { n: 80,  p: 40,  k: 80  },
  ยางพารา:    { n: 90,  p: 45,  k: 90  },
}

const FERTILIZERS = [
  { name: "ยูเรีย (46-0-0)",       n: 46, p: 0,  k: 0  },
  { name: "ทริปเปิ้ลซุปเปอร์ฟอสเฟต (0-46-0)", n: 0,  p: 46, k: 0  },
  { name: "โพแทสเซียมคลอไรด์ (0-0-60)",       n: 0,  p: 0,  k: 60 },
  { name: "สูตร 16-20-0",          n: 16, p: 20, k: 0  },
  { name: "สูตร 15-15-15",         n: 15, p: 15, k: 15 },
]

export default function FertilizerPage() {
  const [om, setOm] = useState("")
  const [p, setP] = useState("")
  const [k, setK] = useState("")
  const [area, setArea] = useState("")
  const [crop, setCrop] = useState<CropType>("ข้าว")
  const [result, setResult] = useState<null | { n: number; p: number; k: number; recs: { name: string; kg: number }[] }>(null)

  function calculate() {
    const areaRai = parseFloat(area) || 1
    const req = CROP_REQUIREMENTS[crop]

    // Simple deficit model: need - current (clamp to 0)
    const omVal = parseFloat(om) || 0
    const pVal  = parseFloat(p)  || 0
    const kVal  = parseFloat(k)  || 0

    // OM → N proxy: OM% * 20 kg/rai ≈ available N
    const availN = omVal * 20
    const needN  = Math.max(0, req.n - availN)
    const needP  = Math.max(0, req.p - pVal * 0.5)
    const needK  = Math.max(0, req.k - kVal * 0.2)

    // Scale by area
    const totalN = needN * areaRai
    const totalP = needP * areaRai
    const totalK = needK * areaRai

    // Recommend fertilizers (greedy single-nutrient)
    const recs: { name: string; kg: number }[] = []
    if (totalN > 0) recs.push({ name: "ยูเรีย (46-0-0)", kg: Math.ceil(totalN / 0.46) })
    if (totalP > 0) recs.push({ name: "ทริปเปิ้ลซุปเปอร์ฟอสเฟต (0-46-0)", kg: Math.ceil(totalP / 0.46) })
    if (totalK > 0) recs.push({ name: "โพแทสเซียมคลอไรด์ (0-0-60)", kg: Math.ceil(totalK / 0.60) })

    setResult({ n: Math.round(totalN), p: Math.round(totalP), k: Math.round(totalK), recs })
  }

  return (
    <div className="font-thai pb-32">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-8 mt-4 mx-4">

        {/* พืชและพื้นที่ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">ชนิดพืช</label>
            <select
              value={crop}
              onChange={(e) => setCrop(e.target.value as CropType)}
              className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
            >
              {Object.keys(CROP_REQUIREMENTS).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">พื้นที่ (ไร่)</label>
            <input
              type="number"
              min="0"
              placeholder="เช่น 5"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
            />
          </div>
        </div>

        {/* ค่าธาตุอาหารดิน */}
        <div className="space-y-4 pt-4 border-t border-gray-100">
          <p className="text-gray-800 font-semibold text-lg">ค่าธาตุอาหารในดิน (จากผลวิเคราะห์)</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">อินทรียวัตถุ OM (%)</label>
              <input
                type="number" min="0" step="0.1" placeholder="เช่น 1.5"
                value={om} onChange={(e) => setOm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">ฟอสฟอรัส P (mg/kg)</label>
              <input
                type="number" min="0" placeholder="เช่น 20"
                value={p} onChange={(e) => setP(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold text-gray-700">โพแทสเซียม K (mg/kg)</label>
              <input
                type="number" min="0" placeholder="เช่น 80"
                value={k} onChange={(e) => setK(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-full px-4 h-10 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#1A4D2E]/20 focus:border-[#1A4D2E] transition-all"
              />
            </div>
          </div>
        </div>

        {/* คำนวณ */}
        <div className="flex justify-center pt-4">
          <button
            onClick={calculate}
            className="px-12 h-10 bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-medium text-[15px] shadow-sm hover:shadow-md transition-all"
          >
            คำนวณสูตรปุ๋ย
          </button>
        </div>

        {/* ผลลัพธ์ */}
        {result && (
          <div className="space-y-4 pt-6 border-t border-gray-100">
            <p className="text-gray-800 font-semibold text-lg">ผลการคำนวณ</p>

            {/* ความต้องการธาตุอาหาร */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "ไนโตรเจน (N)", val: result.n, color: "bg-blue-50 text-blue-700" },
                { label: "ฟอสฟอรัส (P)", val: result.p, color: "bg-orange-50 text-orange-700" },
                { label: "โพแทสเซียม (K)", val: result.k, color: "bg-purple-50 text-purple-700" },
              ].map(({ label, val, color }) => (
                <div key={label} className={`rounded-2xl p-4 text-center ${color}`}>
                  <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
                  <p className="text-2xl font-bold">{val}</p>
                  <p className="text-xs opacity-70">kg</p>
                </div>
              ))}
            </div>

            {/* คำแนะนำปุ๋ย */}
            {result.recs.length > 0 ? (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-700">คำแนะนำปุ๋ย</p>
                {result.recs.map((r) => (
                  <div key={r.name} className="flex items-center justify-between bg-[#F0F7F3] rounded-xl px-5 py-3">
                    <span className="text-sm text-gray-800">{r.name}</span>
                    <span className="font-bold text-[#1A4D2E] text-sm">{r.kg} kg</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-[#F0F7F3] rounded-xl px-5 py-4 text-center text-sm text-[#1A4D2E] font-medium">
                ดินมีธาตุอาหารเพียงพอสำหรับพืชที่เลือก ไม่จำเป็นต้องใส่ปุ๋ยเพิ่ม
              </div>
            )}

            <p className="text-xs text-gray-400 text-center pt-2">
              * ค่าที่คำนวณเป็นค่าประมาณเบื้องต้น ควรปรึกษานักวิชาการเกษตรก่อนใช้งานจริง
            </p>
          </div>
        )}

      </div>
    </div>
  )
}
