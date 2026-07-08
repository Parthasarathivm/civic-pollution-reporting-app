import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Exclude server-only packages from client bundle
  serverExternalPackages: ["bcryptjs", "jsonwebtoken", "@anthropic-ai/sdk"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Allow serving uploads
  async headers() {
    return [
      {
        source: "/uploads/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000" },
        ],
      },
    ];
  },
};

export default nextConfig;
