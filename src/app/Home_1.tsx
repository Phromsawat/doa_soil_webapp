"use client"

import Link from "next/link"
import { ShieldCheck, Home, Clock, Phone, Mail } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { useLanguage } from "@/components/providers/LanguageProvider"

export default function Home_1() {
  const { t } = useLanguage()
  return (
    <div className="flex flex-col min-h-screen bg-background font-thai pb-16">
      {/* Dark Hero Section */}
      <section className="relative bg-[#1A2F2A] px-4 pt-24 pb-20 overflow-hidden w-full">
        {/* Background Image Overlay */}
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: 'url("/img/bernd-dittrich-G2hfwMGlzUg-unsplash.jpg")' }}
        ></div>
        
        <div className="relative z-10 flex flex-col items-center text-center space-y-6">

          {/* Title */}
          <h1 className="text-3xl font-black text-white tracking-tight">
            {t('title')}
          </h1>
          
          {/* Subtitle */}
          <p className="text-[14px] text-gray-300 max-w-[340px] leading-relaxed">
            {t('subtitle1')}<br/>{t('subtitle2')}
          </p>
          
          {/* Buttons */}
          <div className="w-full flex flex-col gap-3 pt-4 px-4 max-w-[300px]">
            <Link href="/analyze" className="w-full">
              <Button size="lg" className="w-full font-bold text-[15px] h-12 shadow-lg transition-colors bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full">
                {t('startAnalysis')}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Quick Guide Section */}
      <section className="px-4 py-8 space-y-4 w-full flex-1 bg-[#F9F9F9]">
        {/* Menu 1 */}
        <Link href="/soil-sampling" className="block">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex gap-4 items-center transition-all hover:shadow-md">
            <div className="w-14 h-14 rounded-full bg-[#EAF5ED] flex items-center justify-center text-[#1A4D2E] shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M12 7v14"/>
                <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z"/>
              </svg>
            </div>
            <div>
              <span className="text-[14px] font-bold text-[#1A1A1A]">{t('soilSampling')}</span>
            </div>
          </div>
        </Link>

        {/* Menu 2 */}
        <Link href="/doa-kits" className="block">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex gap-4 items-center transition-all hover:shadow-md">
            <div className="w-14 h-14 rounded-full bg-[#EAF5ED] flex items-center justify-center text-[#1A4D2E] shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M14 2v6a2 2 0 0 0 .245.96l5.51 10.08A2 2 0 0 1 18 22H6a2 2 0 0 1-1.755-2.96l5.51-10.08A2 2 0 0 0 10 8V2"/>
                <path d="M6.453 15h11.094"/>
                <path d="M8.5 2h7"/>
              </svg>
            </div>
            <div>
              <span className="text-[14px] font-bold text-[#1A1A1A]">{t('doaKits')}</span>
            </div>
          </div>
        </Link>

        {/* Menu 3 */}
        <Link href="/user-guide" className="block">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex gap-4 items-center transition-all hover:shadow-md">
            <div className="w-14 h-14 rounded-full bg-[#EAF5ED] flex items-center justify-center text-[#1A4D2E] shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a1 1 0 0 1 0-5H20"/>
              </svg>
            </div>
            <div>
              <span className="text-[14px] font-bold text-[#1A1A1A]">{t('userGuide')}</span>
            </div>
          </div>
        </Link>
      </section>

      {/* Project Details Section */}
      <section className="px-5 py-8 w-full bg-white border-t border-gray-100/60">
        <div className="w-full space-y-6">
          {/* Header */}
          <div>
            <h2 className="text-[19px] font-black text-[#1A1A1A] mb-3">{t('projectDetailsTitle')}</h2>
            <div className="w-full h-[1px] bg-gray-100"></div>
          </div>

          {/* Description */}
          <p className="text-[14px] text-[#333333] leading-relaxed">
            {t('projectDescription')}
          </p>

          {/* Organized By */}
          <div className="space-y-1.5">
            <h3 className="text-[16px] font-black text-[#1A1A1A]">{t('organizedByTitle')}</h3>
            <p className="text-[14px] text-[#333333] leading-relaxed">
              {t('organizedByDesc')}
            </p>
          </div>

          {/* Original Contact Info */}
          <div className="space-y-1.5 pt-2">
            <h3 className="text-[16px] font-black text-[#1A1A1A]">{t('contactTitle')}</h3>
            <p className="text-[14px] text-[#333333] leading-relaxed">
              {t('contactDept1')}<br/>
              {t('contactDept2')}<br/>
              {t('contactDept3')}<br/>
              {t('contactDept4')}<br/>
              {t('contactPhoneShort')}
            </p>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section className="px-5 py-8 w-full bg-[#F9F9F9] border-t border-gray-200">
        <div className="w-full space-y-6">
          <div className="pt-2">
            <h2 className="text-[19px] font-black text-[#1A1A1A] mb-3">{t('contactUsNow')}</h2>
            <div className="w-full h-[1px] bg-gray-100"></div>
          </div>

          {/* Contact Details */}
          <div className="space-y-6 pt-2">
            {/* Address */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#1A1A1A]">
                <Home className="w-5 h-5 fill-current" />
                <h3 className="text-[16px] font-black">{t('addressLabel')}</h3>
              </div>
              <p className="text-[14px] text-[#666666] leading-relaxed">
                {t('addressFull')}
              </p>
            </div>
            
            <div className="w-full h-[1px] bg-gray-100"></div>

            {/* Business Hours */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#1A1A1A]">
                <Clock className="w-5 h-5" />
                <h3 className="text-[16px] font-black">{t('businessHoursLabel')}</h3>
              </div>
              <p className="text-[14px] text-[#666666]">
                {t('businessHoursFull')}
              </p>
            </div>
            
            <div className="w-full h-[1px] bg-gray-100"></div>

            {/* Phone */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#1A1A1A]">
                <Phone className="w-5 h-5 fill-current" />
                <h3 className="text-[16px] font-black">{t('phoneLabel')}</h3>
              </div>
              <p className="text-[14px] text-[#666666]">
                {t('contactPhoneShort')}
              </p>
            </div>
            
            <div className="w-full h-[1px] bg-gray-100"></div>

            {/* Email */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#1A1A1A]">
                <Mail className="w-5 h-5" />
                <h3 className="text-[16px] font-black">{t('emailLabel')}</h3>
              </div>
              <p className="text-[14px] text-[#666666]">
                soilandwatergroup@doa.in.th
              </p>
            </div>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer className="bg-[#1A1A1A] py-8 px-4 w-full flex flex-col items-center justify-center space-y-4">
        <div className="flex flex-col items-center justify-center gap-3">
          {/* NECTEC Logo */}
          <div className="h-10 flex items-center justify-center bg-white rounded-md p-1">
            <img src="/img/soil_all_scenes_2-30.png" alt="NECTEC" className="h-full w-auto object-contain" />
          </div>

          {/* Circular Logos */}
          <div className="flex items-center justify-center gap-4">
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 overflow-hidden">
              <img src="/img/ตรากรมวิชาการเกษตร.svg" alt="DOA" className="w-full h-full object-contain" />
            </div>
            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center p-1 overflow-hidden">
              <img src="/img/ARDA.gif" alt="ARDA" className="w-full h-full object-contain" />
            </div>
          </div>
        </div>
        <p className="text-[10px] text-gray-500 text-center max-w-[250px]">
          {t('copyright')}
        </p>
      </footer>
    </div>
  )
}
