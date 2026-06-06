"use client"

import React, { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"

interface NPKChartProps {
  nitrogen: number
  phosphorus: number
  potassium: number
}

export default function NPKChart({ nitrogen, phosphorus, potassium }: NPKChartProps) {
  // Prevent SSR hydration mismatch for Recharts responsive containers
  const [isMounted, setIsMounted] = useState(false)
  
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true)
  }, [])

  const data = [
    { name: "ไนโตรเจน (N)", value: nitrogen, key: "N", unit: "มก./กก." },
    { name: "ฟอสฟอรัส (P)", value: phosphorus, key: "P", unit: "มก./กก." },
    { name: "โพแทสเซียม (K)", value: potassium, key: "K", unit: "มก./กก." },
  ]

  const colors = {
    N: "#3b82f6", // Blue
    P: "#f59e0b", // Amber
    K: "#10b981", // Emerald
  }

  if (!isMounted) {
    return (
      <div className="w-full h-48 bg-slate-50 animate-pulse rounded-card flex items-center justify-center">
        <span className="text-slate-400 font-thai text-sm">กำลังโหลดแผนภูมิ...</span>
      </div>
    )
  }

  return (
    <div className="w-full h-48 sm:h-56 font-thai">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
          <XAxis type="number" stroke="#94a3b8" fontSize={10} domain={[0, 100]} />
          <YAxis
            dataKey="name"
            type="category"
            stroke="#475569"
            fontSize={11}
            width={90}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "8px",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
              fontFamily: "Noto Sans Thai, sans-serif",
              fontSize: "12px",
            }}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter={(value: any, name: any, props: any) => [`${value} ${props.payload?.unit || "มก./กก."}`, "ปริมาณที่พบ"]}
          />
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={20}>
            {data.map((entry) => (
              <Cell key={entry.key} fill={colors[entry.key as keyof typeof colors]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
