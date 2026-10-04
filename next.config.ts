import type { NextConfig } from "next";

// Security headers ทุกหน้า
// - ห้ามเว็บอื่นฝังหน้าเราใน iframe (clickjacking) — สำคัญกับหน้าแอดมินที่มีปุ่มลบ
//   ใช้ทั้ง X-Frame-Options (เบราว์เซอร์เก่า) และ CSP frame-ancestors (มาตรฐานปัจจุบัน)
//   ไม่กระทบแผนที่ Google ที่เราฝังในหน้าเรา — กติกานี้คุมแค่ "คนอื่นฝังเรา"
// - nosniff: ไม่ให้เบราว์เซอร์เดาชนิดไฟล์เอง
// - geolocation/camera ใช้ได้เฉพาะเว็บเรา (ปักหมุดตำแหน่งของฉัน / ถ่ายรูปแผ่นทดสอบ)
const SECURITY_HEADERS = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "geolocation=(self), camera=(self), microphone=()" },
];

const nextConfig: NextConfig = {
  devIndicators: false,
  poweredByHeader: false, // ไม่บอกว่าใช้ Next.js (ลดข้อมูลให้ผู้โจมตี)
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  experimental: {
    serverActions: {
      // Bump upload limit (3 photos × ~5MB each + form payload)
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
