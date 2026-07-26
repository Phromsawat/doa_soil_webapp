-- 022_fix_sugarcane_note_pua.sql
-- แก้อักขระ PUA ตกค้าง U+F712 (จากฟอนต์เก่า ควรเป็น ็ ไม้ไต่คู้ = U+0E47)
-- ในหมายเหตุอ้อยปลูก/อ้อยตอ ที่ 021 แปลงไม่ครบ -> เบราว์เซอร์แสดงเป็นกล่อง □ ("เป□น")

update public.crops
set fertilizer_note = replace(fertilizer_note, U&'\F712', U&'\0E47')
where id in (
  'aef23f9b-5d26-41e0-a56c-a5ded89c4d1a',  -- อ้อยปลูก
  'f1eee6e4-9b7e-4a98-84e5-f92a63748f98'   -- อ้อยตอ
);
