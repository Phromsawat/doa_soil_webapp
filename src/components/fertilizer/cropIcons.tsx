// ไอคอน SVG รายพืช (วาดเอง) — self-contained ไม่พึ่งรูปภายนอก
// เก็บเป็น "inner markup" ของ <svg viewBox="0 0 24 24"> เพื่อใช้ได้ทั้งใน React และพรีวิว
// พืชที่ไม่มีไอคอนเฉพาะ -> fallback เป็นไอคอนประเภท (CATEGORY_ICON_SVG)

export const CROP_ICON_SVG: Record<string, string> = {
  // ── ไม้ผล ─────────────────────────────────────────────
  ทุเรียน: `
    <path d="M12 5.4c.3-1.3 1.9-1.5 2.5-.4" fill="none" stroke="#6b4f2a" stroke-width="1.4" stroke-linecap="round"/>
    <ellipse cx="12" cy="14" rx="6.8" ry="7.3" fill="#84a049"/>
    <g stroke="#5e7530" stroke-width="1.1" stroke-linecap="round">
      <path d="M9 11l1.3 1.5M12 10.2l1.3 1.5M15 11.2l1.3 1.5M10.5 14l1.3 1.5M13.5 14l1.3 1.5M12 16.6l1.3 1.5"/>
    </g>
    <g stroke="#5e7530" stroke-width="1" stroke-linecap="round">
      <path d="M12 6.7V5M16 8.2l1.3-1.3M18.6 12l1.6-.6M18.4 16.4l1.6.8M6 8.2 4.7 6.9M5.4 12 3.8 11.4M5.6 16.4 4 17.2"/>
    </g>`,
  มังคุด: `
    <rect x="11.1" y="4.4" width="1.8" height="2.4" rx=".8" fill="#6b4f2a"/>
    <path d="M12 8.2c-2.2 0-3.6-1.4-4.6-.8.7 1.7 2.4 2.6 4.6 2.6s3.9-.9 4.6-2.6c-1-.6-2.4.8-4.6.8z" fill="#4a7c3a"/>
    <circle cx="12" cy="14.5" r="6.8" fill="#5b2b45"/>
    <circle cx="12" cy="14.5" r="2.2" fill="#8a4d68"/>
    <path d="M12 12.3l.7 1.4 1.5.2-1.1 1 .3 1.5-1.4-.7-1.4.7.3-1.5-1.1-1 1.5-.2z" fill="#f0d9e4"/>`,
  เงาะ: `
    <path d="M12 7.5c.4-1.4 2-1.6 2.7-.5" fill="none" stroke="#6b4f2a" stroke-width="1.3" stroke-linecap="round"/>
    <ellipse cx="12" cy="14.5" rx="5.6" ry="6.2" fill="#cf3a2f"/>
    <g stroke="#e0673f" stroke-width="1.2" stroke-linecap="round">
      <path d="M6.6 12.5 4.4 11.6M6.2 15 4 15.2M7 17.4l-1.8 1.4M9 18.9l-1 2M12 19.6v2.1M15 18.9l1 2M17 17.4l1.8 1.4M17.8 15 20 15.2M17.4 12.5l2.2-.9M16.4 10.4l1.6-1.5M7.6 10.4 6 8.9"/>
    </g>`,
  มะม่วง: `
    <path d="M8.5 5.6c-1-1.3-2.9-1.5-3.9-.8.5 1.6 2.1 2.4 3.7 2.2z" fill="#4a7c3a"/>
    <path d="M9 6.5c5-2.6 10 1 9.2 6.4-.7 4.6-5.4 7.3-9 6-3.8-1.4-4.6-5.4-3.4-8.7C6.4 8.4 7.5 7.2 9 6.5z" fill="#e5b62c"/>
    <path d="M9.5 9c2.5-1 5.3.4 6 3" fill="none" stroke="#f2d271" stroke-width="1" stroke-linecap="round"/>`,
  ลำไย: `
    <g stroke="#6b4f2a" stroke-width="1" stroke-linecap="round"><path d="M9 11 8 6M15 11l1-5M12 10V4"/></g>
    <circle cx="9" cy="14.5" r="4.1" fill="#c9a066"/>
    <circle cx="15" cy="14.5" r="4.1" fill="#b98d55"/>
    <circle cx="12" cy="10.6" r="4.1" fill="#cfa870"/>
    <g fill="#8a6438"><circle cx="9" cy="14.5" r="1"/><circle cx="15" cy="14.5" r="1"/><circle cx="12" cy="10.6" r="1"/></g>`,
  ลิ้นจี่: `
    <path d="M12 7.4c-1-1.3-2.9-1.5-3.9-.8.5 1.6 2.1 2.4 3.7 2.2z" fill="#4a7c3a"/>
    <circle cx="12" cy="14.4" r="6.6" fill="#cf3a3a"/>
    <g fill="#a52c2c"><circle cx="9.4" cy="12.3" r="1.1"/><circle cx="13" cy="11.4" r="1.1"/><circle cx="15" cy="14" r="1.1"/><circle cx="11" cy="15.4" r="1.1"/><circle cx="14.3" cy="16.6" r="1.1"/><circle cx="9" cy="16.4" r="1.1"/></g>`,
  ส้ม: `
    <path d="M13 6.2c1-2 3.2-2.5 4.8-1.6-.5 1.9-2.3 3-4.4 2.7z" fill="#4a7c3a"/>
    <circle cx="12" cy="14" r="7" fill="#f08a1d"/>
    <circle cx="9.6" cy="11.4" r="1.6" fill="#f7ab52" opacity=".7"/>`,
  มะพร้าว: `
    <circle cx="12" cy="13" r="7.6" fill="#7a5230"/>
    <path d="M12 5.5c3.5 0 6.8 1.4 8 3.2" fill="none" stroke="#93683f" stroke-width="1" opacity=".6"/>
    <circle cx="9.6" cy="11.2" r="1.2" fill="#3f2a17"/>
    <circle cx="14.4" cy="11.2" r="1.2" fill="#3f2a17"/>
    <circle cx="12" cy="14.8" r="1.2" fill="#3f2a17"/>`,
  สับปะรด: `
    <g fill="#4a8a3a"><path d="M12 2.4l1.8 3.8-1.8-.6-1.8.6z"/><path d="M9 4.4l1.6 3.2-2.4-1.2-1-2z"/><path d="M15 4.4l-1.6 3.2 2.4-1.2 1-2z"/></g>
    <ellipse cx="12" cy="15" rx="5.6" ry="6.2" fill="#e0a92a"/>
    <g stroke="#b7861f" stroke-width=".8" stroke-linecap="round"><path d="M8 12l3.5 3.5M16 12l-3.5 3.5M9 15.5l2.5 2.5M15 15.5l-2.5 2.5M8.6 18l1.6 1.6M15.4 18l-1.6 1.6"/></g>`,

  // ── พืชไร่ ─────────────────────────────────────────────
  อ้อยปลูก: `
    <g stroke="#6f9b3f" stroke-width="2.6" stroke-linecap="round"><path d="M8 3.5v17M12 3v17.5M16 4v16.5"/></g>
    <g stroke="#4f7328" stroke-width="1" stroke-linecap="round"><path d="M6.7 8.5h2.6M10.7 8h2.6M14.7 8.7h2.6M6.7 13h2.6M10.7 12.7h2.6M14.7 13.2h2.6M10.7 17.5h2.6"/></g>
    <path d="M12 3c-1.6-1-3.4-1-4.6-.2 1 1.4 2.8 1.7 4.4 1z" fill="#5a8a35"/>`,
  อ้อยตอ: `
    <g stroke="#6f9b3f" stroke-width="2.6" stroke-linecap="round"><path d="M8 3.5v17M12 3v17.5M16 4v16.5"/></g>
    <g stroke="#4f7328" stroke-width="1" stroke-linecap="round"><path d="M6.7 8.5h2.6M10.7 8h2.6M14.7 8.7h2.6M6.7 13h2.6M10.7 12.7h2.6M14.7 13.2h2.6M10.7 17.5h2.6"/></g>
    <path d="M12 3c-1.6-1-3.4-1-4.6-.2 1 1.4 2.8 1.7 4.4 1z" fill="#5a8a35"/>`,
  ข้าวโพดฝักสด: `
    <path d="M12 21c-3.5 0-5-3-6-6 3.2-.3 5 2.4 6 6z" fill="#5a8a35"/>
    <path d="M12 21c3.5 0 5-3 6-6-3.2-.3-5 2.4-6 6z" fill="#68a03e"/>
    <path d="M12 3.2c2.8 0 4.6 3 4.6 8.2S14.8 21 12 21s-4.6-4.4-4.6-9.6S9.2 3.2 12 3.2z" fill="#f2c53d"/>
    <g fill="#cf9e1f"><circle cx="10.4" cy="9" r=".7"/><circle cx="13.6" cy="9" r=".7"/><circle cx="12" cy="10.6" r=".7"/><circle cx="10.4" cy="12.4" r=".7"/><circle cx="13.6" cy="12.4" r=".7"/><circle cx="12" cy="14" r=".7"/><circle cx="10.6" cy="15.8" r=".7"/><circle cx="13.4" cy="15.8" r=".7"/></g>`,
  ข้าวโพดเลี้ยงสัตว์: `
    <path d="M12 21c-3.5 0-5-3-6-6 3.2-.3 5 2.4 6 6z" fill="#5a8a35"/>
    <path d="M12 21c3.5 0 5-3 6-6-3.2-.3-5 2.4-6 6z" fill="#68a03e"/>
    <path d="M12 3.2c2.8 0 4.6 3 4.6 8.2S14.8 21 12 21s-4.6-4.4-4.6-9.6S9.2 3.2 12 3.2z" fill="#e0a92a"/>
    <g fill="#b7861f"><circle cx="10.4" cy="9" r=".7"/><circle cx="13.6" cy="9" r=".7"/><circle cx="12" cy="10.6" r=".7"/><circle cx="10.4" cy="12.4" r=".7"/><circle cx="13.6" cy="12.4" r=".7"/><circle cx="12" cy="14" r=".7"/><circle cx="10.6" cy="15.8" r=".7"/><circle cx="13.4" cy="15.8" r=".7"/></g>`,
  มันสำปะหลัง: `
    <g stroke="#4a7c3a" stroke-width="1.5" stroke-linecap="round"><path d="M12 9V3.5M12 9 8.4 4.8M12 9l3.6-4.2M12 9 7.2 7.2M12 9l4.8-1.8"/></g>
    <path d="M11 10c-2.4 2-4.2 5.6-4 9.4.1 1.4 1.6 1.8 2.4.8 1.8-2.4 3-6 3.2-9.2z" fill="#9c6b3f"/>
    <path d="M13 10.4c2 1.4 3.6 4 4.2 7.2.3 1.4-1.1 2.2-2.1 1.3-1.6-1.6-2.6-4.6-2.8-7.4z" fill="#b07a49"/>`,
  ถั่ว: `
    <path d="M5 15.5c1.8-6.4 8-9.6 13.4-8.6-2 5.4-8.2 9.6-13.4 8.6z" fill="#6aa03a"/>
    <path d="M6 14.6c1.8-5.2 6.8-8 11.4-7.6" fill="none" stroke="#4f7d28" stroke-width="1" stroke-linecap="round"/>
    <g fill="#9ccf5f"><circle cx="9" cy="12.8" r="1.4"/><circle cx="11.8" cy="11.2" r="1.4"/><circle cx="14.6" cy="10" r="1.4"/></g>`,

  // ── พืชผัก ─────────────────────────────────────────────
  มันฝรั่ง: `
    <ellipse cx="12" cy="13" rx="8" ry="6" fill="#c8a06a" transform="rotate(-12 12 13)"/>
    <g fill="#96703f"><ellipse cx="9" cy="12" rx=".9" ry=".6"/><ellipse cx="13" cy="14.3" rx=".9" ry=".6"/><ellipse cx="15.2" cy="11.2" rx=".9" ry=".6"/><ellipse cx="11" cy="10.4" rx=".9" ry=".6"/></g>`,
  มันเทศ: `
    <path d="M4.6 15.4c1-5.2 7.2-9.4 12.6-8.6 2.4 4-2.4 9.6-8 11-2.6.6-5-.2-4.6-2.4z" fill="#b5623f"/>
    <path d="M6.2 14.6c1.4-4 6-7 10.6-7" fill="none" stroke="#8a4a30" stroke-width="1" stroke-linecap="round"/>
    <path d="M17 6.8c1.4-.8 2.6-2.4 2.4-3.8-1.6.2-2.8 1.6-3 3.2z" fill="#5a8a35"/>`,
  เผือก: `
    <path d="M12 8.6C10 3.8 4.6 5.2 5 8.4c.3 2.2 4 3 7 .2z" fill="#5a8a35"/>
    <ellipse cx="12" cy="15" rx="6" ry="6.6" fill="#9384ab"/>
    <g stroke="#6f5f88" stroke-width=".9" stroke-linecap="round"><path d="M6.4 13.4h11.2M6.6 16.2h10.8M8 18.6h8"/></g>`,
  หน่อไม้ฝรั่ง: `
    <g fill="#5f9a39"><path d="M8 21V9.5c0-.8.4-1.4 1-2l1-1.4 1 1.4c.6.6 1 1.2 1 2V21z" opacity=".85"/><path d="M11 21V8c0-.9.5-1.6 1.1-2.3L13 4l.9 1.7c.6.7 1.1 1.4 1.1 2.3v13z"/></g>
    <g stroke="#3f6e26" stroke-width=".8" stroke-linecap="round"><path d="M10 8l1 1M10 11l1 1M13 7l1 1M13 10l1 1M13 13l1 1"/></g>`,
  กระเทียม: `
    <path d="M12 4.6c3.2 2 5.2 6.2 4.2 10.4-.8 3.4-7.6 3.4-8.4 0C6.8 10.8 8.8 6.6 12 4.6z" fill="#efe8f0"/>
    <path d="M12 5.2v14.6M9 8c-.6 4.2 0 8 0 8M15 8c.6 4.2 0 8 0 8" fill="none" stroke="#cdbfd0" stroke-width=".9" stroke-linecap="round"/>
    <path d="M12 4.6c.4-1.2 0-2.4-.6-3-.6.8-.7 1.9-.2 3z" fill="#c7b98a"/>
    <g stroke="#b9a98f" stroke-width=".9" stroke-linecap="round"><path d="M10 19.4c-.2 1-.8 1.8-1.2 2M12 19.8v2M14 19.4c.2 1 .8 1.8 1.2 2"/></g>`,
  หอมแดง: `
    <g stroke="#5a8a35" stroke-width="1.2" stroke-linecap="round"><path d="M10 8C9.4 5 9 3.4 9 3.4M13.4 8.2c.8-2.6 1.6-4 1.6-4"/></g>
    <path d="M9.4 9.2c1.6-1.8 3.4-1.8 4.8.2 1.2 1.8 1 4.6-.6 6-1.6 1.4-4 1.2-5.2-.6-1-1.6-.6-4 1-5.6z" fill="#a5503a"/>
    <path d="M11.8 8.6c-1.2 3.2-1.2 6.6 0 9.6" fill="none" stroke="#7d3a2a" stroke-width=".9" stroke-linecap="round"/>`,
  หอมหัวใหญ่: `
    <g stroke="#5a8a35" stroke-width="1.2" stroke-linecap="round"><path d="M12 8V3.4M10 8.4C8.8 5.6 8 4.2 8 4.2M14 8.4c1.2-2.8 2-4.2 2-4.2"/></g>
    <path d="M12 8.4c4 0 6 4 6 7 0 3.2-3 5.2-6 5.2s-6-2-6-5.2c0-3 2-7 6-7z" fill="#d9b98f"/>
    <path d="M12 8.4v12M8.6 10.6c-1.2 4-.2 8-.2 8M15.4 10.6c1.2 4 .2 8 .2 8" fill="none" stroke="#b48f63" stroke-width=".9" stroke-linecap="round"/>`,
  พริก: `
    <path d="M7.8 6.6c-1.4-1-3-1.2-3.8-.6.6 1.4 2 2 3.6 1.8z" fill="#5a8a35"/>
    <path d="M6.6 6.8c1.2 6.2 5.6 11.4 10.8 12 1.2.2 1.6-1.2.6-1.7-4.6-1-8.2-5.6-9.2-10.4-.3-1.4-2.4-1.2-2.2.1z" fill="#cf2f2f"/>`,
  มะเขือ: `
    <path d="M8.6 7c1.4-1 3-1.2 4-.6 1-.6 2.6-.5 4 .5-1 1.5-2.7 2.1-4 1.7-1.4.4-3-.1-4-1.6z" fill="#5a8a35"/>
    <path d="M9.4 8.6c4-2 8.4 1 8.4 6.2 0 4.2-3.6 6.6-7 6.4-3.6-.2-6-3.4-5.6-7 .3-2.8 1.8-4.6 4.2-5.6z" fill="#6d3f8c"/>
    <path d="M9 12c1.4-1.6 3.4-2.4 5.2-2.2" fill="none" stroke="#9166b0" stroke-width="1" stroke-linecap="round"/>`,
  มะเขือเทศ: `
    <path d="M12 5l1.4 2.7 2.9-.8-1.1 2.8L17 11l-2.8.4L12 14l-1.4-2.6L7 11l1.8-1.3L7.7 7l2.9.8z" fill="#4a8a35"/>
    <rect x="11.2" y="3.6" width="1.6" height="2.2" rx=".7" fill="#4a8a35"/>
    <circle cx="12" cy="14.6" r="6.6" fill="#d63a2f"/>
    <ellipse cx="9.6" cy="12.4" rx="1.7" ry="1.2" fill="#e9756a" opacity=".7"/>`,
  กระเจี๊ยบเขียว: `
    <path d="M12 4l-1.8 2M12 4l1.8 2" fill="none" stroke="#4a7c28" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M11 6.2h2c1 4.2 1 10.4-.1 15.2-.2 1-1.6 1-1.8 0C10 16.6 10 10.4 11 6.2z" fill="#5f9a35"/>
    <g stroke="#48781f" stroke-width=".7" stroke-linecap="round"><path d="M12 7v13.5M10.4 9.4v9.6M13.6 9.4v9.6"/></g>`,
  ผัก: `
    <path d="M12 21c-3.4 0-5.4-2.2-5.4-5.2 0-4.4 2.2-9.4 5.4-13.2 3.2 3.8 5.4 8.8 5.4 13.2 0 3-2 5.2-5.4 5.2z" fill="#4a8a35"/>
    <path d="M12 4.6v15.8" fill="none" stroke="#8fce62" stroke-width="1.1" stroke-linecap="round"/>
    <path d="M12 9c-1.6 1-2.6 2.6-3 4.4M12 9c1.6 1 2.6 2.6 3 4.4" fill="none" stroke="#3c7029" stroke-width=".8" stroke-linecap="round"/>`,

  // ── ข้าว ───────────────────────────────────────────────
  ข้าวไวแสง: `
    <path d="M12 21V8c1.6-2.6 3.4-4 3.4-4" fill="none" stroke="#a58a3e" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M12 12c-2-2-4-2.6-6-2.4 1 1.8 3 3 5.4 3" fill="#68a03e"/>
    <g fill="#d9b84a"><ellipse cx="14.4" cy="5.6" rx="1" ry="2" transform="rotate(30 14.4 5.6)"/><ellipse cx="15.6" cy="8" rx="1" ry="2" transform="rotate(35 15.6 8)"/><ellipse cx="16" cy="10.6" rx="1" ry="2" transform="rotate(45 16 10.6)"/><ellipse cx="15.4" cy="13.2" rx="1" ry="2" transform="rotate(60 15.4 13.2)"/></g>`,
  ข้าวไม่ไวแสง: `
    <path d="M12 21V8c-1.6-2.6-3.4-4-3.4-4" fill="none" stroke="#a58a3e" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M12 12c2-2 4-2.6 6-2.4-1 1.8-3 3-5.4 3" fill="#68a03e"/>
    <g fill="#e0c25a"><ellipse cx="9.6" cy="5.6" rx="1" ry="2" transform="rotate(-30 9.6 5.6)"/><ellipse cx="8.4" cy="8" rx="1" ry="2" transform="rotate(-35 8.4 8)"/><ellipse cx="8" cy="10.6" rx="1" ry="2" transform="rotate(-45 8 10.6)"/><ellipse cx="8.6" cy="13.2" rx="1" ry="2" transform="rotate(-60 8.6 13.2)"/></g>`,
}

export const CATEGORY_ICON_SVG: Record<string, string> = {
  ไม้ผล: `<path d="M12 3c3.2 0 5.4 2.2 5.6 4.8 1.8.6 3 2.2 3 4.1 0 2.4-2 4.3-4.6 4.3H8c-2.6 0-4.6-1.9-4.6-4.3 0-1.9 1.2-3.5 3-4.1C6.6 5.2 8.8 3 12 3z" fill="#4a8a3a"/><rect x="11.2" y="15" width="1.6" height="5.6" rx=".7" fill="#7a5230"/>`,
  พืชไร่: `<g stroke="#6f9b3f" stroke-width="2.4" stroke-linecap="round"><path d="M8 4v16.5M12 3.5v17M16 4v16.5"/></g><g stroke="#4f7328" stroke-width="1"><path d="M6.8 9h2.4M10.8 8.5h2.4M14.8 9.2h2.4M6.8 14h2.4M14.8 14.2h2.4"/></g>`,
  พืชผัก: `<path d="M12 21c-3.4 0-5.4-2.2-5.4-5.2 0-4.4 2.2-9.4 5.4-13.2 3.2 3.8 5.4 8.8 5.4 13.2 0 3-2 5.2-5.4 5.2z" fill="#4a8a35"/><path d="M12 4.6v15.8" fill="none" stroke="#8fce62" stroke-width="1.1" stroke-linecap="round"/>`,
  ข้าว: `<path d="M12 21V8" fill="none" stroke="#a58a3e" stroke-width="1.4" stroke-linecap="round"/><path d="M12 12c-2-2-4-2.6-6-2.4 1 1.8 3 3 5.4 3M12 12c2-2 4-2.6 6-2.4-1 1.8-3 3-5.4 3" fill="#68a03e"/><g fill="#d9b84a"><ellipse cx="12" cy="5.4" rx="1.1" ry="2.2"/><ellipse cx="9.8" cy="7.4" rx="1" ry="2" transform="rotate(-30 9.8 7.4)"/><ellipse cx="14.2" cy="7.4" rx="1" ry="2" transform="rotate(30 14.2 7.4)"/></g>`,
  _: `<path d="M12 21c-3 0-5-2-5-5 0-4 2-8 5-11 3 3 5 7 5 11 0 3-2 5-5 5z" fill="#5a9a3a"/>`,
}

export function cropIconSvg(name: string, type: string): string {
  return CROP_ICON_SVG[name] ?? CATEGORY_ICON_SVG[type] ?? CATEGORY_ICON_SVG._
}

/** ไอคอนพืชสำหรับใช้ใน React — inner SVG เป็น markup คงที่ในโปรเจกต์ (ปลอดภัยกับ dangerouslySetInnerHTML) */
export function CropIcon({
  name,
  type,
  className,
}: {
  name: string
  type: string
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: cropIconSvg(name, type) }}
    />
  )
}
