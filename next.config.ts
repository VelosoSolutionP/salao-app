import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.public.blob.vercel-storage.com" },
    ],
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs", "ws"],
};

export default nextConfig;
