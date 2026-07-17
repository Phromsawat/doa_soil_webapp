import { Settings } from "lucide-react"

export default function AdminSettingsPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center space-y-3">
        <Settings className="w-12 h-12 text-gray-300 mx-auto" />
        <h1 className="text-xl font-bold text-gray-800">ตั้งค่าระบบ</h1>
        <p className="text-sm text-gray-500">กำลังพัฒนา</p>
      </div>
    </div>
  )
}
