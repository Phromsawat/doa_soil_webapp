"use client"

import React from "react"

export default function MyPage() {
  return (
    <div className="flex flex-col min-h-[100dvh] w-full -mt-16 overflow-hidden relative">
      <div className="absolute inset-0 -m-[100px]">
        <iframe 
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3875.33405703792!2d100.57393281533261!3d13.844111390282121!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x30e29cf7f8db8ba9%3A0x6b10705a3b90be05!2sDepartment%20of%20Agriculture!5e0!3m2!1sen!2sth!4v1689255018610!5m2!1sen!2sth"
          width="100%" 
          height="100%" 
          style={{ border: 0 }} 
          allowFullScreen={true} 
          loading="lazy" 
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full grayscale opacity-80"
        ></iframe>
      </div>
    </div>
  )
}
