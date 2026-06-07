import type { Metadata } from "next"
import Bar from "@/components/layout/bar"
import BottomNav from "@/components/layout/BottomNav"
import { LanguageProvider } from "@/components/providers/LanguageProvider"
import "./globals.css"

// Import Google Fonts through Fontsource
import "@fontsource/noto-sans-thai/400.css"
import "@fontsource/noto-sans-thai/500.css"
import "@fontsource/noto-sans-thai/600.css"
import "@fontsource/noto-sans-thai/700.css"
import "@fontsource/inter/400.css"
import "@fontsource/inter/500.css"
import "@fontsource/inter/600.css"
import "@fontsource/inter/700.css"

export const metadata: Metadata = {
  title: "DOA Soil Test Kit - วิเคราะห์สารอาหารในดินเพื่อเกษตรกรไทย",
  description: "ระบบวิเคราะห์ธาตุอาหารดิน ไนโตรเจน (N), ฟอสฟอรัส (P), โพแทสเซียม (K) พร้อมแผนการใส่ปุ๋ยสําหรับพืชแต่ละชนิด",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "DOA Soil Kit",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="th" className="selection:bg-accent/30">
      <body className="min-h-screen bg-background antialiased font-thai flex justify-center">
        <LanguageProvider>
          <div className="flex flex-col min-h-screen w-full bg-surface relative shadow-xl">
            
            {/* Main workspace */}
            <div className="flex-1 flex flex-col min-h-screen w-full">
              {/* Top Header */}
              <Bar />
              
              {/* Dynamic Content View */}
              <main className="flex-1 w-full">
                {children}
              </main>
            </div>
            
            {/* Mobile Navigation */}
            <BottomNav />
          </div>
        </LanguageProvider>
      </body>
    </html>
  )
}
