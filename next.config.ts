import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Bump upload limit (3 photos × ~5MB each + form payload)
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
