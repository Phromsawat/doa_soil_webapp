import Home_1 from "./Home_1"
import { getHomeContent } from "@/lib/content/getHomeContent"

// ส่วน "รายละเอียดของโครงการ" + "ติดต่อเรา" แก้ได้จาก /admin/content/home
// หน้านี้เป็น static — แอดมินกดบันทึกแล้ว revalidatePath("/") สร้างหน้าใหม่ทันที
// ตัวเลขด้านล่างเป็นแค่ตาข่ายกันพลาด (รีเฟรชเองทุก 1 ชม.)
export const revalidate = 3600

export default async function Page() {
  const { content } = await getHomeContent()
  return <Home_1 content={content} />
}
