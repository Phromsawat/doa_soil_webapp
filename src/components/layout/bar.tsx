"use client"

import { ArrowLeft, Home, Sprout, History, User, Info, Phone as PhoneIcon, Menu, X, ChevronDown, Map as MapIcon } from "lucide-react"
import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useLanguage } from "@/components/providers/LanguageProvider"
import { useUser, useIsAdmin } from "@/lib/supabase/useUser"
import { useShowSoilMap } from "@/lib/supabase/useSettings"
import { signOut } from "@/lib/supabase/auth"
import { useState, useEffect } from "react"

export default function Bar() {
  const pathname = usePathname()
  const router = useRouter()
  const { language, setLanguage, t } = useLanguage()
  // สถานะล็อกอิน — ใช้ตัดสินใจว่าจะโชว์ปุ่ม "เข้าสู่ระบบ" หรือโปรไฟล์ผู้ใช้
  const { user, displayName, isAnonymous, initial } = useUser()
  const { isAdmin } = useIsAdmin()
  // แผนที่ดิน: default ซ่อน — โชว์ในเมนูต่อเมื่อ admin เปิดไว้ที่ /admin/settings
  const showSoilMap = useShowSoilMap()
  // useIsAdmin อ่าน localStorage ตอน init -> ค่า render แรกฝั่ง client อาจต่างจาก server
  // ทำให้ hydration mismatch จนหน้าเว็บกดไม่ได้ จึงรอ mount ก่อนค่อยใช้ค่านี้
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const [activeHash, setActiveHash] = useState("")
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)

  useEffect(() => {
    if (typeof window !== "undefined") {
      setActiveHash(window.location.hash)
    }
    const handleHashChange = () => setActiveHash(window.location.hash)
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  useEffect(() => {
    const handleToggleMenu = () => {
      if (user) {
        setIsProfileOpen(prev => !prev)
      } else {
        setIsMobileMenuOpen(prev => !prev)
      }
    }
    window.addEventListener("toggle-mobile-menu", handleToggleMenu)
    return () => window.removeEventListener("toggle-mobile-menu", handleToggleMenu)
  }, [user])

  useEffect(() => {
    // Reset hash when changing pages entirely
    if (typeof window !== "undefined") {
      setActiveHash(window.location.hash)
    }
  }, [pathname])

  const isAnalyzeMain = pathname === "/analyze"
  const isAnalyzeSub = pathname !== "/analyze" && pathname.startsWith("/analyze")
  const isAnalyze = pathname.startsWith("/analyze")
  const isHistory = pathname.startsWith("/history")

  if (pathname === "/login") {
    return null
  }

  let title = "DOA-Soil Test Kit"
  let showBack = false
  let centerTitle = false

  if (isAnalyzeMain) {
    title = "วิเคราะห์ดิน"
    showBack = true
    centerTitle = true
  } else if (isAnalyzeSub) {
    if (pathname === "/analyze/upload") {
      title = "อัปโหลดรูปภาพ"
    } else if (pathname === "/analyze/form") {
      title = "คำนวณปุ๋ย"
    } else if (pathname === "/analyze/map") {
      title = "เลือกพิกัดบนแผนที่"
    } else if (pathname === "/analyze/result") {
      title = "ผลการทำนาย"
    } else {
      title = "วิเคราะห์ดิน"
    }
    showBack = true
    centerTitle = true
  } else if (isHistory) {
    title = "ประวัติการวิเคราะห์"
    showBack = true
    centerTitle = true
  } else if (pathname === "/map") {
    title = "แผนที่"
    showBack = true
    centerTitle = true
  } else if (pathname === "/ledger") {
    title = "สมุดบัญชี"
    showBack = true
    centerTitle = true
  }

  const navLinks = [
    { href: "/", label: t('homeMenu'), icon: Home },
    ...(showSoilMap ? [{ href: "/map", label: t('mapMenu'), icon: MapIcon }] : []),
    { href: "/#about", label: t('aboutMenu'), icon: Info },
    { href: "/#terms", label: t('termsMenu'), icon: Info },
    { href: "/#contact", label: t('contactMenu'), icon: PhoneIcon },
  ]

  return (
    <>
      <header className="h-11 lg:h-16 flex items-center px-4 fixed top-0 left-0 right-0 z-40 bg-white/60 backdrop-blur-lg border-b border-white/20 shadow-sm justify-between">

      {(
        centerTitle ? (
          <>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {(pathname === '/analyze/upload' || pathname === '/analyze/form') ? (
                <div className="relative pointer-events-auto">
                  <button
                    onClick={() => setIsDropdownOpen(o => !o)}
                    className="flex items-center gap-1 font-semibold font-thai text-lg text-text-primary"
                  >
                    {title} <ChevronDown className={`w-5 h-5 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>
                  {isDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setIsDropdownOpen(false)} />
                      <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-lg border border-gray-100 py-2 w-52 z-20">
                        <Link href="/analyze/upload" onClick={() => setIsDropdownOpen(false)} className={`block px-4 py-2.5 hover:bg-gray-50 text-[15px] font-thai ${pathname === '/analyze/upload' ? 'text-primary font-semibold' : 'text-gray-700'}`}>อัปโหลดรูปภาพ</Link>
                        <Link href="/analyze/form" onClick={() => setIsDropdownOpen(false)} className={`block px-4 py-2.5 hover:bg-gray-50 text-[15px] font-thai ${pathname === '/analyze/form' ? 'text-primary font-semibold' : 'text-gray-700'}`}>คำนวณปุ๋ย</Link>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <h2 className="font-semibold font-thai text-lg text-text-primary">
                  {title}
                </h2>
              )}
            </div>
            <div className="flex items-center gap-3 relative z-10">
              {showBack && pathname !== '/analyze/map' && (
                <button onClick={() => router.push('/')} className="hidden lg:flex items-center gap-1 p-1 -ml-1 pr-2 text-text-primary hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                  <span className="font-thai font-medium text-[15px]">หน้าหลัก</span>
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 relative z-10">
            {showBack ? (
              <button onClick={() => router.push('/')} className="hidden lg:flex items-center gap-1 p-1 -ml-1 pr-2 text-text-primary hover:bg-gray-100 rounded-full transition-colors">
                <ArrowLeft className="w-6 h-6" />
                <span className="font-thai font-medium text-[15px]">หน้าหลัก</span>
              </button>
            ) : (
              <button onClick={() => router.push('/')} className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 hover:bg-gray-100 transition-colors">
                <img src="/doa-logo.svg" alt="DOA Logo" className="w-full h-full object-contain cursor-pointer" />
              </button>
            )}
            <h2 className={`font-semibold font-thai ${showBack ? 'text-lg text-text-primary' : 'text-base text-[#1A1A1A]'}`}>
              {title}
            </h2>
          </div>
        )
      )}

      {!(isAnalyzeMain || isAnalyzeSub) && (
        <div className="flex items-center gap-10">
          <div className="hidden lg:flex items-center gap-6">
            {pathname === '/' && navLinks.map((link) => {
              const hash = link.href.split('/')[1] || '';
              const isActive = activeHash === hash || (activeHash === '' && link.href === '/');

              if (link.href === "/#terms") {
                return (
                  <button
                    key={link.href}
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        window.dispatchEvent(new CustomEvent('openTermsModal'));
                      }
                    }}
                    className={`font-normal hover:text-[#1A4D2E] transition-colors flex items-center text-[15px] cursor-pointer ${isActive ? 'text-[#1A4D2E]' : 'text-[#1A1A1A]'}`}
                  >
                    {link.label}
                  </button>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setActiveHash(hash)}
                  className={`font-normal hover:text-[#1A4D2E] transition-colors flex items-center text-[15px] ${isActive ? 'text-[#1A4D2E]' : 'text-[#1A1A1A]'}`}
                >
                  {link.label}
                </Link>
              )
            })}

            <div className="flex items-center gap-3 ml-2">
              {pathname === '/' && (
                <button
                  onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
                  className="relative flex items-center w-[84px] h-[34px] bg-[#F5F5F5] hover:bg-[#EBEBEB] rounded-full transition-colors"
                >
                  <span className={`absolute text-sm font-medium text-[#1A1A1A] transition-all duration-300 ease-in-out ${language === 'th' ? 'right-3' : 'left-3'}`}>
                    {language === 'th' ? 'ไทย' : 'EN'}
                  </span>
                  <img
                    src={language === 'th' ? "https://flagcdn.com/w40/th.png" : "https://flagcdn.com/w40/gb.png"}
                    alt={language === 'th' ? "Thai Flag" : "UK Flag"}
                    className={`absolute w-5 h-5 rounded-full object-cover border border-white/50 shadow-sm bg-white transition-all duration-300 ease-in-out ${language === 'th' ? 'left-2' : 'left-[56px]'}`}
                  />
                </button>
              )}
              {user ? (
                /* ล็อกอินแล้ว -> ปุ่มโปรไฟล์ (ตัวเปิด profile drawer) */
                <button
                  onClick={() => setIsProfileOpen(true)}
                  aria-label="โปรไฟล์"
                  title={displayName ?? (isAnonymous ? "ผู้ใช้ทั่วไป" : "โปรไฟล์")}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1A4D2E] text-sm font-bold text-white shadow-sm transition-all hover:bg-[#143a22]"
                >
                  {initial}
                </button>
              ) : pathname === '/' ? (
                <Link href="/login" className="flex items-center justify-center py-1.5 px-4 w-[120px] bg-[#1A4D2E] hover:bg-[#143a22] text-white rounded-full font-medium transition-all shadow-sm text-sm">
                  {t('login')}
                </Link>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </header>

    {/* Mobile Drawer Menu */}
        <>
          {/* Overlay */}
          <div 
            className={`fixed inset-0 bg-black/40 z-[1200] lg:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
            onClick={() => setIsMobileMenuOpen(false)}
          />
          
          {/* Drawer */}
          <div 
            className={`fixed top-0 right-0 h-full w-[240px] bg-[#F5F5F5] z-[1300] lg:hidden transform transition-transform duration-300 ease-in-out flex flex-col p-6 shadow-2xl overflow-y-auto ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="flex justify-end mb-8">
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 -mr-4 text-gray-500 hover:text-gray-800 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex flex-col gap-8">
              {navLinks.map((link) => {
                // Hide Home link in mobile drawer since it's already in the BottomNav
                if (link.href === "/") return null;

                const Icon = link.icon
                let isActive = false
                if (link.href.startsWith("/#")) {
                  isActive = pathname === "/" && activeHash === link.href.substring(1)
                } else if (link.href === "/") {
                  isActive = pathname === "/" && !activeHash
                } else {
                  isActive = pathname.startsWith(link.href)
                }

                // Special handling for Terms link in mobile drawer
                if (link.href === "/#terms") {
                  return (
                    <button
                      key={link.href}
                      className="flex items-center gap-3 text-[16px] font-thai text-[#1A1A1A] font-normal hover:text-primary transition-colors text-left"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        window.dispatchEvent(new CustomEvent('openTermsModal'));
                      }}
                    >
                      <span>{link.label}</span>
                    </button>
                  );
                }

                return (
                  <Link
                    key={link.href}
                    href={link.href === "/analyze" ? "/analyze/upload" : link.href}
                    className={`flex items-center gap-3 text-[16px] font-thai transition-colors ${isActive ? 'text-primary font-medium' : 'text-[#1A1A1A] font-normal hover:text-primary'}`}
                    onClick={(e) => {
                      setIsMobileMenuOpen(false);
                      if (link.href.startsWith("/#") && pathname === "/") {
                        e.preventDefault();
                        const targetId = link.href.substring(2);
                        const element = document.getElementById(targetId);
                        if (element) {
                          element.scrollIntoView({ behavior: "smooth" });
                          window.history.pushState(null, '', link.href);
                          setActiveHash(link.href.substring(1));
                        }
                      } else if (link.href === "/" && pathname === "/") {
                        e.preventDefault();
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        window.history.pushState(null, '', '/');
                        setActiveHash("");
                      }
                    }}
                  >
                    <span>{link.label}</span>
                  </Link>
                )
              })}
              
              <button 
                onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
                className="flex items-center gap-3 text-[#1A1A1A] font-thai text-[16px] font-normal transition-opacity hover:opacity-80"
              >
                <img 
                  src={language === 'th' ? "https://flagcdn.com/w40/th.png" : "https://flagcdn.com/w40/gb.png"} 
                  alt={language === 'th' ? "Thai Flag" : "UK Flag"} 
                  className="w-6 h-6 rounded-full object-cover shadow-sm border border-black/10" 
                />
                <span>{language === 'th' ? 'ไทย' : 'EN'}</span>
              </button>

              {!user && (
                <Link
                  href="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="mt-2 flex items-center justify-center w-full py-2 bg-[#E1F0E5] hover:bg-[#d1e6d8] text-[#1A1A1A] rounded-full font-medium transition-all shadow-sm"
                >
                  {t('login')}
                </Link>
              )}
            </div>
          </div>
        </>

      {/* Profile Drawer */}
      <div
        className={`fixed inset-0 bg-black/40 z-[1200] transition-opacity duration-300 ${isProfileOpen ? 'opacity-100 visible' : 'opacity-0 invisible'}`}
        onClick={() => setIsProfileOpen(false)}
      />

      <div
        className="fixed top-0 right-0 h-full w-[240px] bg-[#F5F5F5] z-[1300] transition-transform duration-300 ease-in-out flex flex-col p-6 shadow-2xl overflow-y-auto"
        style={{ transform: isProfileOpen ? "translateX(0)" : "translateX(100%)" }}
      >
        <div className="flex justify-end mb-8">
          <button onClick={() => setIsProfileOpen(false)} className="p-2 -mr-4 text-gray-500 hover:text-gray-800 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex flex-col gap-8 flex-1">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1A4D2E] text-white flex items-center justify-center text-sm font-bold shrink-0">
              {displayName ? displayName.charAt(0).toUpperCase() : isAnonymous ? "?" : "O"}
            </div>
            <span className="font-medium text-[#1A1A1A] text-[16px] font-thai truncate">
              {displayName ?? (isAnonymous ? t('anonymousUserName') : t('userName'))}
            </span>
          </div>

          <Link href="/" onClick={() => setIsProfileOpen(false)} className="text-[16px] font-thai text-[#1A1A1A] font-normal hover:text-primary transition-colors">
            {t('homeMenu')}
          </Link>
          {!isAnonymous && (
            <Link href="/history" onClick={() => setIsProfileOpen(false)} className="text-[16px] font-thai text-[#1A1A1A] font-normal hover:text-primary transition-colors">
              {t('analysisHistory')}
            </Link>
          )}
          {!isAnonymous && (
            <Link href="/ledger" onClick={() => setIsProfileOpen(false)} className="text-[16px] font-thai text-[#1A1A1A] font-normal hover:text-primary transition-colors">
              {t('ledgerMenu')}
            </Link>
          )}
          {showSoilMap && (
            <Link href="/map" onClick={() => setIsProfileOpen(false)} className="text-[16px] font-thai text-[#1A1A1A] font-normal hover:text-primary transition-colors">
              {t('mapMenu')}
            </Link>
          )}
          {mounted && isAdmin && (
            <Link href="/admin" onClick={() => setIsProfileOpen(false)} className="text-[16px] font-thai text-primary font-medium hover:opacity-80 transition-opacity">
              {t('adminMenu')}
            </Link>
          )}
          <Link href="/profile" onClick={() => setIsProfileOpen(false)} className="text-[16px] font-thai text-[#1A1A1A] font-normal hover:text-primary transition-colors">
            {t('editProfile')}
          </Link>
          <Link href="/profile/change-password" onClick={() => setIsProfileOpen(false)} className="text-[16px] font-thai text-[#1A1A1A] font-normal hover:text-primary transition-colors">
            {t('changePassword')}
          </Link>

          <button
            onClick={() => setLanguage(language === 'th' ? 'en' : 'th')}
            className="flex items-center gap-3 text-[#1A1A1A] font-thai text-[16px] font-normal transition-opacity hover:opacity-80"
          >
            <img
              src={language === 'th' ? "https://flagcdn.com/w40/th.png" : "https://flagcdn.com/w40/gb.png"}
              alt={language === 'th' ? "Thai Flag" : "UK Flag"}
              className="w-6 h-6 rounded-full object-cover shadow-sm border border-black/10"
            />
            <span>{language === 'th' ? 'ไทย' : 'EN'}</span>
          </button>

          <button
            onClick={async () => {
              setIsProfileOpen(false)
              try { await signOut() } catch { /* ออกจากระบบไม่สำเร็จก็ยังพากลับหน้าหลัก */ }
              window.location.href = '/'
            }}
            className="flex items-center justify-center w-full py-2 bg-[#FEE9D6] hover:bg-[#fddcc0] text-[#C05C00] rounded-full font-medium transition-all shadow-sm text-[15px] font-thai"
          >
            {t('signOutBtn')}
          </button>
        </div>

        <div className="pt-10 text-center">
          <p className="text-[12px] text-gray-400">version 2.2.0</p>
        </div>
      </div>
    </>
  )
}
