// แปลงบล็อกเนื้อหาเป็น JSX — ดีไซน์ตายตัวตามที่แต่ละหน้าใช้อยู่เดิม
// แอดมินแก้ได้เฉพาะ "เนื้อหา" หน้าตาจึงไม่มีทางเพี้ยนจากการแก้ไข

import Link from "next/link"
import type { Block, BlockImage } from "@/types/content"

const IMG_MAX: Record<NonNullable<BlockImage["size"]>, string> = {
  sm: "max-w-[250px] sm:max-w-[300px] md:max-w-[350px]",
  md: "max-w-[320px] sm:max-w-[400px] md:max-w-[480px]",
  lg: "max-w-[400px] sm:max-w-[500px] md:max-w-[600px]",
  full: "max-w-4xl",
}

function BlockImg({ image }: { image: BlockImage }) {
  if (!image.src) return null
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={image.src}
      alt={image.alt ?? ""}
      className={`w-full ${IMG_MAX[image.size ?? "lg"]} mx-auto rounded-xl shadow-lg border border-gray-200/60 object-contain bg-white block`}
    />
  )
}

/** แปลงลิงก์ YouTube ทุกรูปแบบเป็น URL สำหรับ embed */
function toEmbedUrl(url: string): string {
  const id =
    url.match(/[?&]v=([\w-]{11})/)?.[1] ??
    url.match(/youtu\.be\/([\w-]{11})/)?.[1] ??
    url.match(/embed\/([\w-]{11})/)?.[1]
  return id ? `https://www.youtube.com/embed/${id}` : url
}

function formatThaiDate(iso: string): string {
  return new Date(iso).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  })
}

export default function PageBlocks({
  blocks,
  updatedAt,
}: {
  blocks: Block[]
  updatedAt?: string | null
}) {
  // เลขขั้นตอน: นับต่อเนื่องและรีเซ็ตทุกครั้งที่เจอหัวข้อใหญ่
  // คำนวณล่วงหน้าเป็นอาร์เรย์คู่ขนานกับ blocks (ไม่แก้ค่าตัวแปรระหว่าง render)
  const stepNumbers: number[] = []
  let running = 0
  for (const b of blocks) {
    if (b.type === "heading") running = 0
    stepNumbers.push(b.type === "step" ? ++running : 0)
  }

  return (
    <div className="space-y-4">
      {blocks.map((b, idx) => {
        switch (b.type) {
          case "heading":
            return b.align === "center" ? (
              <h2
                key={b.id}
                className="text-center font-bold text-[#1A1A1A] text-lg md:text-xl pt-2 whitespace-pre-line"
              >
                {b.text}
              </h2>
            ) : (
              <h3
                key={b.id}
                className="text-xl font-bold text-[#1A1A1A] flex items-center gap-3 pt-6 first:pt-0"
              >
                <span className="w-1.5 h-6 bg-[#1A4D2E] rounded-full shrink-0" />
                {b.text}
              </h3>
            )

          case "paragraph":
            return (
              <p key={b.id} className="text-gray-600 text-[14.5px] leading-relaxed whitespace-pre-line">
                {b.text}
              </p>
            )

          case "card":
            return (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-5 shadow-sm space-y-3 border border-gray-100"
              >
                <h2 className="font-bold text-[#1A1A1A] text-lg">{b.title}</h2>
                <p className="text-gray-600 text-sm leading-relaxed whitespace-pre-line">{b.text}</p>
              </div>
            )

          case "image":
            return (
              <div key={b.id} className="py-1">
                <BlockImg image={b.image} />
              </div>
            )

          case "video":
            return (
              <div key={b.id} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="relative w-full overflow-hidden rounded-xl" style={{ paddingTop: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={toEmbedUrl(b.url)}
                    title={b.title ?? "วิดีโอ"}
                    frameBorder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                </div>
                {(b.title || b.description) && (
                  <div className="mt-4">
                    {b.title && <h2 className="font-bold text-[#1A1A1A] text-lg">{b.title}</h2>}
                    {b.description && (
                      <p className="text-gray-600 text-[14.5px] mt-2 leading-relaxed whitespace-pre-line">
                        {b.description}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )

          case "note": {
            const warm = b.tone === "warning"
            const box = warm
              ? "bg-[#FFF8E6] border-[#FBE192]"
              : "bg-[#EAF5ED]/50 border-[#1A4D2E]/20"
            const head = warm ? "text-[#8A6D3B]" : "text-[#1A1A1A]"
            const body = warm ? "text-[#8A6D3B]" : "text-gray-700"
            const hasTitles = b.items.some((i) => i.title)
            const stamp = b.showUpdatedAt && updatedAt ? `แก้ไขข้อมูลเมื่อวันที่ : ${formatThaiDate(updatedAt)}` : b.footnote
            return (
              <div key={b.id} className={`rounded-2xl p-5 shadow-sm border w-full ${box}`}>
                {b.title && <h3 className={`font-bold text-[15px] mb-2 ${head}`}>{b.title}</h3>}
                {b.intro && (
                  <p className="text-gray-800 text-[14.5px] leading-relaxed font-medium mb-4 whitespace-pre-line">
                    {b.intro}
                  </p>
                )}
                {hasTitles ? (
                  <div className="space-y-4">
                    {b.items.map((it, i) => (
                      <div key={i} className="space-y-1.5">
                        {it.title && <h3 className="font-bold text-[#1A1A1A] text-[15px]">{it.title}</h3>}
                        <p className={`${body} text-[14px] leading-relaxed whitespace-pre-line`}>{it.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <ul className={`${body} text-[13.5px] space-y-2 list-disc pl-4 leading-relaxed`}>
                    {b.items.map((it, i) => (
                      <li key={i} className="whitespace-pre-line">{it.text}</li>
                    ))}
                  </ul>
                )}
                {stamp && <p className={`${body}/70 text-[12px] mt-4 opacity-70`}>{stamp}</p>}
              </div>
            )
          }

          case "step": {
            const n = stepNumbers[idx]
            const tight = !b.hint && !b.warning && (!b.images || b.images.length === 0)
            return (
              <div key={b.id} className="pt-2">
                <div className={`flex gap-4 ${tight ? "items-center" : "items-start"}`}>
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#E1F0E5] text-[#1A4D2E] flex items-center justify-center font-bold text-[15px] shadow-sm">
                    {n}
                  </div>
                  <div className={tight ? "" : "pt-1"}>
                    <p className="font-medium text-gray-800 whitespace-pre-line">{b.text}</p>
                    {b.hint && <p className="mt-2 text-gray-500 text-[14px] whitespace-pre-line">{b.hint}</p>}
                    {b.warning && (
                      <div className="mt-3 bg-red-50 p-4 rounded-xl border border-red-100">
                        <p className="text-red-600 text-[14px] whitespace-pre-line">{b.warning}</p>
                      </div>
                    )}
                  </div>
                </div>
                {b.images && b.images.length > 0 && (
                  <div className="mt-5 ml-12 space-y-6">
                    {b.images.map((img, i) => (
                      <BlockImg key={i} image={img} />
                    ))}
                  </div>
                )}
              </div>
            )
          }

          case "contact":
            return (
              <div key={b.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 w-full">
                {b.title && <h3 className="font-bold text-[#1A4D2E] text-[15px] mb-3">{b.title}</h3>}
                <div className="text-gray-600 text-[14px] space-y-2 leading-relaxed">
                  {b.org && <p className="font-medium text-gray-800">{b.org}</p>}
                  {b.address && <p>{b.address}</p>}
                  {b.phone && (
                    <p>
                      โทร.{" "}
                      <a href={`tel:${b.phone}`} className="text-[#1A4D2E] hover:underline font-medium">
                        {b.phone}
                      </a>
                      {b.phoneNote ? ` ${b.phoneNote}` : ""}
                    </p>
                  )}
                  {b.email && (
                    <p>
                      Email :{" "}
                      <a href={`mailto:${b.email}`} className="text-[#1A4D2E] hover:underline font-medium">
                        {b.email}
                      </a>
                    </p>
                  )}
                </div>
              </div>
            )

          case "button":
            return (
              <div key={b.id} className="pt-1">
                <Link
                  href={b.href}
                  className="px-6 py-2.5 bg-[#1A4D2E] text-white rounded-full font-medium text-[15px] shadow-md hover:bg-[#153D24] hover:shadow-lg transition-all active:scale-95 inline-flex items-center justify-center whitespace-nowrap"
                >
                  {b.label}
                </Link>
              </div>
            )
        }
      })}
    </div>
  )
}
