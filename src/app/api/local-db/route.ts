import { NextResponse } from "next/server"
import { LOCAL_MODE, type QuerySpec } from "@/lib/local/query"
import { executeLocal } from "@/lib/local/engine"

// ใช้เฉพาะ local mode: browser client ส่ง QuerySpec มาให้รันกับฐานข้อมูล JSON ในเครื่อง
export async function POST(req: Request) {
  if (!LOCAL_MODE) return NextResponse.json({ error: "not found" }, { status: 404 })
  const spec = (await req.json()) as QuerySpec
  return NextResponse.json(await executeLocal(spec))
}
