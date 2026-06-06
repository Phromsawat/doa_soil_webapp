import { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DOA Soil Test Kit - วิเคราะห์สารอาหารดิน",
    short_name: "DOA Soil Kit",
    description: "แอปพลิเคชันวิเคราะห์แร่ธาตุอาหารในดิน (NPK) และคำแนะนำการใส่ปุ๋ยสําหรับเกษตรกรไทย",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#F8FAF9",
    theme_color: "#0D2137",
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  }
}
